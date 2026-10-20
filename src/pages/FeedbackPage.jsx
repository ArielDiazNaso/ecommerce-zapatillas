import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useApp } from '../context/AppContext';

export default function FeedbackPage() {
  const { user, notify } = useApp();
  const [data, setData] = useState({ stats: null, feedback: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    user_name: user?.name || '',
    role: user?.role || 'cliente',
    module_evaluated: 'Tienda Online y Carrito',
    rating: 5,
    usability_score: 5,
    speed_score: 5,
    design_score: 5,
    comments: '',
    suggestions: ''
  });

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/feedback');
      setData(res);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          user_name: form.user_name || user?.name || ''
        })
      });
      notify(res.message, 'success');
      setForm({
        ...form,
        comments: '',
        suggestions: ''
      });
      await loadFeedback();
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  const stats = data.stats || {};

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">
          <i className="bi bi-chat-heart-fill text-danger me-2"></i>
          Módulo de Retroalimentación y Evaluación de Usuarios
        </h3>
        <p className="text-secondary small mb-0">
          Etapa de Monitoreo y Control: instrumento preparado para recoger opiniones reales de clientes, empleados y evaluadores sin inventar resultados previos.
        </p>
      </div>

      <div className="row g-4">
        {/* Columna Izquierda: Formulario de Encuesta */}
        <div className="col-lg-5">
          <div className="card card-stride p-4">
            <h5 className="fw-bold mb-3">Registrar Evaluación de Uso</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Tu Nombre *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  placeholder="Nombre y Apellido"
                  value={form.user_name}
                  onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                />
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Perfil de Usuario</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="empleado">Empleado</option>
                    <option value="admin">Administrador / Docente</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Módulo Evaluado</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.module_evaluated}
                    onChange={(e) => setForm({ ...form, module_evaluated: e.target.value })}
                  >
                    <option value="Tienda Online y Carrito">Tienda Online y Carrito</option>
                    <option value="Terminal POS Presencial">Terminal POS Presencial</option>
                    <option value="Gestión de Inventario y Alertas">Inventario y Alertas</option>
                    <option value="Gestión de Proyectos">Gestión de Proyectos</option>
                    <option value="Panel Administrativo">Panel Administrativo</option>
                    <option value="Sistema Completo">Sistema Completo</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Calificación General (1-5)</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                  >
                    <option value={5}>5 - Excelente</option>
                    <option value={4}>4 - Muy Bueno</option>
                    <option value={3}>3 - Aceptable</option>
                    <option value={2}>2 - Regular</option>
                    <option value={1}>1 - Insuficiente</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Facilidad de Uso (1-5)</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.usability_score}
                    onChange={(e) => setForm({ ...form, usability_score: Number(e.target.value) })}
                  >
                    <option value={5}>5 - Muy intuitivo</option>
                    <option value={4}>4 - Fácil</option>
                    <option value={3}>3 - Normal</option>
                    <option value={2}>2 - Complejo</option>
                    <option value={1}>1 - Confuso</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Velocidad de Respuesta (1-5)</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.speed_score}
                    onChange={(e) => setForm({ ...form, speed_score: Number(e.target.value) })}
                  >
                    <option value={5}>5 - Instantáneo</option>
                    <option value={4}>4 - Rápido</option>
                    <option value={3}>3 - Normal</option>
                    <option value={2}>2 - Lento</option>
                    <option value={1}>1 - Muy lento</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Diseño Claro/Oscuro (1-5)</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.design_score}
                    onChange={(e) => setForm({ ...form, design_score: Number(e.target.value) })}
                  >
                    <option value={5}>5 - Muy atractivo</option>
                    <option value={4}>4 - Agradable</option>
                    <option value={3}>3 - Correcto</option>
                    <option value={2}>2 - Mejorable</option>
                    <option value={1}>1 - Deficiente</option>
                  </select>
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold">Comentarios de la Experiencia</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="¿Qué aspectos funcionaron mejor durante la prueba?"
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                ></textarea>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Sugerencias de Mejora</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="¿Qué funcionalidad agregarías en próximas iteraciones?"
                  value={form.suggestions}
                  onChange={(e) => setForm({ ...form, suggestions: e.target.value })}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-stride w-100" disabled={submitting}>
                {submitting ? 'Guardando respuesta...' : 'Enviar Retroalimentación Real'}
              </button>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Resultados Recolectados */}
        <div className="col-lg-7">
          <div className="card card-stride p-4 h-100">
            <h5 className="fw-bold mb-3">Resumen de Respuestas Recolectadas</h5>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-danger"></div>
              </div>
            ) : stats.total_responses === 0 ? (
              <div className="alert alert-secondary mb-0">
                <h6 className="fw-bold mb-1">
                  <i className="bi bi-clipboard-data me-2"></i>
                  Instrumento listo para recolección de datos (0 respuestas registradas)
                </h6>
                <p className="small mb-0">
                  Siguiendo los criterios de integridad académica, no se han precargado encuestas ficticias. Todas las opiniones que se envíen desde el formulario izquierdo se almacenarán en vivo en Turso y calcularán automáticamente los promedios aquí.
                </p>
              </div>
            ) : (
              <>
                <div className="row g-2 mb-4 text-center">
                  <div className="col-6 col-sm-3">
                    <div className="p-2 border rounded bg-body-tertiary">
                      <div className="fs-4 fw-bold text-danger">{stats.total_responses}</div>
                      <div className="small text-secondary">Encuestas</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2 border rounded bg-body-tertiary">
                      <div className="fs-4 fw-bold text-warning">{stats.avg_rating} / 5</div>
                      <div className="small text-secondary">Promedio Gral.</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2 border rounded bg-body-tertiary">
                      <div className="fs-4 fw-bold text-success">{stats.avg_usability} / 5</div>
                      <div className="small text-secondary">Usabilidad</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2 border rounded bg-body-tertiary">
                      <div className="fs-4 fw-bold text-info">{stats.avg_design} / 5</div>
                      <div className="small text-secondary">Diseño UI/UX</div>
                    </div>
                  </div>
                </div>

                <div className="list-group">
                  {data.feedback.map((item) => (
                    <div className="list-group-item" key={item.id}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div>
                          <strong>{item.user_name}</strong>{' '}
                          <span className="badge bg-secondary text-uppercase ms-1">
                            {item.role}
                          </span>
                          <span className="badge bg-info text-dark ms-1">
                            {item.module_evaluated}
                          </span>
                        </div>
                        <span className="badge bg-warning text-dark">
                          ★ {item.rating}/5
                        </span>
                      </div>
                      {item.comments && <p className="small mb-1">{item.comments}</p>}
                      {item.suggestions && (
                        <div className="small text-secondary">
                          <strong>Sugerencia:</strong> {item.suggestions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
