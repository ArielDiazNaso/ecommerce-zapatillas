const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Lista usuarios filtrados por rol o búsqueda.
 * - Admin: acceso completo a todos los usuarios.
 * - Empleado: puede consultar clientes para ventas POS y lista de personal para asignación de proyectos.
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { role, search } = req.query;
    let sql = `SELECT id, name, email, role, phone, dni, address, department, hire_date, active, created_at FROM users WHERE 1=1`;
    const args = [];

    if (role) {
      sql += ` AND role = ?`;
      args.push(role);
    }

    if (search && search.trim() !== '') {
      sql += ` AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(dni) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      args.push(term, term, term);
    }

    sql += ` ORDER BY id DESC`;
    const result = await query(sql, args);
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios: ' + error.message });
  }
});

/**
 * POST /api/users
 * Crea un nuevo usuario (cliente, empleado o admin).
 * - Admin puede crear cualquier rol.
 * - Empleado solo puede dar de alta clientes.
 */
router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const {
      name,
      email,
      password = 'Cliente123!',
      role = 'cliente',
      phone = '',
      dni = '',
      address = '',
      department = '',
      hire_date = null
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'El nombre y el correo electrónico son obligatorios.' });
    }

    if (req.user.role === 'empleado' && role !== 'cliente') {
      return res.status(403).json({
        error: 'Los empleados únicamente tienen permiso para dar de alta usuarios con rol cliente.'
      });
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo electrónico.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, dni, address, department, hire_date, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        role,
        phone.trim(),
        dni.trim(),
        address.trim(),
        department.trim(),
        hire_date || null
      ]
    );

    const created = await query(
      'SELECT id, name, email, role, phone, dni, address, department, hire_date, active, created_at FROM users WHERE id = ?',
      [result.lastInsertRowid]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: created.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario: ' + error.message });
  }
});

/**
 * PUT /api/users/:id
 * Actualiza los datos de un cliente o empleado según permisos.
 */
router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const existingRes = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const targetUser = existingRes.rows[0];
    if (req.user.role === 'empleado' && targetUser.role !== 'cliente') {
      return res.status(403).json({
        error: 'Los empleados solo pueden modificar datos de clientes.'
      });
    }

    const {
      name = targetUser.name,
      email = targetUser.email,
      role = targetUser.role,
      phone = targetUser.phone,
      dni = targetUser.dni,
      address = targetUser.address,
      department = targetUser.department,
      hire_date = targetUser.hire_date,
      active = targetUser.active,
      password
    } = req.body;

    const finalRole = req.user.role === 'admin' ? role : 'cliente';

    if (password && password.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await query(
        `UPDATE users
         SET name = ?, email = ?, role = ?, phone = ?, dni = ?, address = ?, department = ?, hire_date = ?, active = ?, password_hash = ?
         WHERE id = ?`,
        [
          name.trim(),
          email.trim().toLowerCase(),
          finalRole,
          phone,
          dni,
          address,
          department,
          hire_date || null,
          Number(active),
          passwordHash,
          userId
        ]
      );
    } else {
      await query(
        `UPDATE users
         SET name = ?, email = ?, role = ?, phone = ?, dni = ?, address = ?, department = ?, hire_date = ?, active = ?
         WHERE id = ?`,
        [
          name.trim(),
          email.trim().toLowerCase(),
          finalRole,
          phone,
          dni,
          address,
          department,
          hire_date || null,
          Number(active),
          userId
        ]
      );
    }

    const updated = await query(
      'SELECT id, name, email, role, phone, dni, address, department, hire_date, active, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Usuario actualizado correctamente',
      user: updated.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario: ' + error.message });
  }
});

/**
 * PATCH /api/users/:id/toggle-active
 * Activa o desactiva una cuenta (solo Admin).
 */
router.patch('/:id/toggle-active', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puede desactivar su propia cuenta de administrador.' });
    }

    const existing = await query('SELECT id, active FROM users WHERE id = ?', [userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const newActive = Number(existing.rows[0].active) === 1 ? 0 : 1;
    await query('UPDATE users SET active = ? WHERE id = ?', [newActive, userId]);

    res.json({
      message: newActive === 1 ? 'Usuario activado' : 'Usuario desactivado',
      active: newActive
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del usuario: ' + error.message });
  }
});

module.exports = router;
