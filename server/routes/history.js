const express = require('express');
const { readHistory, writeHistory } = require('../data/store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const history = await readHistory();
    const userHistory = history[userId.toString()] || [];

    res.json(userHistory);
  } catch (err) {
    console.error('Error reading history:', err);
    res.status(500).json({ error: 'Erro ao ler histórico' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, workout, date, exercises } = req.body;

    if (!userId || !workout || !date) {
      return res.status(400).json({ error: 'userId, workout e date são obrigatórios' });
    }

    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const history = await readHistory();
    const userKey = userId.toString();

    if (!history[userKey]) {
      history[userKey] = [];
    }

    history[userKey].push({
      id: `h_${Date.now()}`,
      workout,
      date,
      exercises: exercises || [],
      completedAt: new Date().toISOString()
    });

    await writeHistory(history);

    res.status(201).json({ message: 'Histórico registrado com sucesso' });
  } catch (err) {
    console.error('Error saving history:', err);
    res.status(500).json({ error: 'Erro ao salvar histórico' });
  }
});

module.exports = router;
