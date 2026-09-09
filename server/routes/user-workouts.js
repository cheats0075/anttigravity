const express = require('express');
const { readUserWorkouts, writeUserWorkouts } = require('../data/store');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const allWorkouts = await readUserWorkouts();
    const userWorkouts = allWorkouts[userId.toString()] || [];

    res.json(userWorkouts);
  } catch (err) {
    console.error('Error reading user workouts:', err);
    res.status(500).json({ error: 'Erro ao ler treinos do usuário' });
  }
});

router.put('/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const days = req.body;

    if (!Array.isArray(days)) {
      return res.status(400).json({ error: 'Dados inválidos. Envie array de dias.' });
    }

    const allWorkouts = await readUserWorkouts();
    allWorkouts[userId.toString()] = days;

    const success = await writeUserWorkouts(allWorkouts);
    if (success) {
      res.json({ message: 'Treinos do usuário atualizados com sucesso' });
    } else {
      res.status(500).json({ error: 'Erro ao salvar treinos' });
    }
  } catch (err) {
    console.error('Error updating user workouts:', err);
    res.status(500).json({ error: 'Erro ao atualizar treinos do usuário' });
  }
});

router.delete('/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const allWorkouts = await readUserWorkouts();

    delete allWorkouts[userId.toString()];
    await writeUserWorkouts(allWorkouts);

    res.json({ message: 'Treinos do usuário removidos com sucesso' });
  } catch (err) {
    console.error('Error deleting user workouts:', err);
    res.status(500).json({ error: 'Erro ao deletar treinos do usuário' });
  }
});

module.exports = router;
