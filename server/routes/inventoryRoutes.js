const express = require('express');
const { db, query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/inventory/categories
 * Obtiene todas las categorías con la cantidad de productos asociados.
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.active = 1
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    res.json({ categories: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías: ' + error.message });
  }
});

/**
 * POST /api/inventory/categories
 * Crea una nueva categoría de productos.
 */
router.post('/categories', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const result = await query(
      'INSERT INTO categories (name, description, slug) VALUES (?, ?, ?)',
      [name.trim(), description.trim(), slug + '-' + Date.now().toString().slice(-3)]
    );

    const created = await query('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({
      message: 'Categoría creada exitosamente',
      category: created.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear categoría: ' + error.message });
  }
});

/**
 * PUT /api/inventory/categories/:id
 * Actualiza una categoría existente.
 */
router.put('/categories/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const catId = Number(req.params.id);
    const { name, description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
    }

    await query('UPDATE categories SET name = ?, description = ? WHERE id = ?', [
      name.trim(),
      description.trim(),
      catId
    ]);
    const updated = await query('SELECT * FROM categories WHERE id = ?', [catId]);
    res.json({ message: 'Categoría actualizada', category: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar categoría: ' + error.message });
  }
});

/**
 * GET /api/inventory/products
 * Obtiene el catálogo de productos con filtros opcionales (categoría, búsqueda, bajo stock, destacados).
 */
router.get('/products', async (req, res) => {
  try {
    const { category_id, search, low_stock, featured, include_inactive } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const args = [];

    if (include_inactive !== 'true') {
      sql += ` AND p.active = 1`;
    }

    if (category_id) {
      sql += ` AND p.category_id = ?`;
      args.push(Number(category_id));
    }

    if (featured === 'true') {
      sql += ` AND p.featured = 1`;
    }

    if (low_stock === 'true') {
      sql += ` AND p.stock <= p.min_stock`;
    }

    if (search && search.trim() !== '') {
      sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.description) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      args.push(term, term, term, term);
    }

    sql += ` ORDER BY p.featured DESC, p.id ASC`;
    const result = await query(sql, args);

    const products = result.rows.map((p) => ({
      ...p,
      price: Number(p.price),
      cost: Number(p.cost),
      stock: Number(p.stock),
      min_stock: Number(p.min_stock),
      is_low_stock: Number(p.stock) <= Number(p.min_stock)
    }));

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos: ' + error.message });
  }
});

/**
 * GET /api/inventory/products/:id
 * Obtiene detalle de un producto por ID.
 */
router.get('/products/:id', async (req, res) => {
  try {
    const prodId = Number(req.params.id);
    const result = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [prodId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json({ product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener producto: ' + error.message });
  }
});

/**
 * POST /api/inventory/products
 * Crea un producto y registra su movimiento inicial de inventario en una transacción.
 */
router.post('/products', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const {
      sku,
      name,
      brand,
      category_id,
      description = '',
      price,
      cost = 0,
      stock = 0,
      min_stock = 5,
      sizes = '38,39,40,41,42,43,44',
      color = 'Negro/Blanco',
      image_url = '',
      featured = 0
    } = req.body;

    if (!sku || !name || !brand || !category_id || price === undefined) {
      return res.status(400).json({
        error: 'SKU, nombre, marca, categoría y precio son obligatorios.'
      });
    }

    const numericStock = Number(stock);
    const numericPrice = Number(price);
    if (numericStock < 0 || numericPrice < 0) {
      return res.status(400).json({ error: 'El stock y el precio no pueden ser negativos.' });
    }

    const existingSku = await query('SELECT id FROM products WHERE UPPER(sku) = UPPER(?)', [sku.trim()]);
    if (existingSku.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un producto con el código SKU ingresado.' });
    }

    const defaultImg =
      image_url && image_url.trim() !== ''
        ? image_url.trim()
        : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80';

    const insertProd = await query(
      `INSERT INTO products (sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        sku.trim().toUpperCase(),
        name.trim(),
        brand.trim(),
        Number(category_id),
        description.trim(),
        numericPrice,
        Number(cost),
        numericStock,
        Number(min_stock),
        sizes.trim(),
        color.trim(),
        defaultImg,
        featured ? 1 : 0
      ]
    );

    const productId = insertProd.lastInsertRowid;

    if (numericStock > 0) {
      await query(
        `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
         VALUES (?, ?, 'entrada', ?, 0, ?, 'Alta inicial de producto en inventario')`,
        [productId, req.user.id, numericStock, numericStock]
      );
    }

    const created = await query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [productId]
    );

    res.status(201).json({
      message: 'Producto registrado exitosamente',
      product: created.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto: ' + error.message });
  }
});

/**
 * PUT /api/inventory/products/:id
 * Actualiza datos generales de un producto. Si cambia el stock directamente, registra movimiento de ajuste.
 */
router.put('/products/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const prodId = Number(req.params.id);
    const existingRes = await query('SELECT * FROM products WHERE id = ?', [prodId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    const current = existingRes.rows[0];

    const {
      sku = current.sku,
      name = current.name,
      brand = current.brand,
      category_id = current.category_id,
      description = current.description,
      price = current.price,
      cost = current.cost,
      stock = current.stock,
      min_stock = current.min_stock,
      sizes = current.sizes,
      color = current.color,
      image_url = current.image_url,
      featured = current.featured,
      active = current.active
    } = req.body;

    const newStock = Number(stock);
    if (newStock < 0 || Number(price) < 0) {
      return res.status(400).json({ error: 'El stock y el precio no pueden ser negativos.' });
    }

    const statements = [
      {
        sql: `UPDATE products
              SET sku = ?, name = ?, brand = ?, category_id = ?, description = ?, price = ?, cost = ?, stock = ?, min_stock = ?, sizes = ?, color = ?, image_url = ?, featured = ?, active = ?
              WHERE id = ?`,
        args: [
          sku.trim().toUpperCase(),
          name.trim(),
          brand.trim(),
          Number(category_id),
          description,
          Number(price),
          Number(cost),
          newStock,
          Number(min_stock),
          sizes,
          color,
          image_url,
          featured ? 1 : 0,
          active ? 1 : 0,
          prodId
        ]
      }
    ];

    const prevStock = Number(current.stock);
    if (newStock !== prevStock) {
      const diff = Math.abs(newStock - prevStock);
      statements.push({
        sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
              VALUES (?, ?, 'ajuste', ?, ?, ?, 'Ajuste directo desde edición de producto')`,
        args: [prodId, req.user.id, diff, prevStock, newStock]
      });
    }

    await db.batch(statements, 'write');

    const updated = await query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [prodId]
    );

    res.json({
      message: 'Producto actualizado exitosamente',
      product: updated.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto: ' + error.message });
  }
});

