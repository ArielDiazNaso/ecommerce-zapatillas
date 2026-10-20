const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/summary
 * Obtiene indicadores clave de rendimiento (KPIs) y reportes basados 100% en datos reales de la base de datos.
 */
router.get('/summary', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    // 1. Indicadores de Ventas (excluyendo cancelados)
    const salesSummary = await query(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_ticket,
        SUM(CASE WHEN channel = 'online' THEN 1 ELSE 0 END) as online_orders,
        COALESCE(SUM(CASE WHEN channel = 'online' THEN total ELSE 0 END), 0) as online_revenue,
        SUM(CASE WHEN channel = 'pos' THEN 1 ELSE 0 END) as pos_orders,
        COALESCE(SUM(CASE WHEN channel = 'pos' THEN total ELSE 0 END), 0) as pos_revenue
      FROM orders
      WHERE status != 'cancelado'
    `);

    // 2. Indicadores de Inventario y Valorización
    const inventorySummary = await query(`
      SELECT
        COUNT(*) as total_products,
        COALESCE(SUM(stock), 0) as total_units,
        COALESCE(SUM(stock * cost), 0) as inventory_cost_value,
        COALESCE(SUM(stock * price), 0) as inventory_retail_value,
        SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END) as low_stock_count
      FROM products
      WHERE active = 1
    `);

    // 3. Productos con alerta de stock bajo
    const lowStockAlerts = await query(`
      SELECT p.id, p.sku, p.name, p.brand, p.stock, p.min_stock, p.price, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `);

    // 4. Productos más vendidos (basado en ítems de órdenes activas)
    const topProducts = await query(`
      SELECT
        oi.product_id,
        oi.product_name,
        p.brand,
        p.sku,
        SUM(oi.quantity) as units_sold,
        SUM(oi.subtotal) as revenue
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status != 'cancelado'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY units_sold DESC, revenue DESC
      LIMIT 5
    `);

    // 5. Ventas por Categoría
    const salesByCategory = await query(`
      SELECT
        c.name as category_name,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        COALESCE(SUM(oi.subtotal), 0) as category_revenue
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelado'
      GROUP BY c.id, c.name
      ORDER BY category_revenue DESC
    `);

    // 6. Usuarios por Rol
    const usersByRole = await query(`
      SELECT
        role,
        COUNT(*) as count
      FROM users
      WHERE active = 1
      GROUP BY role
    `);

    // 7. Estado de Proyectos y Tareas
    const projectStats = await query(`
      SELECT
        COUNT(*) as total_projects,
        COALESCE( ROUND(AVG(progress), 0), 0 ) as avg_progress,
        COALESCE(SUM(budget), 0) as total_budget
      FROM projects
    `);

    const taskStats = await query(`
      SELECT
        status,
        COUNT(*) as count
      FROM project_tasks
      GROUP BY status
    `);

    // 8. Últimas 5 órdenes
    const recentOrders = await query(`
      SELECT id, order_number, customer_name, channel, payment_method, status, total, created_at
      FROM orders
      ORDER BY id DESC
      LIMIT 6
    `);

    const s = salesSummary.rows[0] || {};
    const inv = inventorySummary.rows[0] || {};
    const proj = projectStats.rows[0] || {};

    res.json({
      sales: {
        total_orders: Number(s.total_orders || 0),
        total_revenue: Number(s.total_revenue || 0),
        avg_ticket: Number(s.avg_ticket || 0),
        online_orders: Number(s.online_orders || 0),
        online_revenue: Number(s.online_revenue || 0),
        pos_orders: Number(s.pos_orders || 0),
        pos_revenue: Number(s.pos_revenue || 0)
      },
      inventory: {
        total_products: Number(inv.total_products || 0),
        total_units: Number(inv.total_units || 0),
        inventory_cost_value: Number(inv.inventory_cost_value || 0),
        inventory_retail_value: Number(inv.inventory_retail_value || 0),
        low_stock_count: Number(inv.low_stock_count || 0),
        low_stock_items: lowStockAlerts.rows
      },
      top_products: topProducts.rows.map((r) => ({
        ...r,
        units_sold: Number(r.units_sold),
        revenue: Number(r.revenue)
      })),
      sales_by_category: salesByCategory.rows.map((r) => ({
        ...r,
        units_sold: Number(r.units_sold),
        category_revenue: Number(r.category_revenue)
      })),
      users_by_role: usersByRole.rows,
      projects: {
        total_projects: Number(proj.total_projects || 0),
        avg_progress: Number(proj.avg_progress || 0),
        total_budget: Number(proj.total_budget || 0),
        tasks_by_status: taskStats.rows
      },
      recent_orders: recentOrders.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reportes del panel administrativo: ' + error.message });
  }
});

module.exports = router;
