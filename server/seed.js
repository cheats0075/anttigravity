const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL não definida. Execute com: DATABASE_URL=sua_url node seed.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false }
});

const DATA_DIR = path.join(__dirname, 'data');

function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Tabela kv_store criada/verificada');

    const dataMap = {
      config: readJSON('config.json'),
      workouts: readJSON('workouts.json'),
      history: readJSON('history.json'),
      user_workouts: readJSON('user-workouts.json')
    };

    for (const [key, value] of Object.entries(dataMap)) {
      await client.query(
        'INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
        [key, JSON.stringify(value)]
      );
      console.log(`Dados inseridos: ${key}`);
    }

    console.log('Seed concluído com sucesso!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
