import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatCurrency } from '../services/api';
import { useApp } from '../context/AppContext';

export default function PosPage() {
  const { user, notify } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});

  const [ticketItems, setTicketItems] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customerName, setCustomerName] = useState('Cliente Mostrador');
  const [customerDni, setCustomerDni] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const [lastReceipt, setLastReceipt] = useState(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    dni: '',
    address: ''
  });

  const loadPosData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, userRes] = await Promise.all([
        apiFetch('/api/inventory/products'),
        apiFetch('/api/inventory/categories'),
        apiFetch('/api/users?role=cliente')
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      setClients(userRes.users || []);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadPosData();
  }, [loadPosData]);

  function handleSelectClient(clientId) {
    setSelectedClientId(clientId);
    if (!clientId) {
      setCustomerName('Cliente Mostrador');
      setCustomerDni('');
      setCustomerPhone('');
      return;
    }
    const found = clients.find((c) => Number(c.id) === Number(clientId));
    if (found) {
      setCustomerName(found.name);
      setCustomerDni(found.dni || '');
      setCustomerPhone(found.phone || '');
    }
  }

  function addItemToTicket(product) {
    if (product.stock <= 0) {
      notify(`"${product.name}" no tiene stock disponible.`, 'danger');
      return;
    }
    const sizes = (product.sizes || '41').split(',').map((s) => s.trim());
    const size = selectedSizes[product.id] || sizes[0] || '41';
    const key = `${product.id}-${size}`;

    // Verificar cuántas unidades de este producto ya hay en el ticket (en cualquier talle)
    const totalProductInTicket = ticketItems
      .filter((i) => i.product_id === product.id)
      .reduce((acc, i) => acc + i.quantity, 0);

    if (totalProductInTicket + 1 > product.stock) {
      notify(
        `No se puede superar el stock físico de "${product.name}" (${product.stock} u. disponibles).`,
        'warning'
      );
      return;
    }

    setTicketItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          stock: Number(product.stock),
          size,
          quantity: 1
        }
      ];
    });
  }

  function changeTicketQty(key, delta) {
    setTicketItems((prev) => {
      const target = prev.find((i) => i.key === key);
      if (!target) return prev;
      const nextQty = target.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter((i) => i.key !== key);
      }
      const totalOtherSizes = prev
        .filter((i) => i.product_id === target.product_id && i.key !== key)
        .reduce((acc, i) => acc + i.quantity, 0);

      if (totalOtherSizes + nextQty > target.stock) {
        notify(`Stock máximo disponible: ${target.stock} unidades.`, 'warning');
        return prev;
      }
      return prev.map((i) => (i.key === key ? { ...i, quantity: nextQty } : i));
    });
  }

  const subtotal = ticketItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const validDiscount = Math.max(0, Math.min(Number(discount) || 0, subtotal));
  const total = Math.max(0, subtotal - validDiscount);

  async function handleConfirmPosSale(e) {
    e.preventDefault();
    if (ticketItems.length === 0) {
      notify('Agregue al menos un producto al ticket POS.', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          channel: 'pos',
          client_user_id: selectedClientId || null,
          customer_name: customerName,
          customer_dni: customerDni,
          customer_phone: customerPhone,
          payment_method: paymentMethod,
          discount: validDiscount,
          notes,
          items: ticketItems.map((i) => ({
            product_id: i.product_id,
            size: i.size,
            quantity: i.quantity
          }))
        })
      });

      setLastReceipt(res.order);
      setTicketItems([]);
      setDiscount(0);
      setNotes('');
      notify(res.message, 'success');
      await loadPosData();
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCreateQuickClient(e) {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          ...newClientForm,
          role: 'cliente'
        })
      });
      setClients((prev) => [res.user, ...prev]);
      setSelectedClientId(res.user.id);
      setCustomerName(res.user.name);
      setCustomerDni(res.user.dni || '');
      setCustomerPhone(res.user.phone || '');
      setShowNewClientModal(false);
      setNewClientForm({ name: '', email: '', phone: '', dni: '', address: '' });
      notify('Cliente registrado y seleccionado en la terminal POS.', 'success');
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  const filteredProducts = products.filter((p) => {
    if (selectedCat && Number(p.category_id) !== Number(selectedCat)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="container-fluid px-3 px-lg-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h3 className="fw-bold mb-0">
            <i className="bi bi-cash-register text-success me-2"></i>
            Terminal POS • Punto de Venta Presencial
          </h3>
          <p className="text-secondary small mb-0">
            Operador en caja: <strong>{user?.name}</strong> ({user?.role.toUpperCase()}) • Descuento atómico de inventario en tiempo real
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => setShowNewClientModal(true)}
        >
          <i className="bi bi-person-plus-fill me-1"></i>Alta Rápida de Cliente
        </button>
      </div>

      <div className="row g-4">
        {/* Columna Izquierda: Selector Rápido de Productos */}
        <div className="col-lg-7">
          <div className="card card-stride p-3 mb-3">
            <div className="row g-2">
              <div className="col-md-7">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    <i className="bi bi-upc-scan"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escanear código SKU o buscar zapatilla / marca..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-5">
                <select
                  className="form-select form-select-sm"
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                >
                  <option value="">Todas las Categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success"></div>
            </div>
          ) : (
            <div className="row g-2">
              {filteredProducts.map((p) => {
                const sizes = (p.sizes || '41').split(',').map((s) => s.trim());
                const curSize = selectedSizes[p.id] || sizes[0] || '41';
                return (
                  <div className="col-md-6" key={p.id}>
                    <div className="card pos-product-card p-2 h-100">
                      <div className="d-flex gap-2 align-items-center">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                        />
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="badge bg-secondary" style={{ fontSize: '0.68rem' }}>
                              {p.sku}
                            </span>
                            <span
                              className={`badge ${
                                p.stock <= 0
                                  ? 'bg-danger'
                                  : p.stock <= p.min_stock
                                  ? 'bg-warning text-dark'
                                  : 'bg-success'
                              }`}
                            >
                              Stock: {p.stock}
                            </span>
                          </div>
                          <div className="fw-bold small mt-1">{p.name}</div>
                          <div className="text-danger fw-bold">{formatCurrency(p.price)}</div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top gap-2">
                        <div className="d-flex align-items-center gap-1">
                          <span className="small text-secondary">Talle:</span>
                          <select
                            className="form-select form-select-sm py-0 px-2"
                            style={{ width: 72 }}
                            value={curSize}
                            onChange={(e) =>
                              setSelectedSizes({ ...selectedSizes, [p.id]: e.target.value })
                            }
                          >
                            {sizes.map((sz) => (
                              <option key={sz} value={sz}>
                                {sz}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-success px-3"
                          disabled={p.stock <= 0}
                          onClick={() => addItemToTicket(p)}
                        >
                          <i className="bi bi-plus-lg me-1"></i>Sumar al Ticket
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Ticket de Caja Actual */}
        <div className="col-lg-5">
          <div className="card card-stride p-3 sticky-top" style={{ top: '76px' }}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-receipt me-2 text-success"></i>Ticket de Venta POS
              </h5>
              {ticketItems.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setTicketItems([])}
                >
                  Limpiar Caja
                </button>
              )}
            </div>

            <form onSubmit={handleConfirmPosSale}>
              <div className="mb-2">
                <label className="form-label small fw-semibold mb-1">
                  Seleccionar Cliente Registrado (opcional)
                </label>
                <select
                  className="form-select form-select-sm"
                  value={selectedClientId}
                  onChange={(e) => handleSelectClient(e.target.value)}
                >
                  <option value="">-- Cliente de Mostrador / Consumidor Final --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.dni || c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label small fw-semibold mb-1">Nombre en Factura/Ticket</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="col-5">
                  <label className="form-label small fw-semibold mb-1">DNI / CUIT</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={customerDni}
                    onChange={(e) => setCustomerDni(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista de ítems en el ticket */}
              <div
                className="border rounded p-2 mb-3 bg-body-tertiary"
                style={{ maxHeight: 260, overflowY: 'auto' }}
              >
                {ticketItems.length === 0 ? (
                  <div className="text-center py-4 text-secondary small">
                    Seleccione productos de la izquierda para armar la venta presencial.
                  </div>
                ) : (
                  ticketItems.map((item) => (
                    <div
                      key={item.key}
                      className="d-flex justify-content-between align-items-center py-2 border-bottom last-border-0"
                    >
                      <div>
                        <div className="fw-semibold small">{item.name}</div>
                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                          Talle: <strong>{item.size}</strong> | {formatCurrency(item.price)} c/u
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary py-0 px-2"
                            onClick={() => changeTicketQty(item.key, -1)}
                          >
                            -
                          </button>
                          <span className="btn btn-outline-secondary disabled py-0 px-2 fw-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="btn btn-outline-secondary py-0 px-2"
                            onClick={() => changeTicketQty(item.key, 1)}
                          >
                            +
                          </button>
                        </div>
                        <span className="fw-bold small" style={{ minWidth: 80, textAlign: 'right' }}>
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold mb-1">Medio de Cobro en Caja</label>
                  <select
                    className="form-select form-select-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="efectivo">Efectivo en Caja</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="posnet_local">Tarjeta en Posnet Físico</option>
                    <option value="reserva_sin_cobro">Reserva en Mostrador (Sin cobro)</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold mb-1">Descuento ($ ARS)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Observaciones de caja (opcional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-success bg-opacity-10 border border-success border-opacity-25 mb-3">
                <div className="d-flex justify-content-between small mb-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {validDiscount > 0 && (
                  <div className="d-flex justify-content-between small text-success mb-1">
                    <span>Descuento aplicado:</span>
                    <span>-{formatCurrency(validDiscount)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center fw-bold fs-5 pt-1 border-top">
                  <span>TOTAL A COBRAR:</span>
                  <span className="text-success">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-success w-100 py-2 fw-bold"
                disabled={processing || ticketItems.length === 0}
              >
                <i className="bi bi-check2-circle me-2"></i>
                {processing ? 'Procesando Transacción POS...' : 'Registrar Venta Presencial'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Comprobante de Venta POS */}
      {lastReceipt && (
        <div className="modal-backdrop-custom" onClick={() => setLastReceipt(null)}>
          <div
            className="modal-panel-custom p-4"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center border-bottom pb-3 mb-3">
              <span className="brand-badge">STRIDE PRO</span>
              <h5 className="fw-bold mt-2 mb-0">Comprobante de Venta POS</h5>
              <div className="small text-secondary">Operación #{lastReceipt.order_number}</div>
            </div>
            <div className="small mb-3">
              <div>
                <strong>Cliente:</strong> {lastReceipt.customer_name}
              </div>
              <div>
                <strong>Medio de Pago:</strong> {lastReceipt.payment_method}
              </div>
              <div>
                <strong>Vendedor:</strong> {user?.name}
              </div>
              <div>
                <strong>Fecha:</strong> {new Date().toLocaleString('es-AR')}
              </div>
            </div>
            <table className="table table-sm small">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(lastReceipt.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      {it.product_name} (Talle {it.size})
                    </td>
                    <td>{it.quantity}</td>
                    <td className="text-end">{formatCurrency(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-2 mb-3">
              <span>TOTAL:</span>
              <span className="text-success">{formatCurrency(lastReceipt.total)}</span>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => window.print()}
              >
                <i className="bi bi-printer me-1"></i>Imprimir Ticket
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => setLastReceipt(null)}
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alta Rápida de Cliente */}
      {showNewClientModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowNewClientModal(false)}>
          <div
            className="modal-panel-custom p-4"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">Alta Rápida de Cliente en POS</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowNewClientModal(false)}
              ></button>
            </div>
            <form onSubmit={handleCreateQuickClient}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Nombre y Apellido *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Email *</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  required
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                />
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">DNI</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={newClientForm.dni}
                    onChange={(e) => setNewClientForm({ ...newClientForm, dni: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Teléfono</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Dirección</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={newClientForm.address}
                  onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowNewClientModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride">
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
