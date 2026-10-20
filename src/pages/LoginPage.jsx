import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { login, register, notify } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dni: '',
    address: ''
  });

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedUser = await login(loginForm.email, loginForm.password);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else if (loggedUser.role === 'empleado') {
        navigate('/pos');
      } else {
        navigate('/');
      }
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(regForm);
      navigate('/');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-5">
          <div className="card card-stride p-4 shadow-sm">
            <div className="text-center mb-3">
              <span className="brand-badge d-inline-block mb-2">STRIDE PRO</span>
              <h4 className="fw-bold mb-1">Acceso al Sistema</h4>
              <p className="small text-secondary mb-0">
                Gestión de Tienda de Deportes y E-Commerce de Zapatillas
              </p>
            </div>

            <ul className="nav nav-pills nav-fill mb-4 bg-body-tertiary p-1 rounded-3">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${tab === 'login' ? 'active bg-danger' : ''}`}
                  onClick={() => setTab('login')}
                >
                  Iniciar Sesión
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${tab === 'register' ? 'active bg-danger' : ''}`}
                  onClick={() => setTab('register')}
                >
                  Registro de Cliente
                </button>
              </li>
            </ul>

            {tab === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="usuario@zapatillas.com"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-stride w-100 py-2"
                  disabled={loading}
                >
                  {loading ? 'Verificando credenciales...' : 'Ingresar a mi Cuenta'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Nombre y Apellido *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Correo Electrónico *</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">
                    Contraseña * (mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-sm"
                    required
                    minLength={6}
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Teléfono</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">DNI</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={regForm.dni}
                      onChange={(e) => setRegForm({ ...regForm, dni: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Dirección de Envío</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={regForm.address}
                    onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-stride w-100 py-2" disabled={loading}>
                  {loading ? 'Registrando cuenta...' : 'Crear Cuenta de Cliente'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
