import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useApp } from '../context/AppContext';

const EMPTY_USER_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'cliente',
  phone: '',
  dni: '',
  address: '',
  department: '',
  hire_date: '',
  active: 1
};

export default function UsersPage() {
  const { user: currentUser, notify } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/users');
      setUsers(res.users || []);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function openNewUserModal(defaultRole = 'cliente') {
    setEditingUser(null);
    setUserForm({
      ...EMPTY_USER_FORM,
      role: isAdmin ? defaultRole : 'cliente'
    });
    setShowModal(true);
  }

  function openEditUserModal(u) {
    if (!isAdmin && u.role !== 'cliente') {
      notify('Como empleado, solo tenés permiso para editar datos de clientes.', 'warning');
      return;
    }
    setEditingUser(u);
    setUserForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'cliente',
      phone: u.phone || '',
      dni: u.dni || '',
      address: u.address || '',
      department: u.department || '',
      hire_date: u.hire_date || '',
      active: u.active
    });
    setShowModal(true);
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiFetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(userForm)
        });
        notify('Datos de usuario actualizados correctamente.', 'success');
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            ...userForm,
            password: userForm.password || 'Cliente123!'
          })
        });
        notify('Usuario registrado exitosamente.', 'success');
      }
      setShowModal(false);
      await loadUsers();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  async function handleToggleActive(u) {
    if (!isAdmin) return;
    try {
      const res = await apiFetch(`/api/users/${u.id}/toggle-active`, {
        method: 'PATCH'
      });
      notify(res.message, 'info');
      await loadUsers();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.dni || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="container-fluid px-3 px-lg-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h3 className="fw-bold mb-0">
            <i className="bi bi-people-fill text-primary me-2"></i>
            Administración de Clientes y Empleados
          </h3>
          <p className="text-secondary small mb-0">
            Tu rol actual: <strong className="text-uppercase">{currentUser?.role}</strong> &bull;{' '}
            {isAdmin
              ? 'Acceso total para gestionar Clientes, Empleados y Administradores'
              : 'Permiso habilitado para alta y edición de Clientes'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-stride"
            onClick={() => openNewUserModal('cliente')}
          >
            <i className="bi bi-person-plus-fill me-1"></i>Nuevo Cliente
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => openNewUserModal('empleado')}
            >
              <i className="bi bi-briefcase-fill me-1"></i>Nuevo Empleado
            </button>
          )}
        </div>
      </div>

      <div className="card card-stride p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-6">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Buscar por nombre, correo, DNI o sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-6 d-flex flex-wrap gap-1 justify-content-md-end">
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === '' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setRoleFilter('')}
            >
              Todos ({users.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                roleFilter === 'cliente' ? 'btn-success' : 'btn-outline-secondary'
              }`}
              onClick={() => setRoleFilter('cliente')}
            >
              Clientes ({users.filter((u) => u.role === 'cliente').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                roleFilter === 'empleado' ? 'btn-primary' : 'btn-outline-secondary'
              }`}
              onClick={() => setRoleFilter('empleado')}
            >
              Empleados ({users.filter((u) => u.role === 'empleado').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                roleFilter === 'admin' ? 'btn-danger' : 'btn-outline-secondary'
              }`}
              onClick={() => setRoleFilter('admin')}
            >
              Administradores ({users.filter((u) => u.role === 'admin').length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="card card-stride p-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nombre y Apellido</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>DNI / Teléfono</th>
                  <th>Dirección / Sector</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const canEdit = isAdmin || u.role === 'cliente';
                  return (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td className="fw-bold">{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === 'admin'
                              ? 'bg-danger'
                              : u.role === 'empleado'
                              ? 'bg-primary'
                              : 'bg-success'
                          } text-uppercase`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <div>DNI: {u.dni || '-'}</div>
                        <div className="text-secondary">{u.phone || '-'}</div>
                      </td>
                      <td>
                        <div>{u.address || '-'}</div>
                        {u.department && (
                          <div className="text-primary fw-semibold">
                            Sector: {u.department} {u.hire_date ? `(Ingreso: ${u.hire_date})` : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {Number(u.active) === 1 ? (
                          <span className="badge bg-success-subtle text-success">Activo</span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger">Inactivo</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {canEdit ? (
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => openEditUserModal(u)}
                              title="Editar datos"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          ) : (
                            <span className="badge bg-body-secondary text-secondary">
                              Solo lectura
                            </span>
                          )}
                          {isAdmin && u.id !== currentUser?.id && (
                            <button
                              type="button"
                              className={`btn ${
                                Number(u.active) === 1
                                  ? 'btn-outline-danger'
                                  : 'btn-outline-success'
                              }`}
                              onClick={() => handleToggleActive(u)}
                              title={
                                Number(u.active) === 1 ? 'Desactivar cuenta' : 'Activar cuenta'
                              }
                            >
                              <i
                                className={`bi ${
                                  Number(u.active) === 1 ? 'bi-person-slash' : 'bi-person-check'
                                }`}
                              ></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Alta/Edición de Usuario */}
      {showModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowModal(false)}>
          <div className="modal-panel-custom p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">
                {editingUser ? `Editar Usuario: ${editingUser.name}` : 'Registrar Nuevo Usuario'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowModal(false)}
              ></button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Nombre y Apellido *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Correo Electrónico *</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Rol en el Sistema *</label>
                  <select
                    className="form-select form-select-sm"
                    disabled={!isAdmin}
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="empleado">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña Inicial *'}
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-sm"
                    placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mín. 6 caracteres'}
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">DNI</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={userForm.dni}
                    onChange={(e) => setUserForm({ ...userForm, dni: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Teléfono</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Dirección</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={userForm.address}
                    onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                  />
                </div>
                {userForm.role !== 'cliente' && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Departamento / Sector (Personal)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ej: Ventas y Salón POS / Logística"
                        value={userForm.department}
                        onChange={(e) =>
                          setUserForm({ ...userForm, department: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Fecha de Ingreso</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={userForm.hire_date}
                        onChange={(e) =>
                          setUserForm({ ...userForm, hire_date: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride px-4">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
