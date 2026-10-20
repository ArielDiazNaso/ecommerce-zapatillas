const jwt = require('jsonwebtoken');
const ENV = require('../config/env');

/**
 * Middleware para autenticar token JWT en encabezados Authorization.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * Middleware opcional que extrae el usuario si hay token, pero permite continuar si es visitante.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, ENV.JWT_SECRET);
  } catch (err) {
    req.user = null;
  }
  next();
}

/**
 * Middleware para restringir el acceso según roles permitidos ('admin', 'empleado', 'cliente').
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permisos insuficientes. Se requiere rol: ${allowedRoles.join(' o ')}.`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  authorizeRoles
};
