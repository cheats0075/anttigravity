const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workouts');
const userWorkoutRoutes = require('./routes/user-workouts');
const userRoutes = require('./routes/users');
const historyRoutes = require('./routes/history');
const { initDB, readConfig, writeConfig } = require('./data/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/user-workouts', userWorkoutRoutes);
app.use('/api/users', userRoutes);
app.use('/api/history', historyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', async (req, res) => {
  try {
    const config = await readConfig();
    const safeConfig = {
      users: (config.users || []).map(u => ({
        id: u.id,
        name: u.name,
        isAdmin: u.isAdmin,
        gender: u.gender
      })),
      exerciseEdits: config.exerciseEdits || {},
      weeklySchedule: config.weeklySchedule || {}
    };
    res.json(safeConfig);
  } catch (err) {
    console.error('Error reading config:', err);
    res.status(500).json({ error: 'Erro ao ler configuração' });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./middleware/auth');
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Apenas admin' });

    const incoming = req.body;
    const config = await readConfig();

    if (incoming.exerciseEdits) {
      config.exerciseEdits = incoming.exerciseEdits;
    }
    if (incoming.weeklySchedule) {
      config.weeklySchedule = incoming.weeklySchedule;
    }

    await writeConfig(config);
    res.json({ message: 'Configuração salva com sucesso' });
  } catch (err) {
    console.error('Error saving config:', err);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

app.use(express.static(path.join(__dirname, '..')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}${process.env.DATABASE_URL ? ' (PostgreSQL)' : ' (file-based)'}`);
  });
}).catch(err => {
  console.error('Failed to init DB, falling back to file-based:', err.message);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (file-based fallback)`);
  });
});
