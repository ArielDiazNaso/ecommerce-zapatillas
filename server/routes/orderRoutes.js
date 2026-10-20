const express = require('express');
const { db, query } = require('../config/database');
const { authenticateToken, optionalAuth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/orders
 * - Admin y Empleado: ven todas las ventas (online y POS), filtrables por canal y estado.
 * - Cliente: ve exclusivamente su historial de pedidos.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { channel, status } = req.query;
    let sql = `
      SELECT o.*, u.name as seller_name
      FROM orders o
      LEFT JOIN users u ON o.seller_id = u.id
      WHERE 1=1
    `;
    const args = [];

    if (req.user.role === 'cliente') {
      sql += ` AND (o.user_id = ? OR LOWER(o.customer_email) = LOWER(?))`;
      args.push(req.user.id, req.user.email);
    } else {
      if (channel) {
        sql += ` AND o.channel = ?`;
        args.push(channel);
      }
      if (status) {
        sql += ` AND o.status = ?`;
        args.push(status);
      }
    }

    sql += ` ORDER BY o.id DESC`;
    const ordersRes = await query(sql, args);

    // Adjuntar ítems de cada orden
    const itemsRes = await query(`SELECT * FROM order_items ORDER BY id ASC`);
    const itemsByOrder = {};
    for (const item of itemsRes.rows) {
      const oid = Number(item.order_id);
      if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
      itemsByOrder[oid].push(item);
    }

    const orders = ordersRes.rows.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      items: itemsByOrder[Number(order.id)] || []
    }));

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar pedidos: ' + error.message });
  }
});

