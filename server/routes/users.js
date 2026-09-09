const express = require('express');
const bcrypt = require('bcryptjs');
const { readConfig, writeConfig } = require('../data/store');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const config = readConfig();
    const users = config.users.map(u => ({
      id: u.id,
      name: u.name,
      isAdmin: u.isAdmin,
      gender: u.gender
    }));
    res.json(users);
  } catch (err) {
    console.error('Error reading users:', err);
    res.status(500).json({ error: 'Erro ao ler usuários' });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const config = readConfig();
    const userId = parseInt(req.params.id, 10);

    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const user = config.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      id: user.id,
      name: user.name,
      isAdmin: user.isAdmin,
      gender: user.gender
    });
  } catch (err) {
    console.error('Error reading user:', err);
    res.status(500).json({ error: 'Erro ao ler usuário' });
  }
});

router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id, name, password, gender, isAdmin } = req.body;

    if (!id || !name || !password) {
      return res.status(400).json({ error: 'ID, nome e senha são obrigatórios' });
    }

    const config = readConfig();
    const exists = config.users.find(u => u.id === parseInt(id, 10));

    if (exists) {
      return res.status(400).json({ error: 'Usuário com este ID já existe' });
    }

    const newUser = {
      id: parseInt(id, 10),
      name,
      password,
      gender: gender || null,
      isAdmin: isAdmin || false
    };

    config.users.push(newUser);
    writeConfig(config);

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
      gender: newUser.gender
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { name, password, gender, isAdmin } = req.body;

    const config = readConfig();
    const userIndex = config.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (name) config.users[userIndex].name = name;
    if (password) config.users[userIndex].password = password;
    if (gender !== undefined) config.users[userIndex].gender = gender;
    if (isAdmin !== undefined) config.users[userIndex].isAdmin = isAdmin;

    writeConfig(config);

    res.json({
      id: config.users[userIndex].id,
      name: config.users[userIndex].name,
      isAdmin: config.users[userIndex].isAdmin,
      gender: config.users[userIndex].gender
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const config = readConfig();
    const userIndex = config.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    config.users.splice(userIndex, 1);
    writeConfig(config);

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

module.exports = router;
