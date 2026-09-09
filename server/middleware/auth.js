const jwt = require('jsonwebtoken');
const { readConfig } = require('../data/store');

const JWT_SECRET = process.env.JWT_SECRET || 'anttigravity_secret_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin.' });
  }
  next();
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authMiddleware, adminMiddleware, generateToken, JWT_SECRET };
