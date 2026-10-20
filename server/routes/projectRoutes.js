const express = require('express');
const { db, query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * Recalcula automáticamente el porcentaje de progreso del proyecto según sus tareas completadas.
 */
async function recalculateProjectProgress(projectId) {
  const tasksRes = await query('SELECT status FROM project_tasks WHERE project_id = ?', [projectId]);
  if (tasksRes.rows.length === 0) {
    return 0;
  }
  const completed = tasksRes.rows.filter((t) => t.status === 'completada').length;
  const progress = Math.round((completed / tasksRes.rows.length) * 100);
  const status = progress === 100 ? 'completado' : progress > 0 ? 'en_progreso' : 'planificacion';

  await query('UPDATE projects SET progress = ?, status = ? WHERE id = ?', [progress, status, projectId]);
  return progress;
}

/**
 * GET /api/projects
 * Obtiene todos los proyectos con sus fases, tareas y nombres de responsables.
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const projectsRes = await query(`
      SELECT p.*, u.name as manager_name
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      ORDER BY p.id DESC
    `);

    const phasesRes = await query(`
      SELECT * FROM project_phases ORDER BY order_index ASC, id ASC
    `);

    const tasksRes = await query(`
      SELECT t.*, u.name as assigned_name, ph.name as phase_name
      FROM project_tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN project_phases ph ON t.phase_id = ph.id
      ORDER BY t.id ASC
    `);

    const phasesByProject = {};
    for (const ph of phasesRes.rows) {
      const pid = Number(ph.project_id);
      if (!phasesByProject[pid]) phasesByProject[pid] = [];
      phasesByProject[pid].push({ ...ph, tasks: [] });
    }

    const tasksByProject = {};
    for (const task of tasksRes.rows) {
      const pid = Number(task.project_id);
      if (!tasksByProject[pid]) tasksByProject[pid] = [];
      tasksByProject[pid].push(task);
    }

    const projects = projectsRes.rows.map((proj) => {
      const pid = Number(proj.id);
      const projPhases = phasesByProject[pid] || [];
      const projTasks = tasksByProject[pid] || [];

      for (const ph of projPhases) {
        ph.tasks = projTasks.filter((t) => Number(t.phase_id) === Number(ph.id));
      }

      return {
        ...proj,
        budget: Number(proj.budget),
        progress: Number(proj.progress),
        phases: projPhases,
        tasks: projTasks
      };
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proyectos: ' + error.message });
  }
});

/**
 * POST /api/projects
 * Crea un proyecto e inicializa automáticamente sus fases del ciclo de vida del proyecto.
 */
router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const {
      name,
      description = '',
      category = 'Operaciones',
      manager_id,
      priority = 'media',
      start_date,
      end_date,
      budget = 0,
      create_default_phases = true
    } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({
        error: 'El nombre del proyecto, la fecha de inicio y la fecha de finalización son obligatorios.'
      });
    }

    const insertRes = await query(
      `INSERT INTO projects (name, description, category, manager_id, status, priority, start_date, end_date, budget, progress)
       VALUES (?, ?, ?, ?, 'planificacion', ?, ?, ?, ?, 0)`,
      [
        name.trim(),
        description.trim(),
        category.trim(),
        manager_id ? Number(manager_id) : req.user.id,
        priority,
        start_date,
        end_date,
        Number(budget) || 0
      ]
    );

    const projectId = insertRes.lastInsertRowid;

    if (create_default_phases) {
      const lifecyclePhases = [
        ['1. Inicio', 'Definición de alcance, objetivos y actores involucrados', 1],
        ['2. Planificación', 'Requerimientos, presupuesto y cronograma de actividades', 2],
        ['3. Ejecución', 'Desarrollo e implementación operativa de entregables', 3],
        ['4. Monitoreo y Control', 'Validación de indicadores, pruebas y control de calidad', 4],
        ['5. Cierre', 'Entrega final, documentación y evaluación de resultados', 5]
      ];

      const batchPhases = lifecyclePhases.map(([phName, phDesc, idx]) => ({
        sql: `INSERT INTO project_phases (project_id, name, description, order_index, status)
              VALUES (?, ?, ?, ?, 'pendiente')`,
        args: [projectId, phName, phDesc, idx]
      }));

      await db.batch(batchPhases, 'write');
    }

    res.status(201).json({
      message: 'Proyecto creado con sus etapas del ciclo de vida',
      project_id: projectId
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear proyecto: ' + error.message });
  }
});

/**
 * PUT /api/projects/:id
 * Actualiza información general del proyecto.
 */
