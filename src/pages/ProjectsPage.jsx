import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatCurrency } from '../services/api';
import { useApp } from '../context/AppContext';

export default function ProjectsPage() {
  const { user, notify } = useApp();
  const [projects, setProjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    category: 'Operaciones & Logística',
    manager_id: '',
    priority: 'alta',
    start_date: '2026-10-20',
    end_date: '2026-12-15',
    budget: 500000,
    create_default_phases: true
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalProject, setTaskModalProject] = useState(null);
  const [taskForm, setTaskForm] = useState({
    phase_id: '',
    title: '',
    description: '',
    assigned_to: '',
    priority: 'media',
    due_date: '2026-11-15',
    status: 'pendiente'
  });

  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [phaseProjectId, setPhaseProjectId] = useState(null);
  const [phaseForm, setPhaseForm] = useState({
    name: '',
    description: '',
    order_index: 6
  });

  const loadProjectsData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, usersRes] = await Promise.all([
        apiFetch('/api/projects'),
        apiFetch('/api/users')
      ]);
      setProjects(projRes.projects || []);
      const staffMembers = (usersRes.users || []).filter((u) =>
        ['admin', 'empleado'].includes(u.role)
      );
      setStaff(staffMembers);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadProjectsData();
  }, [loadProjectsData]);

  async function handleCreateProject(e) {
    e.preventDefault();
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectForm)
      });
      notify('Proyecto interno creado con sus 5 fases del ciclo de vida.', 'success');
      setShowProjectModal(false);
      await loadProjectsData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  function openNewTaskModal(project, defaultPhaseId = '') {
    setTaskModalProject(project);
    setTaskForm({
      phase_id: defaultPhaseId || project.phases?.[0]?.id || '',
      title: '',
      description: '',
      assigned_to: staff[0]?.id || user?.id || '',
      priority: 'media',
      due_date: '2026-11-10',
      status: 'pendiente'
    });
    setShowTaskModal(true);
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!taskModalProject) return;
    try {
      const res = await apiFetch(`/api/projects/${taskModalProject.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskForm)
      });
      notify(`Tarea agregada. Progreso del proyecto: ${res.progress}%`, 'success');
      setShowTaskModal(false);
      await loadProjectsData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  async function handleTaskStatusChange(task, newStatus) {
    try {
      const res = await apiFetch(`/api/projects/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...task, status: newStatus })
      });
      notify(`Estado de tarea actualizado. Progreso recalculado: ${res.progress}%`, 'success');
      await loadProjectsData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await apiFetch(`/api/projects/tasks/${taskId}`, { method: 'DELETE' });
      notify('Tarea eliminada y progreso recalculado.', 'info');
      await loadProjectsData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  async function handlePhaseStatusChange(phaseId, newStatus) {
    try {
      await apiFetch(`/api/projects/phases/${phaseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      notify('Estado de fase actualizado.', 'success');
      await loadProjectsData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  async function handleCreatePhase(e) {
    e.preventDefault();
    if (!phaseProjectId) return;
    try {
      await apiFetch(`/api/projects/${phaseProjectId}/phases`, {
        method: 'POST',
        body: JSON.stringify(phaseForm)
      });
      notify('Nueva fase añadida al proyecto.', 'success');
      setShowPhaseModal(false);
      await loadProjectsData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  async function handleDeleteProject(projectId) {
    try {
      await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      notify('Proyecto eliminado.', 'info');
      await loadProjectsData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  return (
    <div className="container-fluid px-3 px-lg-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h3 className="fw-bold mb-0">
            <i className="bi bi-kanban text-info me-2"></i>
            Gestión del Ciclo de Vida de Proyectos Internos
          </h3>
          <p className="text-secondary small mb-0">
            Etapas: Inicio &bull; Planificación &bull; Ejecución &bull; Monitoreo y Control &bull; Cierre | Asignación de responsables y cálculo automático de progreso
          </p>
        </div>
        <button
          type="button"
          className="btn btn-stride"
          onClick={() => {
            setProjectForm({
              ...projectForm,
              manager_id: staff[0]?.id || user?.id || ''
            });
            setShowProjectModal(true);
          }}
        >
          <i className="bi bi-plus-circle me-1"></i>Nuevo Proyecto Interno
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info"></div>
        </div>
      ) : (
        <div className="row g-4">
          {projects.map((proj) => (
            <div className="col-12" key={proj.id}>
              <div className="card card-stride p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 border-bottom pb-3 mb-3">
                  <div>
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                      <span className="badge bg-info text-dark">{proj.category}</span>
                      <span
                        className={`badge ${
                          proj.priority === 'alta'
                            ? 'bg-danger'
                            : proj.priority === 'media'
                            ? 'bg-warning text-dark'
                            : 'bg-secondary'
                        }`}
                      >
                        Prioridad {proj.priority.toUpperCase()}
                      </span>
                      <span className="badge bg-body-secondary text-body-secondary">
                        Responsable General: {proj.manager_name || 'Dirección'}
                      </span>
                    </div>
                    <h4 className="fw-bold mb-1">{proj.name}</h4>
                    <p className="text-secondary small mb-0">{proj.description}</p>
                  </div>

                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <div className="text-end me-2">
                      <div className="small text-secondary">
                        Plazo: {proj.start_date} al {proj.end_date}
                      </div>
                      <div className="small fw-semibold">
                        Presupuesto: {formatCurrency(proj.budget)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info"
                      onClick={() => {
                        setPhaseProjectId(proj.id);
                        setPhaseForm({
                          name: '',
                          description: '',
                          order_index: (proj.phases?.length || 0) + 1
                        });
                        setShowPhaseModal(true);
                      }}
                    >
                      <i className="bi bi-diagram-3 me-1"></i>+ Fase
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-stride"
                      onClick={() => openNewTaskModal(proj)}
                    >
                      <i className="bi bi-plus-lg me-1"></i>+ Tarea
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Eliminar Proyecto"
                        onClick={() => handleDeleteProject(proj.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de Progreso Real */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-bold">
                      Progreso General del Proyecto (calculado por tareas completadas):
                    </span>
                    <span className="badge bg-success fs-6">{proj.progress}% Completado</span>
                  </div>
                  <div className="progress" style={{ height: 12, borderRadius: 8 }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                      role="progressbar"
                      style={{ width: `${proj.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Fases del Ciclo de Vida y sus Tareas */}
                <div className="row g-3">
                  {(proj.phases || []).map((phase) => (
                    <div className="col-12" key={phase.id}>
                      <div className="p-3 rounded-3 border bg-body-tertiary">
                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
                          <div>
                            <h6 className="fw-bold mb-0 d-inline me-2">{phase.name}</h6>
                            <span className="small text-secondary">{phase.description}</span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <select
                              className="form-select form-select-sm py-0"
                              style={{ width: 150 }}
                              value={phase.status}
                              onChange={(e) =>
                                handlePhaseStatusChange(phase.id, e.target.value)
                              }
                            >
                              <option value="pendiente">Fase: Pendiente</option>
                              <option value="en_progreso">Fase: En Progreso</option>
                              <option value="completada">Fase: Completada</option>
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0"
                              onClick={() => openNewTaskModal(proj, phase.id)}
                            >
                              + Tarea en Fase
                            </button>
                          </div>
                        </div>

                        {(phase.tasks || []).length === 0 ? (
                          <div className="small text-secondary fst-italic">
                            Sin tareas registradas en esta fase.
                          </div>
                        ) : (
                          <div className="table-responsive mt-2">
                            <table className="table table-sm align-middle mb-0 small">
                              <thead>
                                <tr>
                                  <th>Tarea</th>
                                  <th>Responsable Asignado</th>
                                  <th>Prioridad</th>
                                  <th>Vencimiento</th>
                                  <th>Estado de Avance</th>
                                  <th className="text-end">Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {phase.tasks.map((task) => (
                                  <tr key={task.id}>
                                    <td>
                                      <div
                                        className={`fw-semibold ${
                                          task.status === 'completada'
                                            ? 'text-decoration-line-through text-secondary'
                                            : ''
                                        }`}
                                      >
                                        {task.title}
                                      </div>
                                      {task.description && (
                                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                          {task.description}
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <i className="bi bi-person-check me-1 text-primary"></i>
                                      {task.assigned_name || 'Sin asignar'}
                                    </td>
                                    <td>
                                      <span
                                        className={`badge ${
                                          task.priority === 'alta'
                                            ? 'bg-danger'
                                            : task.priority === 'media'
                                            ? 'bg-warning text-dark'
                                            : 'bg-secondary'
                                        }`}
                                      >
                                        {task.priority}
                                      </span>
                                    </td>
                                    <td>{task.due_date || '-'}</td>
                                    <td style={{ width: 170 }}>
                                      <select
                                        className={`form-select form-select-sm py-0 fw-semibold ${
                                          task.status === 'completada'
                                            ? 'border-success text-success'
                                            : task.status === 'en_progreso'
                                            ? 'border-primary text-primary'
                                            : ''
                                        }`}
                                        value={task.status}
                                        onChange={(e) =>
                                          handleTaskStatusChange(task, e.target.value)
                                        }
                                      >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_progreso">En Progreso</option>
                                        <option value="en_revision">En Revisión</option>
                                        <option value="completada">Completada ✓</option>
                                      </select>
                                    </td>
                                    <td className="text-end">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger py-0 px-2"
                                        title="Eliminar tarea"
                                        onClick={() => handleDeleteTask(task.id)}
                                      >
                                        <i className="bi bi-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Proyecto */}
      {showProjectModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowProjectModal(false)}>
          <div className="modal-panel-custom p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">Crear Nuevo Proyecto de la Tienda</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowProjectModal(false)}
              ></button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="row g-2">
                <div className="col-md-8">
                  <label className="form-label small fw-semibold">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    placeholder="Ej: Apertura Corner Running Sucursal Norte"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Área / Categoría</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Líder Responsable</label>
                  <select
                    className="form-select form-select-sm"
                    value={projectForm.manager_id}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, manager_id: e.target.value })
                    }
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Prioridad</label>
                  <select
                    className="form-select form-select-sm"
                    value={projectForm.priority}
                    onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Presupuesto ($ ARS)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Fecha de Inicio *</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    required
                    value={projectForm.start_date}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Fecha Fin Estimada *</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    required
                    value={projectForm.end_date}
                    onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Descripción y Objetivos</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, description: e.target.value })
                    }
                  ></textarea>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowProjectModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride px-4">
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {showTaskModal && taskModalProject && (
        <div className="modal-backdrop-custom" onClick={() => setShowTaskModal(false)}>
          <div
            className="modal-panel-custom p-4"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">Asignar Nueva Tarea</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowTaskModal(false)}
              ></button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Fase del Ciclo de Vida *</label>
                <select
                  className="form-select form-select-sm"
                  required
                  value={taskForm.phase_id}
                  onChange={(e) => setTaskForm({ ...taskForm, phase_id: e.target.value })}
                >
                  {(taskModalProject.phases || []).map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Título de la Tarea *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                />
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Responsable *</label>
                  <select
                    className="form-select form-select-sm"
                    value={taskForm.assigned_to}
                    onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Fecha Límite</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Prioridad</label>
                  <select
                    className="form-select form-select-sm"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Estado Inicial</label>
                  <select
                    className="form-select form-select-sm"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Detalle Técnico</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                ></textarea>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride">
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Fase */}
      {showPhaseModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowPhaseModal(false)}>
          <div
            className="modal-panel-custom p-4"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">Añadir Fase al Proyecto</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowPhaseModal(false)}
              ></button>
            </div>
            <form onSubmit={handleCreatePhase}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Nombre de la Fase *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  value={phaseForm.name}
                  onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Descripción</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={phaseForm.description}
                  onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
                />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowPhaseModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride">
                  Crear Fase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
