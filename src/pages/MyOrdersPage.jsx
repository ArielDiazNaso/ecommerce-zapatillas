import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatCurrency } from '../services/api';

const STATUS_BADGE = {
  pendiente: 'bg-warning text-dark',
  confirmado: 'bg-info text-dark',
  en_preparacion: 'bg-primary',
  enviado: 'bg-primary',
  entregado: 'bg-success',
  completado: 'bg-success',
  cancelado: 'bg-danger'
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/orders')
      .then((res) => setOrders(res.orders || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-receipt-cutoff text-danger me-2"></i>
            Mis Pedidos y Compras
          </h3>
          <p className="text-secondary small mb-0">
            Seguimiento en tiempo real del estado de tus pedidos online y compras en sucursal.
          </p>
        </div>
        <Link to="/" className="btn btn-sm btn-stride">
          <i className="bi bi-plus-circle me-1"></i>Nuevo Pedido
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card card-stride p-5 text-center">
          <i className="bi bi-bag-x display-4 text-secondary"></i>
          <h5 className="mt-3">Aún no registraste pedidos</h5>
          <p className="text-secondary">
            Explorá nuestro catálogo de zapatillas y registrá tu primer pedido online.
          </p>
          <div>
            <Link to="/" className="btn btn-stride">
              Ir a la Tienda
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {orders.map((order) => (
            <div className="col-12" key={order.id}>
              <div className="card card-stride p-3">
                <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-2 mb-3 gap-2">
                  <div>
                    <span className="fw-bold fs-5 me-2">#{order.order_number}</span>
                    <span className={`badge ${STATUS_BADGE[order.status] || 'bg-secondary'} me-2 text-uppercase`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <span className="badge bg-body-secondary text-body-secondary">
                      Canal: {order.channel === 'pos' ? 'POS Sucursal' : 'Tienda Online'}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="small text-secondary me-3">
                      Fecha: {new Date(order.created_at).toLocaleString('es-AR')}
                    </span>
                    <span className="fs-5 fw-bold text-success">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-7">
                    <h6 className="small fw-bold text-secondary mb-2">Detalle de Productos</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Talle</th>
                            <th>Cant.</th>
                            <th>Unitario</th>
                            <th className="text-end">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(order.items || []).map((item, idx) => (
                            <tr key={idx}>
                              <td className="fw-semibold">{item.product_name}</td>
                              <td>
                                <span className="badge bg-secondary">{item.size}</span>
                              </td>
                              <td>{item.quantity}</td>
                              <td>{formatCurrency(item.unit_price)}</td>
                              <td className="text-end fw-bold">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <div className="p-3 rounded bg-body-tertiary small h-100">
                      <div>
                        <strong>Cliente:</strong> {order.customer_name}
                      </div>
                      <div>
                        <strong>Entrega / Sucursal:</strong> {order.shipping_address}
                      </div>
                      <div>
                        <strong>Modalidad de Pago:</strong> {order.payment_method}
                      </div>
                      {order.discount > 0 && (
                        <div className="text-success">
                          <strong>Descuento aplicado:</strong> -{formatCurrency(order.discount)}
                        </div>
                      )}
                      {order.notes && (
                        <div className="mt-1 text-secondary">
                          <strong>Notas:</strong> {order.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