router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const existing = await query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    const curr = existing.rows[0];

    const {
      name = curr.name,
      description = curr.description,
      category = curr.category,
      manager_id = curr.manager_id,
      status = curr.status,
      priority = curr.priority,
      start_date = curr.start_date,
      end_date = curr.end_date,
      budget = curr.budget
    } = req.body;

    await query(
      `UPDATE projects
       SET name = ?, description = ?, category = ?, manager_id = ?, status = ?, priority = ?, start_date = ?, end_date = ?, budget = ?
       WHERE id = ?`,
      [
        name.trim(),
        description,
        category,
        manager_id ? Number(manager_id) : null,
        status,
        priority,
        start_date,
        end_date,
        Number(budget),
        projectId
      ]
    );

    res.json({ message: 'Proyecto actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar proyecto: ' + error.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Elimina un proyecto y sus fases/tareas asociadas (solo Admin).
 */
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    await db.batch(
      [
        { sql: 'DELETE FROM project_tasks WHERE project_id = ?', args: [projectId] },
        { sql: 'DELETE FROM project_phases WHERE project_id = ?', args: [projectId] },
        { sql: 'DELETE FROM projects WHERE id = ?', args: [projectId] }
      ],
      'write'
    );
    res.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proyecto: ' + error.message });
  }
});

/**
 * POST /api/projects/:id/phases
 * Agrega una nueva fase a un proyecto.
 */
router.post('/:id/phases', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { name, description = '', order_index = 1 } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la fase es obligatorio.' });
    }

    const result = await query(
      `INSERT INTO project_phases (project_id, name, description, order_index, status)
       VALUES (?, ?, ?, ?, 'pendiente')`,
      [projectId, name.trim(), description.trim(), Number(order_index)]
    );

    res.status(201).json({
      message: 'Fase añadida al proyecto',
      phase_id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear fase: ' + error.message });
  }
});

/**
 * PATCH /api/projects/phases/:phaseId
 * Actualiza el estado de una fase ('pendiente', 'en_progreso', 'completada').
 */
router.patch('/phases/:phaseId', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const phaseId = Number(req.params.phaseId);
    const { status } = req.body;
    await query('UPDATE project_phases SET status = ? WHERE id = ?', [status, phaseId]);
    res.json({ message: 'Estado de fase actualizado', status });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar fase: ' + error.message });
  }
});

/**
 * POST /api/projects/:id/tasks
 * Crea una nueva tarea asignada a una fase y un responsable, y recalcula el progreso del proyecto.
 */
router.post('/:id/tasks', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const {
      phase_id,
      title,
      description = '',
      assigned_to = null,
      priority = 'media',
      due_date = null,
      status = 'pendiente'
    } = req.body;

    if (!phase_id || !title || !title.trim()) {
      return res.status(400).json({ error: 'La fase y el título de la tarea son obligatorios.' });
    }

    const completedAt = status === 'completada' ? new Date().toISOString() : null;

    await query(
      `INSERT INTO project_tasks (project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        Number(phase_id),
        title.trim(),
        description.trim(),
        assigned_to ? Number(assigned_to) : req.user.id,
        status,
        priority,
        due_date || null,
        completedAt
      ]
    );

    const newProgress = await recalculateProjectProgress(projectId);
    res.status(201).json({
      message: 'Tarea registrada exitosamente',
      progress: newProgress
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear tarea: ' + error.message });
  }
});

/**
 * PUT /api/projects/tasks/:taskId
 * Actualiza el estado o responsable de una tarea y recalcula el progreso del proyecto.
 */
router.put('/tasks/:taskId', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const existing = await query('SELECT * FROM project_tasks WHERE id = ?', [taskId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    const curr = existing.rows[0];

    const {
      title = curr.title,
      description = curr.description,
      phase_id = curr.phase_id,
      assigned_to = curr.assigned_to,
      status = curr.status,
      priority = curr.priority,
      due_date = curr.due_date
    } = req.body;

    const completedAt =
      status === 'completada'
        ? curr.completed_at || new Date().toISOString()
        : null;

    await query(
      `UPDATE project_tasks
       SET title = ?, description = ?, phase_id = ?, assigned_to = ?, status = ?, priority = ?, due_date = ?, completed_at = ?
       WHERE id = ?`,
      [
        title.trim(),
        description,
        Number(phase_id),
        assigned_to ? Number(assigned_to) : null,
        status,
        priority,
        due_date || null,
        completedAt,
        taskId
      ]
    );

    const newProgress = await recalculateProjectProgress(Number(curr.project_id));
    res.json({
      message: 'Tarea actualizada y progreso recalculado',
      progress: newProgress
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar tarea: ' + error.message });
  }
});

/**
 * DELETE /api/projects/tasks/:taskId
 * Elimina una tarea y recalcula el progreso del proyecto.
 */
router.delete('/tasks/:taskId', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const existing = await query('SELECT project_id FROM project_tasks WHERE id = ?', [taskId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    const projectId = Number(existing.rows[0].project_id);

    await query('DELETE FROM project_tasks WHERE id = ?', [taskId]);
    const newProgress = await recalculateProjectProgress(projectId);

    res.json({
      message: 'Tarea eliminada',
      progress: newProgress
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar tarea: ' + error.message });
  }
});

module.exports = router;
