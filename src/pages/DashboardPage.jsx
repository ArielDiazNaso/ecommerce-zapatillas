import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatCurrency } from '../services/api';
import { useApp } from '../context/AppContext';

export default function DashboardPage() {
  const { notify } = useApp();
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, ordRes] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/orders')
      ]);
      setSummary(sumRes);
      setOrders(ordRes.orders || []);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleOrderStatusChange(orderId, newStatus) {
    try {
      const res = await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      notify(res.message, 'success');
      await loadDashboard();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  if (loading || !summary) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger"></div>
        <p className="mt-2 text-secondary">Calculando indicadores y reportes en tiempo real...</p>
      </div>
    );
  }

  const { sales, inventory, top_products, sales_by_category, projects } = summary;
  const onlineShare =
    sales.total_revenue > 0
      ? Math.round((sales.online_revenue / sales.total_revenue) * 100)
      : 50;
  const posShare = 100 - onlineShare;

  const filteredOrders = orders.filter((o) => {
    if (channelFilter && o.channel !== channelFilter) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="container-fluid px-3 px-lg-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h3 className="fw-bold mb-0">
            <i className="bi bi-speedometer2 text-danger me-2"></i>
            Panel Administrativo • Indicadores y Reportes en Vivo
          </h3>
          <p className="text-secondary small mb-0">
            Métricas consolidadas en tiempo real directamente desde la base de datos Turso (libSQL)
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadDashboard}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>Actualizar Datos
          </button>
          <Link to="/pos" className="btn btn-sm btn-success">
            <i className="bi bi-cash-register me-1"></i>Ir a Terminal POS
          </Link>
        </div>
      </div>

      {/* Tarjetas de Indicadores Clave (KPIs) */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-secondary fw-semibold">Facturación Total Activa</div>
                <div className="fs-4 fw-bold text-success mt-1">
                  {formatCurrency(sales.total_revenue)}
                </div>
                <div className="small text-secondary mt-1">
                  {sales.total_orders} operaciones &bull; Ticket prom: {formatCurrency(sales.avg_ticket)}
                </div>
              </div>
              <div className="kpi-icon bg-success bg-opacity-10 text-success">
                <i className="bi bi-currency-dollar"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-secondary fw-semibold">Valorización de Inventario</div>
                <div className="fs-4 fw-bold text-primary mt-1">
                  {formatCurrency(inventory.inventory_retail_value)}
                </div>
                <div className="small text-secondary mt-1">
                  {inventory.total_units} pares/unidades ({inventory.total_products} SKU activos)
                </div>
              </div>
              <div className="kpi-icon bg-primary bg-opacity-10 text-primary">
                <i className="bi bi-box-seam"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-secondary fw-semibold">Alertas de Stock Bajo</div>
                <div className="fs-4 fw-bold text-danger mt-1">
                  {inventory.low_stock_count} productos
                </div>
                <div className="small text-secondary mt-1">
                  <Link to="/inventario" className="text-decoration-none">
                    Gestionar reposición &rarr;
                  </Link>
                </div>
              </div>
              <div className="kpi-icon bg-danger bg-opacity-10 text-danger">
                <i className="bi bi-exclamation-triangle"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-secondary fw-semibold">Avance de Proyectos</div>
                <div className="fs-4 fw-bold text-info mt-1">{projects.avg_progress}%</div>
                <div className="small text-secondary mt-1">
                  {projects.total_projects} proyectos &bull; Presup: {formatCurrency(projects.total_budget)}
                </div>
              </div>
              <div className="kpi-icon bg-info bg-opacity-10 text-info">
                <i className="bi bi-kanban"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda Fila: Comparativa de Canales + Top Productos + Ventas por Categoría */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="card card-stride p-3 h-100">
            <h6 className="fw-bold mb-3">
              <i className="bi bi-pie-chart-fill text-danger me-2"></i>
              Distribución por Canal (Online vs POS)
            </h6>

            <div className="mb-3">
              <div className="d-flex justify-content-between small mb-1">
                <span>
                  <strong>Tienda E-Commerce Online</strong> ({sales.online_orders} pedidos)
                </span>
                <span className="fw-bold text-primary">
                  {formatCurrency(sales.online_revenue)} ({onlineShare}%)
                </span>
              </div>
              <div className="progress" style={{ height: 10 }}>
                <div
                  className="progress-bar bg-primary"
                  style={{ width: `${onlineShare}%` }}
                ></div>
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between small mb-1">
                <span>
                  <strong>Terminal POS Presencial</strong> ({sales.pos_orders} ventas)
                </span>
                <span className="fw-bold text-success">
                  {formatCurrency(sales.pos_revenue)} ({posShare}%)
                </span>
              </div>
              <div className="progress" style={{ height: 10 }}>
                <div className="progress-bar bg-success" style={{ width: `${posShare}%` }}></div>
              </div>
            </div>

            <hr />
            <h6 className="fw-bold small text-secondary mb-2">Rentabilidad Proyectada de Stock</h6>
            <div className="p-2 rounded bg-body-tertiary small">
              <div className="d-flex justify-content-between mb-1">
                <span>Costo Total de Mercadería:</span>
                <strong>{formatCurrency(inventory.inventory_cost_value)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>Valor Venta de Lista:</span>
                <strong>{formatCurrency(inventory.inventory_retail_value)}</strong>
              </div>
              <div className="d-flex justify-content-between text-success border-top pt-1">
                <span>Margen Bruto Potencial:</span>
                <strong>
                  {formatCurrency(
                    inventory.inventory_retail_value - inventory.inventory_cost_value
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card card-stride p-3 h-100">
            <h6 className="fw-bold mb-3">
              <i className="bi bi-trophy-fill text-warning me-2"></i>
              Ranking de Productos Más Vendidos
            </h6>
            {top_products.length === 0 ? (
              <p className="text-secondary small">Aún no se registran ventas activas.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 small">
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th className="text-center">Unid.</th>
                      <th className="text-end">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top_products.map((tp, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="fw-semibold">{tp.product_name}</div>
                          <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                            {tp.brand} &bull; {tp.sku}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary">{tp.units_sold}</span>
                        </td>
                        <td className="text-end fw-bold">{formatCurrency(tp.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card card-stride p-3 h-100">
            <h6 className="fw-bold mb-3">
              <i className="bi bi-bar-chart-line-fill text-info me-2"></i>
              Desempeño por Categoría Deportiva
            </h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 small">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th className="text-center">Vendidos</th>
                    <th className="text-end">Facturación</th>
                  </tr>
                </thead>
                <tbody>
                  {sales_by_category.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold">{cat.category_name}</td>
                      <td className="text-center">{cat.units_sold} u.</td>
                      <td className="text-end fw-bold">{formatCurrency(cat.category_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Gestión Integral de Pedidos Online y Ventas POS */}
      <div className="card card-stride p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <h5 className="fw-bold mb-0">
            <i className="bi bi-clipboard-check me-2 text-danger"></i>
            Control de Ventas y Pedidos (E-Commerce & POS)
          </h5>
          <div className="d-flex flex-wrap gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: 160 }}
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="">Todos los Canales</option>
              <option value="online">Tienda Online</option>
              <option value="pos">Terminal POS</option>
            </select>
            <select
              className="form-select form-select-sm"
              style={{ width: 170 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_preparacion">En Preparación</option>
              <option value="enviado">Enviado</option>
              <option value="entregado">Entregado</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th>N° Operación</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Ítems</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Estado (Actualización y Reintegro Stock)</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td className="fw-bold">#{o.order_number}</td>
                  <td>{new Date(o.created_at).toLocaleString('es-AR')}</td>
                  <td>
                    <div className="fw-semibold">{o.customer_name}</div>
                    <div className="text-secondary">{o.customer_email || o.customer_dni}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        o.channel === 'pos' ? 'bg-success' : 'bg-primary'
                      }`}
                    >
                      {o.channel === 'pos' ? 'POS Local' : 'Online'}
                    </span>
                  </td>
                  <td>
                    {(o.items || []).map((it, i) => (
                      <div key={i}>
                        {it.quantity}x {it.product_name} (T.{it.size})
                      </div>
                    ))}
                  </td>
                  <td>{o.payment_method}</td>
                  <td className="fw-bold text-success">{formatCurrency(o.total)}</td>
                  <td style={{ width: 190 }}>
                    <select
                      className="form-select form-select-sm py-0 fw-semibold"
                      value={o.status}
                      disabled={o.status === 'cancelado'}
                      onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="en_preparacion">En Preparación</option>
                      <option value="enviado">Enviado</option>
                      <option value="entregado">Entregado</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado (Reintegra Stock)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
