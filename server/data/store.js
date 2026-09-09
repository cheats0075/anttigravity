const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);

let pool = null;
const DB_URL = process.env.DATABASE_URL;

if (DB_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
}

async function initDB() {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('PostgreSQL tables initialized');

    const { rows } = await client.query('SELECT COUNT(*)::int as count FROM kv_store');
    if (rows[0].count === 0) {
      console.log('Banco vazio, populando com dados iniciais...');
      const dataMap = {
        config: readJSON('config.json') || { users: [], exerciseEdits: {}, weeklySchedule: {} },
        workouts: readJSON('workouts.json') || { homem: [], mulher: [] },
        history: readJSON('history.json') || {},
        user_workouts: readJSON('user-workouts.json') || {}
      };
      for (const [key, value] of Object.entries(dataMap)) {
        await client.query(
          'INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
          [key, JSON.stringify(value)]
        );
      }
      console.log('Dados iniciais inseridos com sucesso!');
    }
  } finally {
    client.release();
  }
}

function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filepath)) return null;
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return null;
  }
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
    return false;
  }
}

async function dbRead(key, fallback) {
  if (!pool) return fallback;
  try {
    const { rows } = await pool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
    return rows.length > 0 ? rows[0].value : fallback;
  } catch (err) {
    console.error(`DB read error (${key}):`, err.message);
    return fallback;
  }
}

async function dbWrite(key, value) {
  if (!pool) return writeJSON(key + '.json', value);
  try {
    await pool.query(
      'INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
      [key, JSON.stringify(value)]
    );
    return true;
  } catch (err) {
    console.error(`DB write error (${key}):`, err.message);
    return false;
  }
}

function readConfig() {
  if (pool) return dbRead('config', { users: [], exerciseEdits: {}, weeklySchedule: {} });
  return readJSON('config.json') || { users: [], exerciseEdits: {}, weeklySchedule: {} };
}

function writeConfig(config) {
  if (pool) return dbWrite('config', config);
  return writeJSON('config.json', config);
}

function readWorkouts() {
  if (pool) return dbRead('workouts', { homem: [], mulher: [] });
  return readJSON('workouts.json') || { homem: [], mulher: [] };
}

function writeWorkouts(workouts) {
  if (pool) return dbWrite('workouts', workouts);
  return writeJSON('workouts.json', workouts);
}

function readHistory() {
  if (pool) return dbRead('history', {});
  return readJSON('history.json') || {};
}

function writeHistory(history) {
  if (pool) return dbWrite('history', history);
  return writeJSON('history.json', history);
}

function readUserWorkouts() {
  if (pool) return dbRead('user_workouts', {});
  return readJSON('user-workouts.json') || {};
}

function writeUserWorkouts(data) {
  if (pool) return dbWrite('user_workouts', data);
  return writeJSON('user-workouts.json', data);
}

module.exports = { initDB, readJSON, writeJSON, readConfig, writeConfig, readWorkouts, writeWorkouts, readHistory, writeHistory, readUserWorkouts, writeUserWorkouts };
