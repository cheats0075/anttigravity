const express = require('express');
const bcrypt = require('bcryptjs');
const { readConfig } = require('../data/store');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) {
      return res.status(400).json({ error: 'ID e senha são obrigatórios' });
    }

    const config = readConfig();
    const user = config.users.find(u => u.id === parseInt(id, 10));

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        isAdmin: user.isAdmin,
        gender: user.gender
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
