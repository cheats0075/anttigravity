const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);

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

function readConfig() {
  return readJSON('config.json') || { users: [], exerciseEdits: {}, weeklySchedule: {} };
}

function writeConfig(config) {
  return writeJSON('config.json', config);
}

function readWorkouts() {
  return readJSON('workouts.json') || { homem: [], mulher: [] };
}

function writeWorkouts(workouts) {
  return writeJSON('workouts.json', workouts);
}

function readHistory() {
  return readJSON('history.json') || {};
}

function writeHistory(history) {
  return writeJSON('history.json', history);
}

module.exports = { readJSON, writeJSON, readConfig, writeConfig, readWorkouts, writeWorkouts, readHistory, writeHistory };
