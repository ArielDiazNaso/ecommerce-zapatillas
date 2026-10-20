const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const ENV = require('../config/env');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Inicia sesión validando email y contraseña con bcrypt.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor ingrese correo electrónico y contraseña.' });
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role, phone, dni, address, department, hire_date, active FROM users WHERE LOWER(email) = LOWER(?)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique su email y contraseña.' });
    }

    const user = result.rows[0];
    if (Number(user.active) === 0) {
      return res.status(403).json({ error: 'Su cuenta se encuentra desactivada. Contacte al administrador.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique su email y contraseña.' });
    }

    const payload = {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    delete user.password_hash;
    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión: ' + error.message });
  }
});

/**
 * POST /api/auth/register
 * Registro público de nuevos clientes.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone = '', dni = '', address = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo electrónico y contraseña obligatorios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, dni, address, active)
       VALUES (?, ?, ?, 'cliente', ?, ?, ?, 1)`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, phone.trim(), dni.trim(), address.trim()]
    );

    const newUser = {
      id: insertResult.lastInsertRowid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'cliente',
      phone: phone.trim(),
      dni: dni.trim(),
      address: address.trim(),
      active: 1
    };

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registro de cliente exitoso',
      token,
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario: ' + error.message });
  }
});

/**
 * GET /api/auth/me
 * Obtiene el perfil del usuario autenticado.
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, phone, dni, address, department, hire_date, active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil: ' + error.message });
  }
});

/**
 * PUT /api/auth/profile
 * Permite al usuario autenticado actualizar sus propios datos personales o su contraseña.
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone = '', dni = '', address = '', newPassword } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }

    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      }
      const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      await query(
        `UPDATE users SET name = ?, phone = ?, dni = ?, address = ?, password_hash = ? WHERE id = ?`,
        [name.trim(), phone.trim(), dni.trim(), address.trim(), passwordHash, req.user.id]
      );
    } else {
      await query(
        `UPDATE users SET name = ?, phone = ?, dni = ?, address = ? WHERE id = ?`,
        [name.trim(), phone.trim(), dni.trim(), address.trim(), req.user.id]
      );
    }

    const updated = await query(
      'SELECT id, name, email, role, phone, dni, address, department, hire_date, active FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ message: 'Perfil actualizado correctamente', user: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil: ' + error.message });
  }
});

module.exports = router;
