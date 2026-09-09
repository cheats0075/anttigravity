const express = require('express');
const { readWorkouts, writeWorkouts } = require('../data/store');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const workouts = readWorkouts();
    res.json(workouts);
  } catch (err) {
    console.error('Error reading workouts:', err);
    res.status(500).json({ error: 'Erro ao ler treinos' });
  }
});

router.put('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const workouts = req.body;
    if (!workouts.homem || !workouts.mulher) {
      return res.status(400).json({ error: 'Dados inválidos. Expects {homme: [...], mulher: [...]}' });
    }

    const success = writeWorkouts(workouts);
    if (success) {
      res.json({ message: 'Treinos atualizados com sucesso' });
    } else {
      res.status(500).json({ error: 'Erro ao salvar treinos' });
    }
  } catch (err) {
    console.error('Error updating workouts:', err);
    res.status(500).json({ error: 'Erro ao atualizar treinos' });
  }
});

module.exports = router;
