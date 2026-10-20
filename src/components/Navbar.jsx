import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiFetch, formatCurrency } from '../services/api';

export default function Navbar() {
  const {
    user,
    setUser,
    theme,
    toggleTheme,
    logout,
    cart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    notify
  } = useApp();

  const navigate = useNavigate();
  const [showCart, setShowCart] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [checkoutData, setCheckoutData] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: user?.phone || '',
    customer_dni: user?.dni || '',
    shipping_address: user?.address || '',
    payment_method: 'reserva_sin_cobro',
    notes: ''
  });

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    dni: user?.dni || '',
    address: user?.address || '',
    newPassword: ''
  });

  function openCartModal() {
    setCheckoutData({
      customer_name: user?.name || checkoutData.customer_name || '',
      customer_email: user?.email || checkoutData.customer_email || '',
      customer_phone: user?.phone || checkoutData.customer_phone || '',
      customer_dni: user?.dni || checkoutData.customer_dni || '',
      shipping_address: user?.address || checkoutData.shipping_address || '',
      payment_method: 'reserva_sin_cobro',
      notes: ''
    });
    setShowCart(true);
  }

  function openProfileModal() {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      dni: user.dni || '',
      address: user.address || '',
      newPassword: ''
    });
    setShowProfile(true);
  }

  async function handleCheckoutSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!checkoutData.customer_name.trim() || !checkoutData.customer_email.trim()) {
      notify('Por favor complete su nombre y correo electrónico para registrar el pedido.', 'warning');
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        ...checkoutData,
        channel: 'online',
        items: cart.map((item) => ({
          product_id: item.product_id,
          size: item.size,
          quantity: item.quantity
        }))
      };

      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      clearCart();
      setShowCart(false);
      notify(res.message, 'success');
      if (user) {
        navigate('/mis-pedidos');
      } else {
        window.dispatchEvent(new Event('products-updated'));
      }
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm)
      });
      setUser(res.user);
      localStorage.setItem('stride_user', JSON.stringify(res.user));
      setShowProfile(false);
      notify('Datos personales actualizados correctamente.', 'success');
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  const isStaff = user && ['admin', 'empleado'].includes(user.role);

  return (
    <>
      <nav className="navbar navbar-expand-xl sticky-top navbar-stride py-2">
        <div className="container-fluid px-3 px-lg-4">
          <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold" to="/">
            <span className="brand-badge">STRIDE PRO</span>
            <span className="d-none d-sm-inline small fw-semibold text-secondary">
              Zapatillas & Deportes
            </span>
          </Link>

          <div className="d-flex align-items-center gap-2 order-xl-last">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              <i className={`bi ${theme === 'light' ? 'bi-moon-stars-fill' : 'bi-sun-fill text-warning'}`}></i>
              <span className="d-none d-md-inline">{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
            </button>

            <button
              type="button"
              onClick={openCartModal}
              className="btn btn-sm btn-stride position-relative d-flex align-items-center gap-1 px-3"
            >
              <i className="bi bi-bag-check-fill"></i>
              <span>Carrito</span>
              {cartCount > 0 && (
                <span className="badge rounded-pill bg-dark text-white ms-1">{cartCount}</span>
              )}
            </button>

            {user ? (
              <div className="d-flex align-items-center gap-1">
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                  title="Editar mi perfil"
                >
                  <i className="bi bi-person-badge"></i>
                  <span className="d-none d-md-inline">{user.name.split(' ')[0]}</span>
                  <span className="badge bg-primary text-uppercase" style={{ fontSize: '0.65rem' }}>
                    {user.role}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="btn btn-sm btn-outline-danger"
                  title="Cerrar sesión"
                >
                  <i className="bi bi-box-arrow-right"></i>
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-sm btn-outline-primary fw-semibold">
                <i className="bi bi-person-circle me-1"></i>Ingresar
              </Link>
            )}

            <button
              className="navbar-toggler btn-sm"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#strideNavbar"
              aria-controls="strideNavbar"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>

          <div className="collapse navbar-collapse" id="strideNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-xl-0 gap-1 mt-2 mt-xl-0">
              <li className="nav-item">
                <NavLink className="nav-link px-2 fw-medium" to="/">
                  <i className="bi bi-shop me-1"></i>Tienda Online
                </NavLink>
              </li>

              {user && (
                <li className="nav-item">
                  <NavLink className="nav-link px-2 fw-medium" to="/mis-pedidos">
                    <i className="bi bi-receipt me-1"></i>Mis Pedidos
                  </NavLink>
                </li>
              )}

              {isStaff && (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link px-2 fw-medium" to="/pos">
                      <i className="bi bi-cash-register me-1 text-success"></i>Terminal POS
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link px-2 fw-medium" to="/inventario">
                      <i className="bi bi-boxes me-1 text-warning"></i>Inventario & Alertas
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link px-2 fw-medium" to="/proyectos">
                      <i className="bi bi-kanban me-1 text-info"></i>Proyectos
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link px-2 fw-medium" to="/usuarios">
                      <i className="bi bi-people me-1"></i>Clientes & Personal
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link px-2 fw-medium" to="/admin">
                      <i className="bi bi-speedometer2 me-1 text-danger"></i>Panel Admin
                    </NavLink>
                  </li>
                </>
              )}

              <li className="nav-item">
                <NavLink className="nav-link px-2 fw-medium" to="/feedback">
                  <i className="bi bi-chat-heart me-1"></i>Retroalimentación
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Modal de Carrito y Checkout Online */}
      {showCart && (
        <div className="modal-backdrop-custom" onClick={() => setShowCart(false)}>
          <div className="modal-panel-custom p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-bag-check-fill text-danger me-2"></i>
                Tu Carrito de Compras ({cartCount} {cartCount === 1 ? 'unidad' : 'unidades'})
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCart(false)}
              ></button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-cart-x display-4 text-secondary"></i>
                <p className="mt-3 text-secondary mb-3">
                  Aún no agregaste zapatillas ni artículos deportivos a tu carrito.
                </p>
                <button
                  type="button"
                  className="btn btn-stride"
                  onClick={() => setShowCart(false)}
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              <div className="row g-4">
                <div className="col-12">
                  <div className="list-group mb-3">
                    {cart.map((item) => (
                      <div
                        key={item.key}
                        className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2"
                      >
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                          />
                          <div>
                            <div className="fw-bold">{item.name}</div>
                            <div className="small text-secondary">
                              Marca: {item.brand} | Talle: <span className="badge bg-secondary">{item.size}</span> |{' '}
                              {formatCurrency(item.price)} c/u
                            </div>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => updateCartQty(item.key, item.quantity - 1)}
                            >
                              -
                            </button>
                            <span className="btn btn-outline-secondary disabled fw-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => updateCartQty(item.key, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <span className="fw-bold ms-2" style={{ minWidth: 95, textAlign: 'right' }}>
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-1"
                            onClick={() => removeFromCart(item.key)}
                            title="Quitar producto"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between align-items-center p-3 rounded bg-body-tertiary mb-3">
                    <span className="fw-semibold">Total del Pedido Online:</span>
                    <span className="fs-4 fw-bold text-success">{formatCurrency(cartTotal)}</span>
                  </div>

                  <form onSubmit={handleCheckoutSubmit}>
                    <h6 className="fw-bold mb-2">Datos para Registro del Pedido y Reserva de Stock</h6>
                    <div className="alert alert-info py-2 small mb-3">
                      <i className="bi bi-info-circle-fill me-1"></i>
                      <strong>Modalidad transparente sin pasarela de pago simulada:</strong> el pedido se registra en firme descontando el stock en tiempo real y se abona al retirar en sucursal o contra entrega.
                    </div>

                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold mb-1">Nombre y Apellido *</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={checkoutData.customer_name}
                          onChange={(e) =>
                            setCheckoutData({ ...checkoutData, customer_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold mb-1">Email *</label>
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          required
                          value={checkoutData.customer_email}
                          onChange={(e) =>
                            setCheckoutData({ ...checkoutData, customer_email: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold mb-1">Teléfono / WhatsApp</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={checkoutData.customer_phone}
                          onChange={(e) =>
                            setCheckoutData({ ...checkoutData, customer_phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold mb-1">DNI</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={checkoutData.customer_dni}
                          onChange={(e) =>
                            setCheckoutData({ ...checkoutData, customer_dni: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label small fw-semibold mb-1">
                          Dirección de Entrega o Sucursal de Retiro
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Ej: Av. Santa Fe 3200 o Retiro en Local Central"
                          value={checkoutData.shipping_address}
                          onChange={(e) =>
                            setCheckoutData({ ...checkoutData, shipping_address: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold mb-1">Modalidad de Pago</label>
                        <select
                          className="form-select form-select-sm"
                          value={checkoutData.payment_method}
                          onChange={(e) =>
                            setCheckoutData({ ...checkoutData, payment_method: e.target.value })
                          }
                        >
                          <option value="reserva_sin_cobro">Reserva Online (Pago en sucursal)</option>
                          <option value="contra_entrega">Pago Contra Entrega</option>
                          <option value="transferencia_acordar">Transferencia a coordinar</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold mb-1">Notas adicionales</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Horario de preferencia o indicaciones"
                          value={checkoutData.notes}
                          onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-4 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={clearCart}
                      >
                        Vaciar Carrito
                      </button>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setShowCart(false)}
                        >
                          Seguir comprando
                        </button>
                        <button
                          type="submit"
                          className="btn btn-stride px-4"
                          disabled={submittingOrder}
                        >
                          {submittingOrder ? 'Registrando pedido...' : 'Confirmar Pedido Online'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edición de Perfil Personal */}
      {showProfile && user && (
        <div className="modal-backdrop-custom" onClick={() => setShowProfile(false)}>
          <div
            className="modal-panel-custom p-4"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="mb-0 fw-bold">Mi Perfil ({user.role.toUpperCase()})</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowProfile(false)}
              ></button>
            </div>
            <form onSubmit={handleProfileUpdate}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Nombre completo</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Email (no editable)</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  disabled
                  value={user.email}
                />
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Teléfono</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">DNI</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={profileForm.dni}
                    onChange={(e) => setProfileForm({ ...profileForm, dni: e.target.value })}
                  />
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Dirección</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Nueva Contraseña (dejar en blanco para mantener actual)
                </label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  placeholder="Mínimo 6 caracteres"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowProfile(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