/**
 * POST /api/orders
 * Registra una venta POS presencial o un pedido E-Commerce Online.
 * Utiliza una transacción atómica para verificar stock, descontar inventario y auditar movimientos.
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      customer_name,
      customer_email = '',
      customer_phone = '',
      customer_dni = '',
      shipping_address = '',
      channel = 'online',
      payment_method = 'reserva_sin_cobro',
      discount = 0,
      notes = '',
      items = [],
      client_user_id = null
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe incluir al menos un producto.' });
    }

    if (channel === 'pos') {
      if (!req.user || !['admin', 'empleado'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Solo administradores y empleados pueden registrar ventas en la terminal POS.'
        });
      }
    }

    const finalCustomerName =
      (customer_name && customer_name.trim()) ||
      (req.user ? req.user.name : 'Cliente Mostrador');

    // Validar stock actual de cada producto antes de ejecutar la transacción
    const productIds = items.map((i) => Number(i.product_id));
    const placeholders = productIds.map(() => '?').join(',');
    const prodRes = await query(
      `SELECT id, name, sku, price, stock, active FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    const productMap = {};
    for (const p of prodRes.rows) {
      productMap[Number(p.id)] = p;
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const pid = Number(item.product_id);
      const qty = Number(item.quantity);
      const prod = productMap[pid];

      if (!prod || Number(prod.active) === 0) {
        return res.status(404).json({ error: `Producto ID ${pid} no encontrado o inactivo.` });
      }
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Cantidad inválida para "${prod.name}".` });
      }
      if (Number(prod.stock) < qty) {
        return res.status(400).json({
          error: `Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}, solicitado: ${qty}.`
        });
      }

      const unitPrice = Number(prod.price);
      const itemSubtotal = unitPrice * qty;
      subtotal += itemSubtotal;

      validatedItems.push({
        product_id: pid,
        product_name: prod.name,
        size: item.size || '41',
        quantity: qty,
        unit_price: unitPrice,
        subtotal: itemSubtotal,
        previous_stock: Number(prod.stock),
        new_stock: Number(prod.stock) - qty
      });
    }

    const numericDiscount = Math.max(0, Math.min(Number(discount) || 0, subtotal));
    const total = Math.max(0, subtotal - numericDiscount);

    const prefix = channel === 'pos' ? 'POS' : 'ORD';
    const orderNumber = `${prefix}-${Date.now().toString().slice(-6)}`;
    const initialStatus = channel === 'pos' ? 'completado' : 'pendiente';
    const userId =
      channel === 'pos'
        ? client_user_id
          ? Number(client_user_id)
          : null
        : req.user
        ? req.user.id
        : null;
    const sellerId = channel === 'pos' && req.user ? req.user.id : null;

    // Ejecutar inserción de orden y luego lote transaccional de ítems + actualización de stock
    const orderInsert = await query(
      `INSERT INTO orders (order_number, user_id, seller_id, customer_name, customer_email, customer_phone, customer_dni, shipping_address, channel, payment_method, status, subtotal, discount, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        userId,
        sellerId,
        finalCustomerName,
        customer_email.trim(),
        customer_phone.trim(),
        customer_dni.trim(),
        shipping_address.trim() || (channel === 'pos' ? 'Venta presencial en sucursal' : 'Retiro en tienda'),
        channel,
        payment_method,
        initialStatus,
        subtotal,
        numericDiscount,
        total,
        notes.trim() || (channel === 'online' ? 'Pedido online registrado sin cobro electrónico.' : 'Venta POS presencial.')
      ]
    );

    const orderId = orderInsert.lastInsertRowid;
    const batchStatements = [];

    for (const vItem of validatedItems) {
      batchStatements.push({
        sql: `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, subtotal)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          orderId,
          vItem.product_id,
          vItem.product_name,
          vItem.size,
          vItem.quantity,
          vItem.unit_price,
          vItem.subtotal
        ]
      });

      batchStatements.push({
        sql: `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
        args: [vItem.quantity, vItem.product_id, vItem.quantity]
      });

      batchStatements.push({
        sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          vItem.product_id,
          req.user ? req.user.id : null,
          channel === 'pos' ? 'venta_pos' : 'venta_online',
          vItem.quantity,
          vItem.previous_stock,
          vItem.new_stock,
          `${channel === 'pos' ? 'Venta POS' : 'Pedido Online'} #${orderNumber} (Talle ${vItem.size})`
        ]
      });
    }

    await db.batch(batchStatements, 'write');

    const createdOrder = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json({
      message:
        channel === 'pos'
          ? `Venta presencial #${orderNumber} registrada exitosamente.`
          : `Pedido #${orderNumber} registrado exitosamente (sin cobro electrónico).`,
      order: {
        ...createdOrder.rows[0],
        items: validatedItems
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la operación: ' + error.message });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Actualiza el estado de un pedido. Si pasa a 'cancelado', revierte el stock en una transacción.
 */
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    const validStatuses = [
      'pendiente',
      'confirmado',
      'en_preparacion',
      'enviado',
      'entregado',
      'completado',
      'cancelado'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de pedido inválido.' });
    }

    const orderRes = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    const currentOrder = orderRes.rows[0];
    if (currentOrder.status === 'cancelado' && status !== 'cancelado') {
      return res.status(400).json({ error: 'Un pedido cancelado con stock revertido no puede reactivarse.' });
    }

    const statements = [
      {
        sql: 'UPDATE orders SET status = ? WHERE id = ?',
        args: [status, orderId]
      }
    ];

    // Si se cancela por primera vez, devolver stock al inventario
    if (status === 'cancelado' && currentOrder.status !== 'cancelado') {
      const itemsRes = await query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of itemsRes.rows) {
        const prodRes = await query('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        if (prodRes.rows.length > 0) {
          const prevStock = Number(prodRes.rows[0].stock);
          const newStock = prevStock + Number(item.quantity);
          statements.push({
            sql: 'UPDATE products SET stock = ? WHERE id = ?',
            args: [newStock, item.product_id]
          });
          statements.push({
            sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
                  VALUES (?, ?, 'entrada', ?, ?, ?, ?)`,
            args: [
              item.product_id,
              req.user.id,
              Number(item.quantity),
              prevStock,
              newStock,
              `Reintegro por cancelación de pedido #${currentOrder.order_number}`
            ]
          });
        }
      }
    }

    await db.batch(statements, 'write');

    res.json({
      message: `Estado del pedido #${currentOrder.order_number} actualizado a "${status}".`,
      status
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado del pedido: ' + error.message });
  }
});

module.exports = router;