/**
 * POST /api/inventory/movements
 * Registra un movimiento de inventario ('entrada', 'salida', 'ajuste') con validación transaccional.
 */
router.post('/movements', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { product_id, type, quantity, reason } = req.body;
    const qty = Number(quantity);

    if (!product_id || !type || !reason || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        error: 'Producto, tipo de movimiento, cantidad positiva y motivo son obligatorios.'
      });
    }

    const prodRes = await query('SELECT id, name, stock FROM products WHERE id = ?', [Number(product_id)]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const product = prodRes.rows[0];
    const previousStock = Number(product.stock);
    let newStock = previousStock;

    if (type === 'entrada') {
      newStock = previousStock + qty;
    } else if (type === 'salida') {
      if (previousStock < qty) {
        return res.status(400).json({
          error: `Stock insuficiente para realizar la salida. Stock actual de "${product.name}": ${previousStock} unidades.`
        });
      }
      newStock = previousStock - qty;
    } else if (type === 'ajuste') {
      newStock = qty; // En ajuste directo se establece el conteo físico auditado
    } else {
      return res.status(400).json({ error: 'Tipo de movimiento inválido.' });
    }

    if (newStock < 0) {
      return res.status(400).json({ error: 'La operación provocaría stock negativo, lo cual no está permitido.' });
    }

    await db.batch(
      [
        {
          sql: 'UPDATE products SET stock = ? WHERE id = ?',
          args: [newStock, Number(product_id)]
        },
        {
          sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [Number(product_id), req.user.id, type, qty, previousStock, newStock, reason.trim()]
        }
      ],
      'write'
    );

    res.status(201).json({
      message: 'Movimiento de inventario registrado y stock actualizado',
      previous_stock: previousStock,
      new_stock: newStock
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento: ' + error.message });
  }
});

/**
 * GET /api/inventory/movements
 * Obtiene el historial completo de movimientos de inventario (Kardex).
 */
router.get('/movements', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const result = await query(`
      SELECT m.*, p.name as product_name, p.sku as product_sku, u.name as user_name
      FROM inventory_movements m
      LEFT JOIN products p ON m.product_id = p.id
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.id DESC
      LIMIT 100
    `);
    res.json({ movements: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener movimientos: ' + error.message });
  }
});

/**
 * GET /api/inventory/alerts
 * Devuelve todos los productos activos cuyo stock actual es menor o igual al stock mínimo.
 */
router.get('/alerts', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `);
    res.json({
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener alertas de stock bajo: ' + error.message });
  }
});

module.exports = router;
