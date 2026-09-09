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

const DEFAULT_CONFIG = {
  "users": [
    { "id": 387, "password": "0075", "name": "Admin", "isAdmin": true, "gender": null },
    { "id": 2, "password": "0716", "name": "0716", "isAdmin": false, "gender": "mulher" },
    { "id": 3, "password": "1607", "name": "BRUNA", "isAdmin": false, "gender": "mulher" }
  ],
  "exerciseEdits": {},
  "weeklySchedule": {}
};

const DEFAULT_WORKOUTS = {
  "homem": [
    {
      "id": "h1", "day": "Segunda", "dayIndex": 1, "title": "Peito e Tríceps", "restDay": false,
      "exercises": [
        { "id": "h1e1", "name": "Supino Reto", "sets": 3, "reps": "8-12", "image": "supino_reto.gif", "muscle": "Peito", "tips": "Mantenha os pés firmes no chão e costas levemente arqueadas" },
        { "id": "h1e2", "name": "Supino Inclinado", "sets": 3, "reps": "8-12", "image": "supino_inclinado.gif", "muscle": "Peito Superior", "tips": "ângulo de 30-45 graus, não travar os cotovelos" },
        { "id": "h1e3", "name": "Peck Deck", "sets": 3, "reps": "10-15", "image": "peck_deck.gif", "muscle": "Peito", "tips": "Controle o movimento, não use impulso" },
        { "id": "h1e4", "name": "Crucifixo", "sets": 3, "reps": "10-15", "image": "crucifixo.gif", "muscle": "Peito", "tips": "Flexione levemente os cotovelos, sinta o alongamento" },
        { "id": "h1e5", "name": "Tríceps na Polia", "sets": 3, "reps": "10-15", "image": "triceps_polia.gif", "muscle": "Tríceps", "tips": "Cotovelos fixos ao lado do corpo" },
        { "id": "h1e6", "name": "Tríceps Francês", "sets": 3, "reps": "10-12", "image": "triceps_frances.gif", "muscle": "Tríceps", "tips": "Cotovelos apontando para cima, movimento só no antebraço" }
      ]
    },
    {
      "id": "h2", "day": "Terça", "dayIndex": 2, "title": "Costas e Bíceps", "restDay": false,
      "exercises": [
        { "id": "h2e1", "name": "Puxada Frontal", "sets": 3, "reps": "8-12", "image": "puxada_frontal.gif", "muscle": "Costas", "tips": "Incline levemente o tronco para trás, puxa até o peito" },
        { "id": "h2e2", "name": "Remada Baixa", "sets": 3, "reps": "8-12", "image": "remada_baixa.gif", "muscle": "Costas", "tips": "Mantenha as costas retas, puxe com as costas não com os braços" },
        { "id": "h2e3", "name": "Remada Unilateral", "sets": 3, "reps": "10-12", "image": "remada_unilateral.gif", "muscle": "Costas", "tips": "Tronco estável, movimento controlado" },
        { "id": "h2e4", "name": "Rosca Direta", "sets": 3, "reps": "8-12", "image": "rosca_direta.gif", "muscle": "Bíceps", "tips": "Cotovelos fixos, não balance o corpo" },
        { "id": "h2e5", "name": "Rosca Martelo", "sets": 3, "reps": "10-12", "image": "rosca_martelo.gif", "muscle": "Bíceps/Brachial", "tips": "Pegada neutra, movimento completo" },
        { "id": "h2e6", "name": "Rosca Scott", "sets": 3, "reps": "10-12", "image": "rosca_Scott.gif", "muscle": "Bíceps", "tips": "Não trave os cotovelos na extensão" }
      ]
    },
    { "id": "h3", "day": "Quarta", "dayIndex": 3, "title": "Descanso", "restDay": true, "exercises": [] },
    {
      "id": "h4", "day": "Quinta", "dayIndex": 4, "title": "Pernas", "restDay": false,
      "exercises": [
        { "id": "h4e1", "name": "Leg Press", "sets": 3, "reps": "8-12", "image": "leg_press45.gif", "muscle": "Quadríceps", "tips": "Pés na largura dos ombros, não travar os joelhos" },
        { "id": "h4e2", "name": "Cadeira Extensora", "sets": 3, "reps": "10-15", "image": "cadeira_extensora.gif", "muscle": "Quadríceps", "tips": "Controle a descida, contraia no topo" },
        { "id": "h4e3", "name": "Mesa Flexora", "sets": 3, "reps": "10-15", "image": "mesa_flexora.gif", "muscle": "Posterior", "tips": "Quadril colado no banco, movimento controlado" },
        { "id": "h4e4", "name": "Panturrilha Banco Sentado", "sets": 4, "reps": "10-15", "image": "panturrilha_banco_sentado.gif", "muscle": "Panturrilha", "tips": "Amplitude total, segure 1s no topo" },
        { "id": "h4e5", "name": "Panturrilha em Pé", "sets": 4, "reps": "10-15", "image": "panturriha_em_pe.gif", "muscle": "Panturrilha", "tips": "Suba na ponta dos pés, desça devagar" }
      ]
    },
    {
      "id": "h5", "day": "Sexta", "dayIndex": 5, "title": "Ombros e Abdômen", "restDay": false,
      "exercises": [
        { "id": "h5e1", "name": "Desenvolvimento de Ombros", "sets": 3, "reps": "8-12", "image": "desenvolvimmento_ombros.gif", "muscle": "Ombros", "tips": "Empurre acima da cabeça, não arqueie as costas" },
        { "id": "h5e2", "name": "Elevação Lateral", "sets": 3, "reps": "10-15", "image": "elevacao_lateral.gif", "muscle": "Ombro Lateral", "tips": "Cotovelos levemente flexionados, até a altura dos ombros" },
        { "id": "h5e3", "name": "Elevação Frontal", "sets": 3, "reps": "10-15", "image": "elevacao_frontal.gif", "muscle": "Ombro Anterior", "tips": "Até a altura dos olhos, controle a descida" },
        { "id": "h5e4", "name": "Encolhimento", "sets": 3, "reps": "10-15", "image": "encolhimento.gif", "muscle": "Trapézio", "tips": "Suba os ombros até as orelhas, segure 1s no topo" },
        { "id": "h5e5", "name": "Abdominal", "sets": 3, "reps": "15-20", "image": "abdominal.gif", "muscle": "Abdômen", "tips": "Contrai o abdômen, não puxe o pescoço" }
      ]
    },
    { "id": "h6", "day": "Sábado", "dayIndex": 6, "title": "Descanso", "restDay": true, "exercises": [] },
    { "id": "h7", "day": "Domingo", "dayIndex": 0, "title": "Descanso", "restDay": true, "exercises": [] }
  ],
  "mulher": [
    {
      "id": "m1", "day": "Segunda", "dayIndex": 1, "title": "Inferior A (Foco Perna)", "restDay": false,
      "exercises": [
        { "id": "m1e1", "name": "Agachamento no Smith", "sets": 4, "reps": "10-12", "image": "agachamento_smith.gif", "muscle": "Quadríceps/Glúteo", "tips": "Desça até 90 graus, joelhos alinhados com os pés" },
        { "id": "m1e2", "name": "Leg Press 45°", "sets": 3, "reps": "10-12", "image": "leg_press45.gif", "muscle": "Quadríceps", "tips": "Pés na parte de cima da plataforma, não travar joelhos" },
        { "id": "m1e3", "name": "Cadeira Extensora", "sets": 3, "reps": "12-15", "image": "cadeira_extensora.gif", "muscle": "Quadríceps", "tips": "Controle a descida, contraia no topo" },
        { "id": "m1e4", "name": "Mesa Flexora", "sets": 3, "reps": "12-15", "image": "mesa_flexora.gif", "muscle": "Posterior", "tips": "Quadril colado no banco, movimento controlado" },
        { "id": "m1e5", "name": "Panturrilha em Pé", "sets": 3, "reps": "15", "image": "panturriha_em_pe.gif", "muscle": "Panturrilha", "tips": "Suba na ponta dos pés, desça devagar" },
        { "id": "m1e6", "name": "Prancha", "sets": 3, "reps": "30s", "image": "prancha.gif", "muscle": "Core", "tips": "Corpo reto como uma tábola, contraia o abdômen" }
      ]
    },
    {
      "id": "m2", "day": "Terça", "dayIndex": 2, "title": "Superior A (Peito/Costas/Ombro)", "restDay": false,
      "exercises": [
        { "id": "m2e1", "name": "Supino Reto com Halter", "sets": 4, "reps": "10-12", "image": "supino_reto_altere.gif", "muscle": "Peito", "tips": "Cotovelos a 45 graus, desça até o peito" },
        { "id": "m2e2", "name": "Puxada Frente", "sets": 4, "reps": "10-12", "image": "puxada_frontal.gif", "muscle": "Costas", "tips": "Puxa até o peito, aperte as escápulas" },
        { "id": "m2e3", "name": "Remada Baixa", "sets": 3, "reps": "10-12", "image": "remada_baixa.gif", "muscle": "Costas", "tips": "Costas retas, puxe com as costas" },
        { "id": "m2e4", "name": "Desenvolvimento com Halter", "sets": 3, "reps": "10-12", "image": "desenvolvimmento_ombros.gif", "muscle": "Ombros", "tips": "Empurre acima da cabeça, não arqueie as costas" },
        { "id": "m2e5", "name": "Tríceps Polia", "sets": 3, "reps": "12-15", "image": "triceps_polia.gif", "muscle": "Tríceps", "tips": "Cotovelos fixos ao lado do corpo" },
        { "id": "m2e6", "name": "Rosca Direta", "sets": 3, "reps": "12-15", "image": "rosca_direta.gif", "muscle": "Bíceps", "tips": "Cotovelos fixos, não balance o corpo" }
      ]
    },
    { "id": "m3", "day": "Quarta", "dayIndex": 3, "title": "Descanso", "restDay": true, "exercises": [] },
    {
      "id": "m4", "day": "Quinta", "dayIndex": 4, "title": "Inferior B (Foco Glúteo/Posterior)", "restDay": false,
      "exercises": [
        { "id": "m4e1", "name": "Levantamento Terra Romeno", "sets": 3, "reps": "10-12", "image": "levantamento_terreo.gif", "muscle": "Posterior/Glúteo", "tips": "Costas retas, desça até sentir alongamento" },
        { "id": "m4e2", "name": "Afundo", "sets": 3, "reps": "10 cada perna", "image": "afundo.gif", "muscle": "Quadríceps/Glúteo", "tips": "Joelho dianteiro não ultrapassa o pé" },
        { "id": "m4e3", "name": "Cadeira Abdutora", "sets": 3, "reps": "15", "image": "cadeira_abdutora.gif", "muscle": "Glúteo Médio", "tips": "Controle o movimento, não use impulso" },
        { "id": "m4e4", "name": "Cadeira Flexora", "sets": 3, "reps": "12-15", "image": "cadeira_flexora.gif", "muscle": "Posterior", "tips": "Quadril colado, movimento lento e controlado" },
        { "id": "m4e5", "name": "Elevação Pélvica", "sets": 3, "reps": "12", "image": "elevacao_pelvica.gif", "muscle": "Glúteo", "tips": "Aperte os glúteos no topo, segure 2s" }
      ]
    },
    {
      "id": "m5", "day": "Sexta", "dayIndex": 5, "title": "Superior B (Foco Braço e Definição)", "restDay": false,
      "exercises": [
        { "id": "m5e1", "name": "Supino Inclinado Banco", "sets": 3, "reps": "10-12", "image": "supino_inclinado.gif", "muscle": "Peito Superior", "tips": "ângulo de 30-45 graus, não travar cotovelos" },
        { "id": "m5e2", "name": "Remada Curvada com Halter", "sets": 3, "reps": "10-12", "image": "remada_curvada.gif", "muscle": "Costas", "tips": "Tronco a 45 graus, puxe com as escápulas" },
        { "id": "m5e3", "name": "Elevação Lateral", "sets": 3, "reps": "12-15", "image": "elevacao_lateral.gif", "muscle": "Ombro Lateral", "tips": "Cotovelos levemente flexionados, até a altura dos ombros" },
        { "id": "m5e4", "name": "Peck Deck", "sets": 3, "reps": "12-15", "image": "peck_deck.gif", "muscle": "Peito", "tips": "Controle o movimento, não use impulso" },
        { "id": "m5e5", "name": "Rosca Martelo", "sets": 3, "reps": "12", "image": "rosca_martelo.gif", "muscle": "Bíceps/Brachial", "tips": "Pegada neutra, movimento completo" },
        { "id": "m5e6", "name": "Tríceps Testa com Halter", "sets": 3, "reps": "12", "image": "triceps_testa.gif", "muscle": "Tríceps", "tips": "Cotovelos apontando para cima, só o antebraço se move" }
      ]
    },
    { "id": "m6", "day": "Sábado", "dayIndex": 6, "title": "Descanso", "restDay": true, "exercises": [] },
    { "id": "m7", "day": "Domingo", "dayIndex": 0, "title": "Descanso", "restDay": true, "exercises": [] }
  ]
};

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

    const { rows } = await client.query("SELECT value FROM kv_store WHERE key = 'config'");
    const hasUsers = rows.length > 0 && rows[0].value && rows[0].value.users && rows[0].value.users.length > 0;
    if (!hasUsers) {
      console.log('Banco sem usuarios, populando com dados iniciais...');
      const dataMap = {
        config: DEFAULT_CONFIG,
        workouts: DEFAULT_WORKOUTS,
        history: {},
        user_workouts: {}
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
