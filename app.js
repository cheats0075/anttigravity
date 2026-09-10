const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEK_DAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const WEEK_DAYS_DISPLAY = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MUSCLE_FILTERS = ['Todos', 'Peito', 'Costas', 'Perna', 'Ombro', 'Bíceps', 'Tríceps', 'Abdome', 'Glúteo', 'Corpo', 'Aeróbico', 'Alongamento', 'CrossFit', 'Funcional', 'Mobilidade'];

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://anttigravity-api.onrender.com/api';

let authToken = localStorage.getItem('auth_token') || null;

const app = document.getElementById('app');
let workouts = {};
let currentGender = null;
let currentWorkout = null;
let exerciseStates = {};
let activeExercise = null;
let currentSet = 0;
let timer = 0;
let timerInterval = null;
let isResting = false;
let currentView = 'home';
let workoutStartTime = null;
let workoutDurationInterval = null;
let currentWeight = '';
let REST_TIME = 90;
let currentTab = 'home';
let exerciseStartTime = null;

let librarySearchQuery = '';
let libraryActiveFilter = 'Todos';
let libraryDisplayCount = 30;
let libraryScrollListener = null;

let builderName = '';
let builderGender = null;
let builderDay = 'nenhum';
let builderExercises = [];
let editingWorkoutId = null;
let pickerMode = false;
let pickerCallback = null;
let addingToWorkout = false;
let swappingExerciseIdx = -1;
let pickerOrigin = 'builder';
let showBuilderForm = false;
let builderTargetUserId = null;
let builderTargetUser = null;
let builderSelectedDay = null;
let builderMultiPick = [];
let builderMultiMode = false;

let customWorkouts = {};
let userWorkouts = {};

let apiLoaded = false;
let currentUserId = null;
let currentUserIsAdmin = false;
let currentUserName = '';
let remoteConfig = { users: [], exerciseEdits: {}, weeklySchedule: {} };

function getExerciseGifPath(exercise) {
  if (typeof exercise.id === 'string') {
    return `assets/exercises/${exercise.gif || exercise.id}.gif`;
  }
  return `gifs/${exercise.gif || exercise.id}.gif`;
}

function getWorkoutExerciseGif(exercise) {
  if (exercise.image) {
    if (exercise.image.endsWith('.gif')) {
      const numId = exercise.image.replace('.gif', '');
      if (!isNaN(numId)) {
        return `gifs/${numId}.gif`;
      }
      return `assets/exercises/${exercise.image}`;
    }
    return `assets/exercises/${exercise.image}`;
  }
  const dbEx = EXERCISES_DB.find(e => e.id === exercise.id || e.name === exercise.name);
  if (dbEx) return getExerciseGifPath(dbEx);
  return '';
}

function tryLoadLib() {
  try { customWorkouts = JSON.parse(sGet('custom_workouts')) || {}; } catch (e) { customWorkouts = {}; }
}
tryLoadLib();

function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function apiGet(endpoint) {
  try {
    const r = await apiFetch(`${API_BASE}${endpoint}`, { headers: apiHeaders() });
    if (r.ok) return await r.json();
    return null;
  } catch (e) {
    console.warn('API GET error:', e);
    return null;
  }
}

async function apiPost(endpoint, data) {
  try {
    const r = await apiFetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(data)
    });
    if (r.ok) return await r.json();
    const err = await r.json().catch(() => ({}));
    return { error: err.error || 'Erro na requisição' };
  } catch (e) {
    console.warn('API POST error:', e);
    return { error: 'Erro de conexão' };
  }
}

async function apiPut(endpoint, data) {
  try {
    const r = await apiFetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(data)
    });
    if (r.ok) return await r.json();
    const err = await r.json().catch(() => ({}));
    return { error: err.error || 'Erro na requisição' };
  } catch (e) {
    console.warn('API PUT error:', e);
    return { error: 'Erro de conexão' };
  }
}

async function apiDelete(endpoint) {
  try {
    const r = await apiFetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: apiHeaders()
    });
    if (r.ok) return await r.json();
    const err = await r.json().catch(() => ({}));
    return { error: err.error || 'Erro na requisição' };
  } catch (e) {
    console.warn('API DELETE error:', e);
    return { error: 'Erro de conexão' };
  }
}

function storageKey(key) {
  return currentUserId ? `${currentUserId}_${key}` : key;
}

function sGet(key) {
  try { return localStorage.getItem(storageKey(key)); } catch (e) { return null; }
}

function sSet(key, val) {
  try { localStorage.setItem(storageKey(key), val); } catch (e) {}
}

function sRemove(key) {
  try { localStorage.removeItem(storageKey(key)); } catch (e) {}
}

async function loadRemoteConfig() {
  const config = await apiGet('/config');
  if (config) {
    remoteConfig = config;
    return;
  }
}

function saveRemoteConfig() {}

async function saveAllConfig() {
  if (!authToken || !currentUserIsAdmin) { alert('Apenas admin pode salvar.'); return; }
  if (!apiLoaded) { alert('Aguarde o servidor conectar antes de salvar.'); return; }

  const btn = document.getElementById('admin-save-btn');
  if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

  const result = await apiPut('/config', {
    exerciseEdits: remoteConfig.exerciseEdits,
    weeklySchedule: remoteConfig.weeklySchedule
  });

  if (btn) { btn.textContent = '💾 Salvar tudo na API'; btn.disabled = false; }

  if (result.error) {
    alert('Erro ao salvar: ' + result.error);
  } else {
    alert('Configuração salva na API com sucesso!');
  }
}

async function doLogin(userId, password) {
  const uid = parseInt(userId, 10);
  const pwd = String(password);

  const result = await apiPost('/auth/login', { id: uid, password: pwd });
  if (result.error) return false;

  authToken = result.token;
  localStorage.setItem('auth_token', authToken);
  currentUserId = result.user.id;
  currentUserIsAdmin = result.user.isAdmin;
  currentUserName = result.user.name;
  currentGender = result.user.gender || null;
  try { localStorage.setItem('current_session', JSON.stringify(result.user)); } catch (e) {}
  return true;
}

function doLogout() {
  currentUserId = null;
  currentUserIsAdmin = false;
  currentUserName = '';
  currentGender = null;
  currentWorkout = null;
  authToken = null;
  try {
    localStorage.removeItem('current_session');
    localStorage.removeItem('auth_token');
  } catch (e) {}
  renderLogin();
}

function checkSession() {
  try {
    const raw = localStorage.getItem('current_session');
    const token = localStorage.getItem('auth_token');
    if (!raw) return false;
    const s = JSON.parse(raw);
    currentUserId = s.id;
    currentUserIsAdmin = !!s.isAdmin;
    currentUserName = s.name;
    currentGender = s.gender || null;
    if (token) authToken = token;
    return true;
  } catch (e) { return false; }
}

function renderLogin() {
  currentView = 'login';
  app.innerHTML = `
    <div class="screen login-screen">
      <div class="login-logo">ANTIGRAVITY</div>
      <div class="login-subtitle">Acesse sua conta</div>
      <form onsubmit="handleLogin(event)" class="login-form">
        <input class="login-input" type="number" id="login-user" placeholder="Usuário" inputmode="numeric" autocomplete="username" required>
        <input class="login-input" type="password" id="login-pass" placeholder="Senha" inputmode="numeric" autocomplete="current-password" required>
        <button class="login-btn" type="submit">Entrar</button>
      </form>
      <div id="login-error" class="login-error" style="display:none;">Usuário ou senha inválidos</div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const userId = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;
  const btn = document.querySelector('.login-btn');
  if (btn) { btn.textContent = 'Entrando...'; btn.disabled = true; }
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.style.display = 'none';

  if (await doLogin(userId, pass)) {
    history.replaceState({ view: 'home' }, '', '#/');
    renderHome();
    loadRemoteConfig().then(async () => {
      await loadWorkouts();
      await loadUserWorkouts(currentUserId);
      apiLoaded = true;
      renderHome();
    });
  } else {
    if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
    if (errorEl) errorEl.style.display = 'block';
  }
}

function getExercisesDB() {
  const base = typeof EXERCISES_DB !== 'undefined' ? EXERCISES_DB : [];
  const edits = remoteConfig.exerciseEdits || {};
  if (Object.keys(edits).length === 0) return base;
  return base.map(ex => {
    const e = edits[String(ex.id)];
    return e ? { ...ex, name: e.name || ex.name, muscle: e.muscle || ex.muscle } : ex;
  });
}

function getAllWorkouts() {
  const all = {};
  for (const gender of ['homem', 'mulher']) {
    const defaultDays = workouts[gender] || [];
    const customDays = customWorkouts[gender] || [];
    all[gender] = [...defaultDays, ...customDays];
  }
  return all;
}

function mergeWorkouts() {
  return getAllWorkouts();
}

function loadRestTime() {
  try {
    const saved = sGet('rest_time');
    if (saved !== null) REST_TIME = parseInt(saved, 10) || 90;
  } catch (e) {}
}

function saveRestTime(time) {
  try { sSet('rest_time', time); } catch (e) {}
  REST_TIME = time;
}

async function loadWorkouts() {
  const apiWorkouts = await apiGet('/workouts');
  if (apiWorkouts && apiWorkouts.homem && apiWorkouts.mulher) {
    workouts = apiWorkouts;
    return;
  }
  console.error('Não foi possível carregar treinos da API');
}

async function loadUserWorkouts(userId) {
  if (!authToken) {
    userWorkouts = {};
    return;
  }

  const data = await apiGet(`/user-workouts/${userId}`);
  if (data && Array.isArray(data)) {
    userWorkouts[userId] = data;
    return;
  }

  userWorkouts = {};
}

async function saveUserWorkouts(userId, days) {
  if (!authToken) return false;

  try {
    const result = await apiPut(`/user-workouts/${userId}`, days);
    if (result.error) {
      console.warn('API save user workouts error:', result.error);
      return false;
    }
    userWorkouts[userId] = days;
    return true;
  } catch (e) {
    console.warn('API save user workouts failed:', e);
    return false;
  }
}

function loadProgress(gender) {
  try {
    const saved = sGet(`progress_${gender}`);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function saveProgress(gender, progress) {
  try { sSet(`progress_${gender}`, JSON.stringify(progress)); } catch (e) {}
}

function loadExerciseStates(gender, workoutId) {
  try {
    const saved = sGet(`exercises_${gender}_${workoutId}`);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function saveExerciseStates(gender, workoutId, states) {
  try { sSet(`exercises_${gender}_${workoutId}`, JSON.stringify(states)); } catch (e) {}
}

async function loadHistory() {
  if (authToken && currentUserId) {
    const apiHistory = await apiGet(`/history/${currentUserId}`);
    if (apiHistory && Array.isArray(apiHistory)) return apiHistory;
  }
  return [];
}

async function saveHistory(history) {
  if (authToken && currentUserId) {
    const lastEntry = history[history.length - 1];
    if (lastEntry) {
      await apiPost('/history', {
        userId: currentUserId,
        workout: lastEntry.workout,
        date: lastEntry.date,
        exercises: lastEntry.exercises
      });
    }
  }
}

function loadCustomWorkouts() {
  try {
    const saved = sGet('custom_workouts');
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

async function saveCustomWorkouts(data) {
  if (authToken && currentUserIsAdmin) {
    const apiWorkouts = await apiGet('/workouts');
    if (apiWorkouts) {
      const merged = { ...apiWorkouts, ...data };
      await apiPut('/workouts', merged);
    }
  }
  customWorkouts = data;
}

function loadRestDayExercises(gender) {
  try {
    const saved = sGet(`restday_exercises_${gender}`);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function saveRestDayExercises(gender, data) {
  try { sSet(`restday_exercises_${gender}`, JSON.stringify(data)); } catch (e) {}
}

function isRestDayWithExercises(dayId, gender) {
  if (!gender) return false;
  const restData = loadRestDayExercises(gender);
  return restData[dayId] && restData[dayId].exercises && restData[dayId].exercises.length > 0;
}

function getRestDayWorkout(day) {
  const restData = loadRestDayExercises(currentGender);
  const saved = restData[day.id];
  if (saved && saved.exercises && saved.exercises.length > 0) {
    return {
      id: day.id,
      day: day.day,
      dayIndex: day.dayIndex,
      title: saved.title || 'Treino Livre',
      restDay: false,
      exercises: saved.exercises
    };
  }
  return {
    id: day.id,
    day: day.day,
    dayIndex: day.dayIndex,
    title: 'Treino Livre',
    restDay: false,
    exercises: []
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTodayIndex() {
  return new Date().getDay();
}

function getTodayWorkout() {
  const all = mergeWorkouts();
  const genderWorkouts = all[currentGender];
  if (!genderWorkouts) return null;
  const todayIdx = getTodayIndex();
  const todayWorkout = genderWorkouts.find(d => d.dayIndex === todayIdx && !d.restDay);
  if (todayWorkout) return todayWorkout;

  const restDay = genderWorkouts.find(d => d.dayIndex === todayIdx && d.restDay);
  if (restDay) {
    const restData = loadRestDayExercises(currentGender);
    const saved = restData[restDay.id];
    if (saved && saved.exercises && saved.exercises.length > 0) {
      return {
        id: restDay.id,
        day: restDay.day,
        dayIndex: restDay.dayIndex,
        title: saved.title || 'Treino Livre',
        restDay: false,
        exercises: saved.exercises
      };
    }
  }
  return null;
}

function getWeeklyStats() {
  if (!currentGender) return { completed: 0, total: 0, streak: 0 };
  const all = mergeWorkouts();
  const days = (all[currentGender] || []).filter(d => !d.restDay);
  const restDays = (all[currentGender] || []).filter(d => d.restDay);
  const restDayData = loadRestDayExercises(currentGender);
  const restDaysWithExercises = restDays.filter(d => restDayData[d.id] && restDayData[d.id].exercises && restDayData[d.id].exercises.length > 0);
  const allActiveDays = [...days, ...restDaysWithExercises];
  const progress = loadProgress(currentGender);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  let completedThisWeek = 0;
  allActiveDays.forEach(d => {
    if (progress[d.id]) {
      const saved = localStorage.getItem(storageKey(`workout_date_${currentGender}_${d.id}`));
      if (saved) {
        const date = new Date(saved);
        if (date >= startOfWeek) completedThisWeek++;
      }
    }
  });

  let streak = 0;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  for (let w = 0; w < 12; w++) {
    const wStart = new Date(weekStart);
    wStart.setDate(wStart.getDate() - (w * 7));
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);

    let weekComplete = true;
    allActiveDays.forEach(d => {
      if (progress[d.id]) {
        const saved = localStorage.getItem(storageKey(`workout_date_${currentGender}_${d.id}`));
        if (saved) {
          const date = new Date(saved);
          if (date >= wStart && date < wEnd) {}
          else if (!progress[d.id]) {}
          else { weekComplete = false; }
        } else if (!progress[d.id]) {
          weekComplete = false;
        }
      } else if (!progress[d.id]) {
        weekComplete = false;
      }
    });

    if (w === 0 && !weekComplete) continue;
    if (weekComplete) streak++;
    else break;
  }

  return { completed: completedThisWeek, total: allActiveDays.length, streak };
}

function buildUrl(view, gender, dayId) {
  if (view === 'home') return '#/';
  if (view === 'dayList') return `#/${gender}`;
  if (view === 'workout' && dayId) return `#/${gender}/${dayId}`;
  if (view === 'history') return `#/${gender}/history`;
  return '#/';
}

function navigate(view, data, pushState) {
  currentView = view;
  const dayId = data?.dayId || currentWorkout?.id;
  const url = buildUrl(view, currentGender, dayId);
  if (pushState !== false) {
    history.pushState({ view, data, gender: currentGender }, '', url);
  }
  renderView(view, data);
}

function renderView(view) {
  switch (view) {
    case 'login': renderLogin(); break;
    case 'home': renderHome(); break;
    case 'dayList': renderDayList(); break;
    case 'workout': renderWorkout(); break;
    case 'activeExercise': renderActiveExercise(); break;
    case 'library': renderLibrary(); break;
    case 'builder': renderBuilder(); break;
    case 'history': renderHistory(); break;
    case 'admin': renderAdmin(); break;
  }
}

function renderTabBar() {
  if (currentView === 'activeExercise') return '';
  if (currentUserIsAdmin) {
    return `
      <div class="tab-bar">
        <div class="tab-item ${currentTab === 'home' ? 'active' : ''}" onclick="switchTab('home')">
          <div class="icon">🏠</div>
          <span>Início</span>
        </div>
        <div class="tab-item ${currentTab === 'library' ? 'active' : ''}" onclick="switchTab('library')">
          <div class="icon">📚</div>
          <span>Biblioteca</span>
        </div>
        <div class="tab-item ${currentTab === 'builder' ? 'active' : ''}" onclick="switchTab('builder')">
          <div class="icon">🔧</div>
          <span>Criar</span>
        </div>
        <div class="tab-item ${currentTab === 'history' ? 'active' : ''}" onclick="switchTab('history')">
          <div class="icon">📋</div>
          <span>Histórico</span>
        </div>
      </div>
    `;
  }
  return `
    <div class="tab-bar">
      <div class="tab-item ${currentTab === 'history' ? 'active' : ''}" onclick="switchTab('history')">
        <div class="icon">📋</div>
        <span>Histórico</span>
      </div>
    </div>
  `;
}

function switchTab(tab) {
  if (timerInterval) clearInterval(timerInterval);
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  activeExercise = null;
  isResting = false;
  timer = 0;
  workoutStartTime = null;
  currentTab = tab;
  builderMultiMode = false;
  builderMultiPick = [];

  if (tab === 'home') {
    currentView = 'home';
    history.pushState({ view: 'home' }, '', '#/');
    renderHome();
  } else if (tab === 'library') {
    pickerMode = false;
    pickerCallback = null;
    currentView = 'library';
    history.pushState({ view: 'library' }, '', '#/library');
    renderLibrary();
  } else if (tab === 'builder') {
    currentView = 'builder';
    history.pushState({ view: 'builder' }, '', '#/builder');
    renderBuilder();
  } else if (tab === 'history') {
    currentView = 'history';
    if (!currentUserIsAdmin && currentGender) {
      history.pushState({ view: 'history', gender: currentGender }, '', `#/${currentGender}/history`);
    } else {
      history.pushState({ view: 'history' }, '', '#/history');
    }
    renderHistory();
  }
}

function renderHome() {
  currentTab = 'home';
  currentView = 'home';
  const stats = getWeeklyStats();
  const all = mergeWorkouts();
  const todayWorkout = getTodayWorkout();
  const customDays = (currentGender && customWorkouts[currentGender]) || [];

  if (!currentUserIsAdmin) {
    const userGender = currentGender || 'mulher';
    app.innerHTML = `
      ${renderTabBar()}
      <div class="screen home-user">
        <div class="user-home-topbar">
          <div class="user-home-name-top">${currentUserName}</div>
          <button class="user-header-logout" onclick="doLogout()">Sair</button>
        </div>
        <div class="home-title">ANTIGRAVITY</div>
        <button class="home-btn today-btn" onclick="selectGender('${userGender}')">INICIAR</button>
      </div>
    `;
    return;
  }

  let adminTodayBtn = '';
  if (todayWorkout) {
    adminTodayBtn = `
      <button class="home-btn today-btn" onclick="selectGender('${currentGender || 'homem'}'); setTimeout(() => selectDay('${todayWorkout.id}'), 10)">
        TREINO DE HOJE — ${todayWorkout.title}
      </button>
    `;
  }

  const statsHtml = currentGender ? `
    <div class="quick-stats">
      <div class="stat-bar">
        <div class="stat-label">Semana</div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${stats.total > 0 ? (stats.completed / stats.total * 100) : 0}%"></div>
        </div>
        <div class="stat-value">${stats.completed}/${stats.total}</div>
      </div>
      ${stats.streak > 0 ? `<div class="streak-badge">🔥 ${stats.streak} sem${stats.streak > 1 ? 's' : ''}</div>` : ''}
    </div>
  ` : '';

  let customSection = '';
  if (currentGender && customDays.length > 0) {
    const customCards = customDays.map(d => `
      <div class="day-card custom" onclick="selectDay('${d.id}')">
        <div class="day-header">
          <span class="day-name">${d.day}</span>
          <span class="custom-tag">⭐ PERSONALIZADO</span>
        </div>
        <div class="day-title">${d.title}</div>
        <div class="day-count">${d.exercises.length} exercícios</div>
      </div>
    `).join('');
    customSection = `
      <div class="section-title" style="margin-top: 20px; margin-bottom: 12px; color: var(--secondary); font-size: 0.8rem; font-weight: 700; letter-spacing: 1px;">TREINOS PERSONALIZADOS</div>
      ${customCards}
    `;
  }

  app.innerHTML = `
    ${renderTabBar()}
    <div class="screen home">
      <div class="home-title">ANTIGRAVITY</div>
      <div class="home-subtitle">Escolha seu treino</div>
      ${currentUserId ? `<div class="home-user-badge">${currentUserIsAdmin ? '👑' : '👤'} ${currentUserName} — Login: ${currentUserId} <span class="logout-link" onclick="doLogout()">sair</span></div>` : ''}
      ${adminTodayBtn}
      ${!currentUserIsAdmin ? `
        <button class="home-btn" onclick="selectGender('homem')">HOMEM</button>
        <button class="home-btn female" onclick="selectGender('mulher')">MULHER</button>
      ` : ''}
      ${statsHtml}
      ${customSection}
      ${currentUserIsAdmin ? `
        <div style="margin-top:24px;">
          <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;letter-spacing:1px;font-weight:700;">ADMIN</div>
          <button class="home-btn" style="background:#6c5ce7;font-size:0.85rem;" onclick="navigate('admin')">⚙️ Painel Admin</button>
          <button class="home-btn" style="background:#00b894;font-size:0.85rem;margin-top:8px;" onclick="saveAllConfig()">💾 Salvar dados na API</button>
        </div>
      ` : ''}
    </div>
  `;
}

function selectGender(gender) {
  currentGender = gender;
  exerciseStates = {};
  navigate('dayList');
}

function renderDayList() {
  const todayIdx = getTodayIndex();
  const stats = getWeeklyStats();
  const progress = loadProgress(currentGender);

  let userDays = [];
  if (!currentUserIsAdmin && currentUserId && userWorkouts[currentUserId]) {
    userDays = userWorkouts[currentUserId];
  }

  let html = `
    <div class="screen">
      <div class="day-list-header">
        <button class="btn-back-days" onclick="goHome()">← Voltar</button>
        <div class="day-list-title">${currentUserIsAdmin ? (currentGender === 'homem' ? 'HOMEM' : 'MULHER') : currentUserName}</div>
        ${currentUserIsAdmin ? `<button class="btn-history" onclick="showHistory()">Histórico</button>` : ''}
      </div>
  `;

  if (!currentUserIsAdmin) {
    WEEK_DAYS.forEach((dayKey, idx) => {
      const dayIndex = (idx + 1) % 7;
      const dayWorkout = userDays.find(d => d.dayIndex === dayIndex);
      const isToday = dayIndex === todayIdx;

      html += `
        <div class="week-day-row ${isToday ? 'today' : ''}" onclick="${dayWorkout && dayWorkout.exercises && dayWorkout.exercises.length > 0 ? `selectDay('${dayWorkout.id}')` : ''}">
          <div class="week-day-name">${WEEK_DAYS_DISPLAY[idx]}</div>
          <div class="week-day-info">
            ${dayWorkout && dayWorkout.exercises && dayWorkout.exercises.length > 0
              ? `<div class="week-day-workout">
                  <span class="week-day-workout-title">${dayWorkout.title}</span>
                  <span class="week-day-workout-exercises">${dayWorkout.exercises.length} ex.</span>
                  ${progress[dayWorkout.id] ? '<span class="week-day-done">✓</span>' : ''}
                </div>`
              : '<span class="week-day-rest">Descanso</span>'
            }
          </div>
          ${isToday ? '<span class="today-badge-sm">HOJE</span>' : ''}
        </div>
      `;
    });
  } else {
    const all = mergeWorkouts();
    const days = all[currentGender] || [];

    WEEK_DAYS.forEach((dayKey, idx) => {
      const dayIndex = (idx + 1) % 7;
      const dayWorkout = days.find(d => d.dayIndex === dayIndex && !d.restDay);
      const dayWorkouts = days.filter(d => d.dayIndex === dayIndex);
      const restDay = days.find(d => d.dayIndex === dayIndex && d.restDay);
      const isToday = dayIndex === todayIdx;
      const hasRestExercises = restDay && isRestDayWithExercises(restDay.id, currentGender);

      let onclickAttr = '';
      if (dayWorkout) {
        onclickAttr = `selectDay('${dayWorkout.id}')`;
      } else if (restDay) {
        onclickAttr = `selectRestDay('${restDay.id}')`;
      }

      html += `
        <div class="week-day-row ${isToday ? 'today' : ''} ${hasRestExercises ? 'has-exercises' : ''}" onclick="${onclickAttr}">
          <div class="week-day-name">${WEEK_DAYS_DISPLAY[idx]}</div>
          <div class="week-day-info">
            ${dayWorkouts.length > 0
              ? dayWorkouts.map(w => `
                <div class="week-day-workout">
                  <span class="week-day-workout-title">${w.title}</span>
                  <span class="week-day-workout-exercises">${w.exercises.length} ex.</span>
                  ${progress[w.id] ? '<span class="week-day-done">✓</span>' : ''}
                </div>
              `).join('')
              : hasRestExercises
                ? `<div class="week-day-workout">
                    <span class="week-day-workout-title">Treino Livre</span>
                    <span class="week-day-workout-exercises">${(loadRestDayExercises(currentGender)[restDay.id]?.exercises || []).length} ex.</span>
                  </div>`
                : '<span class="week-day-rest">Descanso</span>'
            }
          </div>
          ${isToday ? '<span class="today-badge-sm">HOJE</span>' : ''}
        </div>
      `;
    });

    const customDays = (currentGender && customWorkouts[currentGender]) || [];
    if (customDays.length > 0) {
      html += `<div class="section-label-custom">⭐ TREINOS PERSONALIZADOS</div>`;
      customDays.forEach(day => {
        html += renderDayCard(day, todayIdx, progress, true);
      });
    }
  }

  html += `</div>`;
  app.innerHTML = html;
}

function renderDayCard(day, todayIdx, progress, isCustom) {
  const completed = progress[day.id] === true;
  const isToday = day.dayIndex === todayIdx && !day.restDay;
  let cardClass = day.restDay ? 'day-card rest' : completed ? 'day-card completed' : 'day-card';
  if (isToday && !completed) cardClass += ' today';

  return `
    <div class="${cardClass}" ${!day.restDay ? `onclick="selectDay('${day.id}')"` : ''}>
      <div class="day-header">
        <span class="day-name">${day.day}</span>
        ${isCustom ? '<span class="custom-tag">⭐ PERSONALIZADO</span>' : ''}
        ${isToday && !completed ? '<span class="today-badge">HOJE</span>' : ''}
        ${completed ? '<span class="day-check">✓</span>' : ''}
      </div>
      <div class="day-title">${day.title}</div>
      ${!day.restDay ? `<div class="day-count">${day.exercises.length} exercícios</div>` : ''}
      ${isCustom ? `
        <div class="day-actions" onclick="event.stopPropagation()">
          <button class="day-action-btn" onclick="editCustomWorkout('${day.id}')">✏️</button>
          <button class="day-action-btn danger" onclick="deleteCustomWorkout('${day.id}')">🗑️</button>
        </div>
      ` : ''}
    </div>
  `;
}

function goHome() {
  if (timerInterval) clearInterval(timerInterval);
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  activeExercise = null;
  isResting = false;
  workoutStartTime = null;
  currentTab = 'home';
  builderMultiMode = false;
  builderMultiPick = [];
  navigate('home');
}

function selectDay(dayId) {
  if (!currentUserIsAdmin && currentUserId && userWorkouts[currentUserId]) {
    currentWorkout = userWorkouts[currentUserId].find(d => d.id === dayId);
  }
  if (!currentWorkout) {
    const all = mergeWorkouts();
    currentWorkout = (all[currentGender] || []).find(d => d.id === dayId);
  }
  if (!currentWorkout) return;
  exerciseStates = loadExerciseStates(currentGender, dayId);
  activeExercise = null;
  workoutStartTime = null;
  navigate('workout', { dayId });
}

function selectRestDay(dayId) {
  const all = mergeWorkouts();
  const restDayDef = (all[currentGender] || []).find(d => d.id === dayId);
  if (!restDayDef) return;

  const restData = loadRestDayExercises(currentGender);
  const saved = restData[dayId];

  currentWorkout = {
    id: dayId,
    day: restDayDef.day,
    dayIndex: restDayDef.dayIndex,
    title: (saved && saved.title) || 'Treino Livre',
    restDay: false,
    exercises: (saved && saved.exercises) || []
  };

  exerciseStates = loadExerciseStates(currentGender, dayId);
  activeExercise = null;
  workoutStartTime = null;
  navigate('workout', { dayId });
}

function saveRestDayWorkout() {
  if (!currentWorkout || !currentGender) return;
  const restData = loadRestDayExercises(currentGender);
  restData[currentWorkout.id] = {
    title: currentWorkout.title,
    exercises: currentWorkout.exercises
  };
  saveRestDayExercises(currentGender, restData);
}

function resetRestDayProgress(dayId) {
  const restData = loadRestDayExercises(currentGender);
  delete restData[dayId];
  saveRestDayExercises(currentGender, restData);
  try {
    localStorage.removeItem(storageKey(`exercises_${currentGender}_${dayId}`));
    localStorage.removeItem(storageKey(`workout_date_${currentGender}_${dayId}`));
  } catch (e) {}
}

function resetRestDay() {
  if (!currentWorkout) return;
  if (!confirm(`Limpar todos os exercícios de ${currentWorkout.day}?`)) return;
  resetRestDayProgress(currentWorkout.id);
  exerciseStates = {};
  navigate('workout', { dayId: currentWorkout.id });
}

function renderWorkout() {
  if (!currentWorkout) { goHome(); return; }

  let html = `
    <div class="screen">
      <div class="workout-header">
        <button class="btn-back-days" onclick="goDayList()">← Voltar</button>
        <div class="workout-title-row">
          <div class="workout-title">${currentWorkout.title}</div>
          <div class="workout-day">${currentWorkout.day}</div>
        </div>
        <button class="share-btn" onclick="shareWorkout(currentWorkout)">📤</button>
      </div>
  `;

  currentWorkout.exercises.forEach((ex, idx) => {
    const state = exerciseStates[ex.id] || {};
    const completed = state.completed === true;
    const completedSets = state.completedSets || 0;
    const lastWeight = state.lastWeight || '';
    const gif = getWorkoutExerciseGif(ex);

    html += `
      <div class="exercise-card ${completed ? 'completed' : ''}" onclick="startExercise('${ex.id}')">
        <div class="exercise-row">
          <img class="exercise-thumb-lg" src="${gif}" alt="${ex.name}" onerror="this.style.display='none'">
          <div class="exercise-info">
            <div class="exercise-name ${completed ? 'done' : ''}">${ex.name}</div>
            ${ex.muscle ? `<div class="exercise-muscle">${ex.muscle}</div>` : ''}
            <div class="exercise-details">${ex.sets}x ${ex.reps}${lastWeight ? ` • ${lastWeight}kg` : ''}</div>
            ${!completed && completedSets > 0 ? `<div class="exercise-progress">Séries: ${completedSets}/${ex.sets}</div>` : ''}
          </div>
          ${currentUserIsAdmin ? `
          <button class="exercise-edit-btn" onclick="event.stopPropagation(); swapExercise(${idx})">🔄</button>
          <button class="exercise-remove-btn" onclick="event.stopPropagation(); removeExerciseFromWorkout(${idx})">✕</button>
          ` : ''}
          ${completed ? '<span class="exercise-check done">✓</span>' : '<span class="exercise-check">›</span>'}
        </div>
      </div>
    `;
  });

  if (currentWorkout.exercises.length === 0) {
    html += `
      <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:12px;opacity:0.4;">🏋️</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:4px;">Nenhum exercício ainda</div>
        <div style="font-size:0.85rem;">Adicione exercícios para montar seu treino</div>
      </div>
    `;
  }

  const isRestDayWorkout = (all => {
    const day = (all[currentGender] || []).find(d => d.id === currentWorkout.id);
    return day && day.restDay;
  })(mergeWorkouts());

  html += `
    <div class="workout-bottom-bar">
      <div class="btn-row" style="justify-content: center; margin: 0;">
        <button class="btn-back-days" onclick="goDayList()">← Voltar</button>
        ${currentUserIsAdmin ? (
          isRestDayWorkout && currentWorkout.exercises.length > 0
            ? `<button class="btn-reset" onclick="resetRestDay()">Limpar Treino</button>`
            : `<button class="btn-reset" onclick="resetProgress()">Zerar Treinos</button>`
        ) : ''}
      </div>
      ${currentUserIsAdmin ? `
      <div class="btn-row" style="justify-content: center; margin-top: 8px;">
        <button class="btn-reset" style="background:var(--accent);" onclick="openAddToWorkoutPicker()">+ Adicionar Exercício</button>
      </div>
      ` : ''}
    </div>
  </div>`;
  app.innerHTML = html;
}

function goDayList() {
  if (timerInterval) clearInterval(timerInterval);
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  activeExercise = null;
  isResting = false;
  workoutStartTime = null;
  navigate('dayList');
}

function swapExercise(idx) {
  if (!currentWorkout) return;
  swappingExerciseIdx = idx;
  addingToWorkout = false;
  openExercisePicker();
}

function removeExerciseFromWorkout(idx) {
  if (!currentWorkout) return;
  const ex = currentWorkout.exercises[idx];
  if (!ex) return;
  if (!confirm(`Remover "${ex.name}" do treino?`)) return;
  currentWorkout.exercises.splice(idx, 1);
  delete exerciseStates[ex.id];
  saveExerciseStates(currentGender, currentWorkout.id, exerciseStates);
  saveWorkoutToStorage();
  renderWorkout();
}

function saveWorkoutToStorage() {
  if (!currentWorkout || !currentGender) return;
  const isCustom = currentWorkout.id.startsWith('cw_');
  if (isCustom) {
    const customDays = customWorkouts[currentGender] || [];
    const wIdx = customDays.findIndex(d => d.id === currentWorkout.id);
    if (wIdx >= 0) {
      customWorkouts[currentGender][wIdx] = currentWorkout;
      saveCustomWorkouts(customWorkouts);
    }
  } else {
    const all = mergeWorkouts();
    const defaultDay = (all[currentGender] || []).find(d => d.id === currentWorkout.id);
    if (defaultDay && defaultDay.restDay) {
      saveRestDayWorkout();
    } else {
      const defaultDays = workouts[currentGender] || [];
      const wIdx = defaultDays.findIndex(d => d.id === currentWorkout.id);
      if (wIdx >= 0) {
        workouts[currentGender][wIdx] = currentWorkout;
        try { localStorage.setItem(storageKey('workouts_override'), JSON.stringify(workouts)); } catch (e) {}
      }
    }
  }
}

function openAddToWorkoutPicker() {
  addingToWorkout = true;
  openExercisePicker();
}

function addExerciseToCurrentWorkout(exerciseId) {
  const db = getExercisesDB();
  const ex = db.find(e => e.id === exerciseId);
  if (!ex || !currentWorkout) return;
  currentWorkout.exercises.push({
    id: `custom_${Date.now()}`,
    name: ex.name,
    sets: 3,
    reps: '10',
    image: `${ex.gif}.gif`,
    muscle: ex.muscle,
    tips: ''
  });
  saveWorkoutToStorage();
  addingToWorkout = false;
  closePicker();
  renderWorkout();
}

function startExercise(exerciseId) {
  const ex = currentWorkout.exercises.find(e => e.id === exerciseId);
  if (!ex) return;
  activeExercise = ex;
  const state = exerciseStates[activeExercise.id] || {};
  currentSet = state.completedSets || 0;
  isResting = false;
  timer = 0;
  currentWeight = state.lastWeight || '';
  exerciseStartTime = Date.now();
  if (timerInterval) clearInterval(timerInterval);

  if (!workoutStartTime) {
    workoutStartTime = Date.now();
    startDurationTimer();
  }

  navigate('activeExercise');
}

function startDurationTimer() {
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  workoutDurationInterval = setInterval(() => {
    const el = document.getElementById('workout-duration');
    if (el && workoutStartTime) {
      el.textContent = formatDuration(Date.now() - workoutStartTime);
    }
  }, 1000);
}

function getExerciseElapsed() {
  if (!exerciseStartTime) return '00:00';
  return formatDuration(Date.now() - exerciseStartTime);
}

function renderActiveExercise() {
  if (!activeExercise) return;
  const state = exerciseStates[activeExercise.id] || {};
  const lastWeight = state.lastWeight || '';
  const elapsed = workoutStartTime ? formatDuration(Date.now() - workoutStartTime) : '';
  const exerciseElapsed = getExerciseElapsed();
  const gif = getWorkoutExerciseGif(activeExercise);

  if (isResting) {
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - timer / REST_TIME);

    app.innerHTML = `
      <div class="screen csa-exercise">
        <div class="csa-header">
          <button class="csa-back" onclick="cancelTimer()">←</button>
          <div class="csa-title">Execução</div>
          <div class="csa-timer" id="workout-duration">${exerciseElapsed}</div>
        </div>
        <div class="csa-card">
          <div class="csa-exercise-name">${activeExercise.name}</div>
          ${activeExercise.muscle ? `<div class="csa-muscle-badge">${activeExercise.muscle}</div>` : ''}
          <div class="csa-stats-row">
            <span>Séries: ${activeExercise.sets}</span>
            <span>Descanso: ${REST_TIME}s</span>
          </div>
          <img class="csa-exercise-image" src="${gif}" alt="${activeExercise.name}" onerror="this.style.display='none'">
          <div class="csa-reps-info">
            <div class="csa-reps-count">${activeExercise.reps}</div>
            <div class="csa-reps-label">Repetições</div>
          </div>
          <div class="csa-set-indicators">
            ${Array.from({length: activeExercise.sets}, (_, i) => {
              const setDone = i < currentSet;
              const setDoing = i === currentSet;
              return `<div class="csa-set-dot ${setDone ? 'done' : ''} ${setDoing ? 'active' : ''}">${setDone ? '✓' : (i + 1)}</div>`;
            }).join('')}
          </div>
        </div>
        <div class="csa-rest-timer">
          <div class="csa-rest-circle">
            <svg viewBox="0 0 200 200">
              <circle class="csa-rest-track" cx="100" cy="100" r="90"/>
              <circle class="csa-rest-progress" cx="100" cy="100" r="90"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"/>
            </svg>
            <div class="csa-rest-text">${formatTime(timer)}</div>
          </div>
          <div class="csa-rest-hint">Prepare-se para a próxima série</div>
        </div>
        <div class="csa-bottom-nav">
          <button class="csa-nav-arrow" onclick="cancelTimer()">←</button>
          <button class="csa-check-btn rest-mode" onclick="cancelTimer()">
            <span>Cancelar</span>
          </button>
          <div class="csa-nav-arrow"></div>
        </div>
      </div>
    `;
  } else {
    app.innerHTML = `
      <div class="screen csa-exercise">
        <div class="csa-header">
          <button class="csa-back" onclick="cancelExercise()">←</button>
          <div class="csa-title">Execução</div>
          <div class="csa-timer" id="workout-duration">${exerciseElapsed}</div>
        </div>
        <div class="csa-card">
          <div class="csa-exercise-name">${activeExercise.name}</div>
          ${activeExercise.muscle ? `<div class="csa-muscle-badge">${activeExercise.muscle}</div>` : ''}
          <div class="csa-stats-row">
            <span>Séries: ${activeExercise.sets}</span>
            <span>Descanso: ${REST_TIME}s</span>
          </div>
          <img class="csa-exercise-image" src="${gif}" alt="${activeExercise.name}" onerror="this.style.display='none'">
          <div class="csa-reps-info">
            <div class="csa-reps-count">${activeExercise.reps}</div>
            <div class="csa-reps-label">Repetições</div>
          </div>
          <div class="csa-set-indicators">
            ${Array.from({length: activeExercise.sets}, (_, i) => {
              const setDone = i < currentSet;
              const setDoing = i === currentSet;
              return `<div class="csa-set-dot ${setDone ? 'done' : ''} ${setDoing ? 'active' : ''}">${setDone ? '✓' : (i + 1)}</div>`;
            }).join('')}
          </div>
          <div class="csa-weight-section">
            <div class="csa-weight-label">Carga</div>
            <div class="csa-weight-row">
              <button class="csa-weight-btn" onclick="adjustWeight(-2.5)">−</button>
              <input type="number" class="csa-weight-field" id="weightInput" value="${currentWeight}" placeholder="0" step="0.5" min="0" onchange="updateWeight(this.value)" oninput="updateWeight(this.value)">
              <button class="csa-weight-btn" onclick="adjustWeight(2.5)">+</button>
              <span class="csa-weight-unit">kg</span>
            </div>
          </div>
        </div>
        ${activeExercise.tips ? `<div class="csa-tips">💡 ${activeExercise.tips}</div>` : ''}
        <button class="csa-settings-btn" onclick="showRestTimeSettings()">⚙️ Alterar descanso</button>
        <div class="csa-bottom-nav">
          <button class="csa-nav-arrow" onclick="cancelExercise()">←</button>
          <button class="csa-check-btn" onclick="completeSet()">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Realizado</span>
          </button>
          <div class="csa-nav-arrow"></div>
        </div>
      </div>
    `;
  }
}

function adjustWeight(delta) {
  const input = document.getElementById('weightInput');
  if (!input) return;
  let val = parseFloat(input.value) || 0;
  val = Math.max(0, val + delta);
  input.value = val;
  currentWeight = val;
}

function setWeight(val) {
  currentWeight = val;
  renderActiveExercise();
}

function updateWeight(val) {
  currentWeight = val;
}

function updateTimerDisplay() {
  const circumference = 2 * Math.PI * 90;
  const offset = circumference * (1 - timer / REST_TIME);
  const timeText = document.querySelector('.csa-rest-text');
  const progressCircle = document.querySelector('.csa-rest-progress');
  if (timeText) timeText.textContent = formatTime(timer);
  if (progressCircle) progressCircle.setAttribute('stroke-dashoffset', offset);
}

function cancelTimer() {
  if (timerInterval) clearInterval(timerInterval);
  isResting = false;
  timer = 0;
  renderActiveExercise();
}

function cancelExercise() {
  if (timerInterval) clearInterval(timerInterval);
  activeExercise = null;
  isResting = false;
  timer = 0;
  exerciseStartTime = null;
  navigate('workout', { dayId: currentWorkout?.id });
}

function completeSet() {
  const nextSet = currentSet + 1;
  const totalSets = activeExercise.sets;
  const weightVal = currentWeight !== '' ? parseFloat(currentWeight) : null;

  if (nextSet >= totalSets) {
    const setState = { completed: true, completedSets: totalSets };
    if (weightVal !== null) setState.lastWeight = weightVal;
    exerciseStates[activeExercise.id] = setState;
    saveExerciseStates(currentGender, currentWorkout.id, exerciseStates);
    activeExercise = null;
    currentSet = 0;
    exerciseStartTime = null;
    checkAllCompleted();
  } else {
    const setState = { completed: false, completedSets: nextSet };
    if (weightVal !== null) setState.lastWeight = weightVal;
    exerciseStates[activeExercise.id] = setState;
    saveExerciseStates(currentGender, currentWorkout.id, exerciseStates);
    currentSet = nextSet;
    timer = REST_TIME;
    isResting = true;
    startTimer();
  }
}

function startTimer() {
  renderActiveExercise();
  timerInterval = setInterval(() => {
    timer--;
    if (timer <= 0) {
      clearInterval(timerInterval);
      isResting = false;
      timer = 0;
      playTimerSound();
      vibratePhone();
      renderActiveExercise();
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function playTimerSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

function vibratePhone() {
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch (e) {}
}

function checkAllCompleted() {
  const allDone = currentWorkout.exercises.every(ex => {
    const state = exerciseStates[ex.id];
    return state && state.completed === true;
  });

  if (allDone) {
    const progress = loadProgress(currentGender);
    progress[currentWorkout.id] = true;
    saveProgress(currentGender, progress);

    try { localStorage.setItem(storageKey(`workout_date_${currentGender}_${currentWorkout.id}`), new Date().toISOString()); } catch (e) {}

    const duration = workoutStartTime ? Date.now() - workoutStartTime : 0;
    const history = loadHistory();
    history.unshift({
      workoutId: currentWorkout.id,
      gender: currentGender,
      day: currentWorkout.day,
      title: currentWorkout.title,
      date: new Date().toISOString(),
      duration: duration,
      exercises: currentWorkout.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        weight: exerciseStates[ex.id]?.lastWeight || null,
      })),
    });
    saveHistory(history);

    if (workoutDurationInterval) clearInterval(workoutDurationInterval);
    showCompletionModal(duration);
    return;
  }

  navigate('workout', { dayId: currentWorkout.id });
}

function showCompletionModal(duration) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  overlay.innerHTML = `
    <div class="modal completion-modal">
      <div class="completion-icon">🎉</div>
      <div class="completion-text">Parabéns!</div>
      <div class="completion-text" style="font-size:0.9rem;font-weight:400;color:var(--text-secondary)">Você concluiu todos os exercícios de hoje!</div>
      ${duration ? `<div class="completion-duration">Tempo total: ${formatDuration(duration)}</div>` : ''}
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove(); goDayList();">Continuar</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showHistory() {
  currentTab = 'history';
  navigate('history');
}

function renderHistory() {
  currentTab = 'history';
  currentView = 'history';
  const history = loadHistory();
  const genderHistory = currentGender ? history.filter(h => h.gender === currentGender) : history;

  let html = `
    ${renderTabBar()}
    <div class="screen">
      <div class="day-list-header">
        <button class="btn-back-days" onclick="goHome()">← Voltar</button>
        <div class="day-list-title">Histórico</div>
        <div></div>
      </div>
  `;

  if (genderHistory.length === 0) {
    html += `
      <div class="history-empty">
        <div class="empty-icon">📋</div>
        <p>Nenhum treino registrado ainda</p>
        <p style="font-size:0.75rem;color:var(--text-muted)">Complete um treino para vê-lo aqui</p>
      </div>
    `;
  } else {
    genderHistory.forEach(entry => {
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      html += `
        <div class="history-card">
          <div class="history-header">
            <div class="history-day">${entry.day} — ${entry.title}</div>
            <div class="history-date">${dateStr} ${timeStr}</div>
          </div>
          <div class="history-exercises">
            ${entry.exercises.map(ex => `
              <div class="history-exercise">
                <span class="history-ex-name">${ex.name}</span>
                ${ex.weight ? `<span class="history-ex-weight">${ex.weight}kg</span>` : ''}
              </div>
            `).join('')}
          </div>
          ${entry.duration ? `<div class="history-duration">⏱ ${formatDuration(entry.duration)}</div>` : ''}
        </div>
      `;
    });
  }

  html += `</div>`;
  app.innerHTML = html;
}

function resetProgress() {
  const all = mergeWorkouts();
  const days = all[currentGender] || [];
  const progress = loadProgress(currentGender);

  let html = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal">
        <div class="modal-title">Zerar Treino</div>
  `;

  days.forEach(day => {
    if (day.restDay) return;
    const completed = progress[day.id] === true;
    html += `
      <div class="modal-day ${completed ? 'done' : ''}" onclick="resetDay('${day.id}')">
        <div class="day-name">${day.day}</div>
        <div class="day-title">${day.title}</div>
        ${completed ? '<div class="done-label">✓ Concluído</div>' : ''}
      </div>
    `;
  });

  html += `
        <button class="modal-close" onclick="closeModal()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

function closeModal(e) {
  if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
}

function resetDay(dayId) {
  const all = mergeWorkouts();
  const day = (all[currentGender] || []).find(d => d.id === dayId);
  if (!day) return;
  if (!confirm(`Zerar o treino de ${day.day} - ${day.title}?`)) return;

  const progress = loadProgress(currentGender);
  delete progress[dayId];
  saveProgress(currentGender, progress);

  if (day.restDay) {
    resetRestDayProgress(dayId);
  }

  try {
    localStorage.removeItem(storageKey(`exercises_${currentGender}_${dayId}`));
    localStorage.removeItem(storageKey(`workout_date_${currentGender}_${dayId}`));
  } catch (e) {}

  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();

  navigate('workout', { dayId: currentWorkout?.id });
}

/* ======================== */
/* LIBRARY                  */
/* ======================== */

function renderLibrary() {
  currentView = 'library';
  const db = getExercisesDB();
  const query = librarySearchQuery.toLowerCase();
  const filter = libraryActiveFilter;

  let filtered = db;
  if (query) {
    filtered = filtered.filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      ex.muscle.toLowerCase().includes(query) ||
      ex.category.toLowerCase().includes(query)
    );
  }
  if (filter !== 'Todos') {
    filtered = filtered.filter(ex => ex.muscle === filter || ex.category === filter);
  }

  const displayItems = filtered.slice(0, libraryDisplayCount);

  const filtersHtml = MUSCLE_FILTERS.map(f =>
    `<button class="filter-chip ${f === libraryActiveFilter ? 'active' : ''}" onclick="setLibraryFilter('${f}')">${f}</button>`
  ).join('');

  const cardsHtml = displayItems.map(ex => {
    const gif = getExerciseGifPath(ex);
    const onclick = pickerMode
      ? `addExerciseFromPicker(${ex.id})`
      : `showExerciseDetail(${ex.id})`;
    return `
      <div class="library-card" onclick="${onclick}">
        <img class="library-card-gif" src="${gif}" alt="${ex.name}" onerror="this.style.display='none'" loading="lazy">
        <div class="library-card-name">${ex.name}</div>
        <div class="library-card-muscle">${ex.muscle}</div>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    ${pickerMode ? `<div class="screen library-screen">
      <div class="day-list-header" style="margin-bottom: 16px;">
        <button class="btn-back-days" onclick="closePicker()">← Fechar</button>
        <div class="day-list-title">Selecionar Treinos (${builderMultiPick.length})</div>
        <div></div>
      </div>` : `<div class="screen library-screen">`}
      <div class="library-search-wrapper">
        <span class="library-search-icon">🔍</span>
        <input class="library-search" type="text" placeholder="Buscar exercício..." value="${librarySearchQuery}" oninput="onLibrarySearch(this.value)">
      </div>
      <div class="filters-container">
        <button class="filters-arrow filters-arrow-left" onclick="scrollFilters('library-filters', -1)">‹</button>
        <div id="library-filters" class="library-filters scroll-x">${filtersHtml}</div>
        <button class="filters-arrow filters-arrow-right" onclick="scrollFilters('library-filters', 1)">›</button>
      </div>
      <div id="library-count" style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;">${filtered.length} exercício${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''} — toque para selecionar</div>
      <div id="library-grid" class="library-grid">${cardsHtml}</div>
      <div id="library-load-more" style="text-align:center;padding:20px;${filtered.length > libraryDisplayCount ? '' : 'display:none;'}"><button class="btn-back-days" onclick="loadMoreLibrary()">Carregar mais</button></div>
      ${pickerMode ? '' : renderTabBar()}
    </div>
  `;

  if (libraryScrollListener) {
    window.removeEventListener('scroll', libraryScrollListener);
  }
  libraryScrollListener = () => {
    if (currentView !== 'library' || pickerMode) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
      if (libraryDisplayCount < filtered.length) {
        libraryDisplayCount += 30;
        renderLibrary();
      }
    }
  };
  window.addEventListener('scroll', libraryScrollListener);
}

function onLibrarySearch(value) {
  librarySearchQuery = value;
  libraryDisplayCount = 30;
  updateLibraryResults();
}

function updateLibraryResults() {
  const db = getExercisesDB();
  const query = librarySearchQuery.toLowerCase();
  const filter = libraryActiveFilter;

  let filtered = db;
  if (query) {
    filtered = filtered.filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      ex.muscle.toLowerCase().includes(query) ||
      ex.category.toLowerCase().includes(query)
    );
  }
  if (filter !== 'Todos') {
    filtered = filtered.filter(ex => ex.muscle === filter || ex.category === filter);
  }

  const displayItems = filtered.slice(0, libraryDisplayCount);

  const cardsHtml = displayItems.map(ex => {
    const gif = getExerciseGifPath(ex);
    const onclick = pickerMode
      ? `addExerciseFromPicker(${ex.id})`
      : `showExerciseDetail(${ex.id})`;
    return `
      <div class="library-card" onclick="${onclick}">
        <img class="library-card-gif" src="${gif}" alt="${ex.name}" onerror="this.style.display='none'" loading="lazy">
        <div class="library-card-name">${ex.name}</div>
        <div class="library-card-muscle">${ex.muscle}</div>
      </div>
    `;
  }).join('');

  const countEl = document.getElementById('library-count');
  const gridEl = document.getElementById('library-grid');
  const loadMoreEl = document.getElementById('library-load-more');

  if (countEl) {
    countEl.textContent = `${filtered.length} exercício${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''} — toque para selecionar`;
  }

  if (gridEl) {
    gridEl.innerHTML = cardsHtml;
  }

  if (loadMoreEl) {
    loadMoreEl.style.display = filtered.length > libraryDisplayCount ? 'block' : 'none';
  }
}

function setLibraryFilter(filter) {
  libraryActiveFilter = filter;
  libraryDisplayCount = 30;
  if (pickerMode) {
    updateLibraryResults();
    updateFilterButtons();
  } else {
    renderLibrary();
  }
}

function updateFilterButtons() {
  const filtersHtml = MUSCLE_FILTERS.map(f =>
    `<button class="filter-chip ${f === libraryActiveFilter ? 'active' : ''}" onclick="setLibraryFilter('${f}')">${f}</button>`
  ).join('');
  const filtersEl = document.getElementById('library-filters');
  if (filtersEl) {
    filtersEl.innerHTML = filtersHtml;
  }
}

function scrollFilters(containerId, direction) {
  const el = document.getElementById(containerId);
  if (el) {
    el.scrollBy({ left: direction * 150, behavior: 'smooth' });
  }
}

function loadMoreLibrary() {
  libraryDisplayCount += 30;
  updateLibraryResults();
}

function showExerciseDetail(exerciseId) {
  const db = getExercisesDB();
  const ex = db.find(e => e.id === exerciseId);
  if (!ex) return;
  const gif = getExerciseGifPath(ex);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <img src="${gif}" alt="${ex.name}" style="width:100%;border-radius:12px;margin-bottom:16px;aspect-ratio:1;object-fit:cover;" onerror="this.style.display='none'">
      <div class="modal-title" style="font-size:1.1rem;margin-bottom:4px;">${ex.name}</div>
      <div style="margin-bottom:4px;">
        <span class="exercise-muscle">${ex.muscle}</span>
        <span class="exercise-muscle" style="margin-left:6px;">${ex.category}</span>
      </div>
      <button class="modal-close" style="margin-top:16px;" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

/* ======================== */
/* WORKOUT BUILDER          */
/* ======================== */

function renderBuilder() {
  currentView = 'builder';
  if (builderMultiMode) {
    renderBuilderMultiPicker();
    return;
  }
  if (pickerMode) {
    renderLibrary();
    return;
  }

  if (builderTargetUser && builderSelectedDay) {
    renderBuilderDayExercises();
    return;
  }

  if (builderTargetUser) {
    renderBuilderUserDays();
    return;
  }

  app.innerHTML = `
    ${renderTabBar()}
    <div class="screen builder-screen">
      <div class="builder-header">
        <h2>Criar Treino</h2>
        <p>Digite o número do aluno para gerenciar treinos</p>
      </div>
      <div class="builder-user-search">
        <input class="builder-name-input" type="number" id="builder-user-input" placeholder="Número do aluno" inputmode="numeric" onkeydown="if(event.key==='Enter')loadBuilderUser()">
        <button class="builder-search-btn" onclick="loadBuilderUser()">Buscar</button>
      </div>
      <div id="builder-user-result"></div>
    </div>
  `;
}

function loadBuilderUser() {
  const input = document.getElementById('builder-user-input');
  if (!input) return;
  const uid = parseInt(input.value, 10);
  if (!uid) return;

  const user = remoteConfig.users.find(u => u.id === uid);
  const resultEl = document.getElementById('builder-user-result');
  if (!resultEl) return;

  if (!user) {
    resultEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);">Usuário #${uid} não encontrado</div>`;
    return;
  }

  builderTargetUserId = uid;
  builderTargetUser = user;
  builderSelectedDay = null;
  renderBuilderUserDays();
}

function renderBuilderUserDays() {
  const user = builderTargetUser;
  if (!user) { renderBuilder(); return; }

  const gender = user.gender || 'mulher';
  const userDays = userWorkouts[user.id] || [];

  app.innerHTML = `
    ${renderTabBar()}
    <div class="screen builder-screen">
      <div class="builder-header">
        <h2>${user.name}</h2>
        <button class="btn-back-days" onclick="builderTargetUserId = null; builderTargetUser = null; builderSelectedDay = null; renderBuilder();">← Voltar</button>
        <p>Aluno #${user.id} — ${gender === 'homem' ? 'Homem' : 'Mulher'}</p>
      </div>
      <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;letter-spacing:1px;font-weight:700;">DIAS DA SEMANA</div>
      ${WEEK_DAYS_DISPLAY.map((day, idx) => {
        const dayIndex = (idx + 1) % 7;
        const dayWorkout = userDays.find(d => d.dayIndex === dayIndex);
        const exCount = dayWorkout && dayWorkout.exercises ? dayWorkout.exercises.length : 0;
        return `
          <div class="week-day-row" onclick="selectBuilderDay(${dayIndex}, '${day}')">
            <div class="week-day-name">${day}</div>
            <div class="week-day-info">
              ${dayWorkout && exCount > 0
                ? `<div class="week-day-workout">
                    <span class="week-day-workout-title">${dayWorkout.title}</span>
                    <span class="week-day-workout-exercises">${exCount} ex.</span>
                  </div>`
                : '<span class="week-day-rest">Adicionar</span>'
              }
            </div>
            <span class="exercise-check">›</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function selectBuilderDay(dayIndex, dayName) {
  builderSelectedDay = { dayIndex, dayName };
  renderBuilderDayExercises();
}

function renderBuilderDayExercises() {
  const user = builderTargetUser;
  const day = builderSelectedDay;
  if (!user || !day) { renderBuilder(); return; }

  const userDays = userWorkouts[user.id] || [];
  const dayWorkout = userDays.find(d => d.dayIndex === day.dayIndex);

  const exercises = dayWorkout && dayWorkout.exercises ? dayWorkout.exercises : [];

  app.innerHTML = `
    ${renderTabBar()}
    <div class="screen builder-screen">
      <div class="builder-header">
        <h2>${user.name}</h2>
        <button class="btn-back-days" onclick="builderSelectedDay = null; renderBuilderUserDays();">← Voltar</button>
        <p>${day.dayName}</p>
      </div>
      ${exercises.length > 0 ? `
        <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;letter-spacing:1px;font-weight:700;">EXERCÍCIOS (${exercises.length})</div>
        ${exercises.map((ex, i) => {
          const dbEx = typeof EXERCISES_DB !== 'undefined' ? EXERCISES_DB.find(e => e.id === ex.id || e.name === ex.name) : null;
          const gif = dbEx ? getExerciseGifPath(dbEx) : '';
          return `
            <div class="builder-exercise-item">
              <img class="exercise-thumb" src="${gif}" alt="${ex.name}" onerror="this.style.display='none'">
              <div class="builder-exercise-info">
                <div class="name">${ex.name}</div>
                <div class="muscle">${ex.muscle || ''}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">${ex.sets}x ${ex.reps}</div>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="builder-action-btn swap" onclick="swapBuilderExerciseFromDay(${i})">🔄</button>
                <button class="builder-action-btn delete" onclick="removeBuilderExerciseFromDay(${i})">✕</button>
              </div>
            </div>
          `;
        }).join('')}
      ` : `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:12px;opacity:0.4;">🏋️</div>
          <div style="font-size:1rem;font-weight:600;margin-bottom:4px;">Nenhum exercício</div>
          <div style="font-size:0.85rem;">Adicione exercícios para este dia</div>
        </div>
      `}
      <button class="builder-add-btn" onclick="openBuilderMultiPicker()" style="margin-top:16px;">+ Adicionar Treino</button>
    </div>
  `;
}

function openBuilderMultiPicker() {
  builderMultiPick = [];
  builderMultiMode = true;
  pickerMode = true;
  pickerOrigin = 'builder';
  librarySearchQuery = '';
  libraryActiveFilter = 'Todos';
  libraryDisplayCount = 50;
  renderBuilderMultiPicker();
}

function renderBuilderMultiPicker() {
  const db = getExercisesDB();
  const query = librarySearchQuery.toLowerCase();
  const filter = libraryActiveFilter;

  let filtered = db;
  if (query) {
    filtered = filtered.filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      ex.muscle.toLowerCase().includes(query) ||
      ex.category.toLowerCase().includes(query)
    );
  }
  if (filter !== 'Todos') {
    filtered = filtered.filter(ex => ex.muscle === filter || ex.category === filter);
  }

  const displayItems = filtered.slice(0, libraryDisplayCount);

  const filtersHtml = MUSCLE_FILTERS.map(f =>
    `<button class="filter-chip ${f === libraryActiveFilter ? 'active' : ''}" onclick="setBuilderMultiFilter('${f}')">${f}</button>`
  ).join('');

  const cardsHtml = displayItems.map(ex => {
    const gif = getExerciseGifPath(ex);
    const checked = builderMultiPick.includes(ex.id);
    const idArg = typeof ex.id === 'string' ? "'" + ex.id + "'" : ex.id;
    return `
      <div class="library-card ${checked ? 'picked' : ''}" data-ex-id="${ex.id}" onclick="toggleBuilderPick(${idArg})" style="position:relative;">
        <div class="builder-pick-check">${checked ? '✓' : ''}</div>
        <img class="library-card-gif" src="${gif}" alt="${ex.name}" onerror="this.style.display='none'" loading="lazy">
        <div class="library-card-name">${ex.name}</div>
        <div class="library-card-muscle">${ex.muscle}</div>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    <div class="screen library-screen">
      <div class="day-list-header" style="margin-bottom: 16px;">
        <button class="btn-back-days" onclick="closeBuilderMultiPicker()">← Fechar</button>
        <div class="day-list-title">Selecionar Treinos (${builderMultiPick.length})</div>
        <div></div>
      </div>
      <div class="library-search-wrapper">
        <span class="library-search-icon">🔍</span>
        <input class="library-search" type="text" placeholder="Buscar exercício..." value="${librarySearchQuery}" oninput="onBuilderMultiSearch(this.value)">
      </div>
      <div class="filters-container">
        <button class="filters-arrow filters-arrow-left" onclick="scrollFilters('builder-filters', -1)">‹</button>
        <div id="builder-filters" class="library-filters scroll-x">${filtersHtml}</div>
        <button class="filters-arrow filters-arrow-right" onclick="scrollFilters('builder-filters', 1)">›</button>
      </div>
      <div id="builder-count" style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;">${filtered.length} exercício(s) encontrado(s) — toque para selecionar</div>
      <div id="builder-grid" class="library-grid">${cardsHtml}</div>
      <div id="builder-load-more" style="text-align:center;padding:20px;${filtered.length > libraryDisplayCount ? '' : 'display:none;'}"><button class="btn-back-days" onclick="loadMoreBuilderMulti()">Carregar mais</button></div>
      <div class="builder-multi-confirm-bar" style="${builderMultiPick.length > 0 ? '' : 'display:none;'}">
        <button class="builder-confirm-btn" onclick="confirmBuilderMultiPick()">✓ Concluir (${builderMultiPick.length})</button>
      </div>
    </div>
  `;
}

function toggleBuilderPick(exId) {
  const idx = builderMultiPick.indexOf(exId);
  if (idx >= 0) {
    builderMultiPick.splice(idx, 1);
  } else {
    builderMultiPick.push(exId);
  }
  const card = document.querySelector(`[data-ex-id="${exId}"]`);
  if (card) {
    const isChecked = builderMultiPick.includes(exId);
    card.classList.toggle('picked', isChecked);
    const check = card.querySelector('.builder-pick-check');
    if (check) check.textContent = isChecked ? '✓' : '';
  }
  updateBuilderPickCount();
}

function updateBuilderPickCount() {
  const titleEl = document.querySelector('.day-list-title');
  if (titleEl) {
    titleEl.textContent = `Selecionar Treinos (${builderMultiPick.length})`;
  }
  const bar = document.querySelector('.builder-multi-confirm-bar');
  if (bar) {
    if (builderMultiPick.length > 0) {
      bar.innerHTML = `<button class="builder-confirm-btn" onclick="confirmBuilderMultiPick()">✓ Concluir (${builderMultiPick.length})</button>`;
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  }
}

function onBuilderMultiSearch(value) {
  librarySearchQuery = value;
  libraryDisplayCount = 50;
  updateBuilderMultiResults();
}

function updateBuilderMultiResults() {
  const db = getExercisesDB();
  const query = librarySearchQuery.toLowerCase();
  const filter = libraryActiveFilter;

  let filtered = db;
  if (query) {
    filtered = filtered.filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      ex.muscle.toLowerCase().includes(query) ||
      ex.category.toLowerCase().includes(query)
    );
  }
  if (filter !== 'Todos') {
    filtered = filtered.filter(ex => ex.muscle === filter || ex.category === filter);
  }

  const displayItems = filtered.slice(0, libraryDisplayCount);

  const cardsHtml = displayItems.map(ex => {
    const gif = getExerciseGifPath(ex);
    const checked = builderMultiPick.includes(ex.id);
    const idArg = typeof ex.id === 'string' ? "'" + ex.id + "'" : ex.id;
    return `
      <div class="library-card ${checked ? 'picked' : ''}" data-ex-id="${ex.id}" onclick="toggleBuilderPick(${idArg})" style="position:relative;">
        <div class="builder-pick-check">${checked ? '✓' : ''}</div>
        <img class="library-card-gif" src="${gif}" alt="${ex.name}" onerror="this.style.display='none'" loading="lazy">
        <div class="library-card-name">${ex.name}</div>
        <div class="library-card-muscle">${ex.muscle}</div>
      </div>
    `;
  }).join('');

  const countEl = document.getElementById('builder-count');
  const gridEl = document.getElementById('builder-grid');
  const loadMoreEl = document.getElementById('builder-load-more');

  if (countEl) {
    countEl.textContent = `${filtered.length} exercício(s) encontrado(s) — toque para selecionar`;
  }
  if (gridEl) {
    gridEl.innerHTML = cardsHtml;
  }
  if (loadMoreEl) {
    loadMoreEl.style.display = filtered.length > libraryDisplayCount ? 'block' : 'none';
  }
}

function updateBuilderFilterButtons() {
  const filtersHtml = MUSCLE_FILTERS.map(f =>
    `<button class="filter-chip ${f === libraryActiveFilter ? 'active' : ''}" onclick="setBuilderMultiFilter('${f}')">${f}</button>`
  ).join('');
  const filtersEl = document.getElementById('builder-filters');
  if (filtersEl) {
    filtersEl.innerHTML = filtersHtml;
  }
}

function setBuilderMultiFilter(filter) {
  libraryActiveFilter = filter;
  libraryDisplayCount = 50;
  updateBuilderMultiResults();
  updateBuilderFilterButtons();
}

function loadMoreBuilderMulti() {
  libraryDisplayCount += 50;
  updateBuilderMultiResults();
}

function confirmBuilderMultiPick() {
  if (!builderMultiPick.length || !builderTargetUser || !builderSelectedDay) return;

  const userId = builderTargetUser.id;
  if (!userWorkouts[userId]) userWorkouts[userId] = [];

  let dayWorkout = userWorkouts[userId].find(d => d.dayIndex === builderSelectedDay.dayIndex);
  if (!dayWorkout) {
    dayWorkout = {
      id: `cw_${userId}_${builderSelectedDay.dayIndex}`,
      day: builderSelectedDay.dayName,
      dayIndex: builderSelectedDay.dayIndex,
      title: builderSelectedDay.dayName,
      restDay: false,
      exercises: []
    };
    userWorkouts[userId].push(dayWorkout);
  }

  const db = getExercisesDB();
  builderMultiPick.forEach(exId => {
    const ex = db.find(e => e.id === exId);
    if (!ex) return;
    dayWorkout.exercises.push({
      id: `custom_${Date.now()}_${ex.id}`,
      name: ex.name,
      sets: 3,
      reps: '10',
      image: `${ex.gif}.gif`,
      muscle: ex.muscle,
      tips: ''
    });
  });

  saveUserWorkouts(userId, userWorkouts[userId]);
  builderMultiPick = [];
  builderMultiMode = false;
  closeBuilderMultiPicker();
}

function closeBuilderMultiPicker() {
  builderMultiMode = false;
  builderMultiPick = [];
  pickerMode = false;
  if (builderTargetUser && builderSelectedDay) {
    renderBuilderDayExercises();
  } else {
    renderBuilder();
  }
}
function openBuilderExercisePicker() {
  pickerMode = true;
  pickerOrigin = 'builder';
  librarySearchQuery = '';
  libraryActiveFilter = 'Todos';
  libraryDisplayCount = 30;
  renderLibrary();
}

function addBuilderExerciseFromPicker(exerciseId) {
  const db = getExercisesDB();
  const ex = db.find(e => e.id === exerciseId);
  if (!ex || !builderTargetUser || !builderSelectedDay) return;

  const userId = builderTargetUser.id;
  if (!userWorkouts[userId]) userWorkouts[userId] = [];

  let dayWorkout = userWorkouts[userId].find(d => d.dayIndex === builderSelectedDay.dayIndex);
  if (!dayWorkout) {
    dayWorkout = {
      id: `cw_${userId}_${builderSelectedDay.dayIndex}`,
      day: builderSelectedDay.dayName,
      dayIndex: builderSelectedDay.dayIndex,
      title: builderSelectedDay.dayName,
      restDay: false,
      exercises: []
    };
    userWorkouts[userId].push(dayWorkout);
  }

  dayWorkout.exercises.push({
    id: `custom_${Date.now()}`,
    name: ex.name,
    sets: 3,
    reps: '10',
    image: `${ex.gif}.gif`,
    muscle: ex.muscle,
    tips: ''
  });

  saveUserWorkouts(userId, userWorkouts[userId]);
  pickerMode = false;
  renderBuilderDayExercises();
}

function removeBuilderExerciseFromDay(index) {
  const userId = builderTargetUser.id;
  const userDays = userWorkouts[userId] || [];
  const dayWorkout = userDays.find(d => d.dayIndex === builderSelectedDay.dayIndex);
  if (!dayWorkout) return;

  const exName = dayWorkout.exercises[index]?.name || 'este exercício';
  if (!confirm(`Remover "${exName}"?`)) return;

  dayWorkout.exercises.splice(index, 1);

  if (dayWorkout.exercises.length === 0) {
    userWorkouts[userId] = userDays.filter(d => d.dayIndex !== builderSelectedDay.dayIndex);
  }

  saveUserWorkouts(userId, userWorkouts[userId]);
  renderBuilderDayExercises();
}

function swapBuilderExerciseFromDay(index) {
  swappingExerciseIdx = index;
  addingToWorkout = false;
  pickerMode = true;
  pickerOrigin = 'builder';
  librarySearchQuery = '';
  libraryActiveFilter = 'Todos';
  libraryDisplayCount = 30;
  renderLibrary();
}

function startNewWorkout() {
  editingWorkoutId = null;
  builderName = '';
  builderGender = null;
  builderDay = 'nenhum';
  builderExercises = [];
  showBuilderForm = true;
  renderBuilder();
}

function closePicker() {
  pickerMode = false;
  pickerCallback = null;
  addingToWorkout = false;
  swappingExerciseIdx = -1;
  if (pickerOrigin === 'workout' && currentWorkout) {
    currentView = 'workout';
    renderWorkout();
  } else if (pickerOrigin === 'builder' && builderTargetUser && builderSelectedDay) {
    currentView = 'builder';
    renderBuilderDayExercises();
  } else if (currentView === 'builder' || pickerOrigin === 'builder') {
    currentView = 'builder';
    renderBuilder();
  } else {
    currentView = 'workout';
    renderWorkout();
  }
  pickerOrigin = 'builder';
}

function addExerciseFromPicker(exerciseId) {
  const db = getExercisesDB();
  const ex = db.find(e => e.id === exerciseId);
  if (!ex) return;

  if (swappingExerciseIdx >= 0 && builderTargetUser && builderSelectedDay) {
    const userId = builderTargetUser.id;
    const userDays = userWorkouts[userId] || [];
    const dayWorkout = userDays.find(d => d.dayIndex === builderSelectedDay.dayIndex);
    if (dayWorkout && dayWorkout.exercises[swappingExerciseIdx]) {
      dayWorkout.exercises[swappingExerciseIdx] = {
        ...dayWorkout.exercises[swappingExerciseIdx],
        name: ex.name,
        image: `${ex.gif}.gif`,
        muscle: ex.muscle
      };
      saveUserWorkouts(userId, userWorkouts[userId]);
    }
    swappingExerciseIdx = -1;
    closePicker();
    return;
  }

  if (swappingExerciseIdx >= 0 && currentWorkout) {
    const oldEx = currentWorkout.exercises[swappingExerciseIdx];
    currentWorkout.exercises[swappingExerciseIdx] = {
      ...oldEx,
      id: `custom_${Date.now()}`,
      name: ex.name,
      image: `${ex.gif}.gif`,
      muscle: ex.muscle
    };
    saveWorkoutToStorage();
    swappingExerciseIdx = -1;
    closePicker();
    renderWorkout();
    return;
  }

  if (addingToWorkout && currentWorkout) {
    addExerciseToCurrentWorkout(exerciseId);
    return;
  }

  if (builderTargetUser && builderSelectedDay) {
    addBuilderExerciseFromPicker(exerciseId);
    return;
  }

  builderExercises.push({
    id: ex.id,
    name: ex.name,
    muscle: ex.muscle,
    category: ex.category,
    gif: ex.gif,
    sets: 3,
    reps: '10'
  });
  closePicker();
}

function removeBuilderExercise(index) {
  builderExercises.splice(index, 1);
  renderBuilder();
}

function moveBuilderExercise(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= builderExercises.length) return;
  const temp = builderExercises[index];
  builderExercises[index] = builderExercises[newIndex];
  builderExercises[newIndex] = temp;
  renderBuilder();
}

function updateBuilderExerciseSets(index, value) {
  builderExercises[index].sets = parseInt(value, 10) || 3;
}

function updateBuilderExerciseReps(index, value) {
  builderExercises[index].reps = value || '10';
}

function saveCustomWorkoutBuilder() {
  if (!builderName.trim()) {
    alert('Digite um nome para o treino.');
    return;
  }
  if (!builderGender) {
    alert('Selecione para quem é o treino (Homem ou Mulher).');
    return;
  }
  if (builderExercises.length === 0) {
    alert('Adicione pelo menos um exercício.');
    return;
  }

  const exercises = builderExercises.map((ex, i) => ({
    id: `custom_${Date.now()}_${i}`,
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    image: `${ex.gif}.gif`,
    muscle: ex.muscle,
    tips: ''
  }));

  const dayIndexMap = {
    'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'domingo': 0
  };

  const dayNamesMap = {
    'segunda': 'Segunda', 'terça': 'Terça', 'quarta': 'Quarta', 'quinta': 'Quinta',
    'sexta': 'Sexta', 'sábado': 'Sábado', 'domingo': 'Domingo', 'nenhum': 'Personalizado'
  };

  const workout = {
    id: editingWorkoutId || `cw_${Date.now()}`,
    day: dayNamesMap[builderDay] || 'Personalizado',
    dayIndex: dayIndexMap[builderDay] ?? -1,
    title: builderName.trim(),
    restDay: false,
    exercises: exercises
  };

  if (!customWorkouts[builderGender]) customWorkouts[builderGender] = [];

  if (editingWorkoutId) {
    const idx = customWorkouts[builderGender].findIndex(d => d.id === editingWorkoutId);
    if (idx >= 0) customWorkouts[builderGender][idx] = workout;
  } else {
    customWorkouts[builderGender].push(workout);
  }

  saveCustomWorkouts(customWorkouts);

  editingWorkoutId = null;
  showBuilderForm = false;
  builderName = '';
  builderGender = null;
  builderDay = 'nenhum';
  builderExercises = [];

  alert('Treino salvo com sucesso!');
  renderBuilder();
}

function editCustomWorkout(workoutId) {
  if (!currentGender) return;
  const day = (customWorkouts[currentGender] || []).find(d => d.id === workoutId);
  if (!day) return;

  editingWorkoutId = workoutId;
  showBuilderForm = true;
  builderName = day.title;
  builderGender = currentGender;
  builderDay = day.day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!['segunda','terça','quarta','quinta','sexta','sábado','domingo'].includes(builderDay)) {
    builderDay = 'nenhum';
  }

  builderExercises = day.exercises.map(ex => {
    const dbEx = getExercisesDB().find(e => e.name === ex.name);
    return {
      id: dbEx ? dbEx.id : ex.id,
      name: ex.name,
      muscle: ex.muscle || (dbEx ? dbEx.muscle : ''),
      category: dbEx ? dbEx.category : 'Musculação',
      gif: dbEx ? dbEx.gif : (ex.image ? ex.image.replace('.gif', '') : ''),
      sets: ex.sets,
      reps: ex.reps
    };
  });

  renderBuilder();
}

function deleteCustomWorkout(workoutId) {
  if (!currentGender) return;
  if (!confirm('Tem certeza que deseja excluir este treino?')) return;
  customWorkouts[currentGender] = (customWorkouts[currentGender] || []).filter(d => d.id !== workoutId);
  saveCustomWorkouts(customWorkouts);
  renderBuilder();
}

/* ======================== */
/* SHARE / EXPORT           */
/* ======================== */

function exportWorkoutText(workout) {
  if (!workout) return '';
  let text = `💪 ${workout.title} — ${workout.day}\n`;
  text += `${'='.repeat(30)}\n\n`;
  workout.exercises.forEach((ex, i) => {
    text += `${i + 1}. ${ex.name}`;
    if (ex.muscle) text += ` (${ex.muscle})`;
    text += `\n   ${ex.sets}x ${ex.reps}`;
    if (ex.tips) text += `\n   💡 ${ex.tips}`;
    text += `\n\n`;
  });
  text += `Gerado por Anttigravity 💫`;
  return text;
}

function shareWorkout(workout) {
  const text = exportWorkoutText(workout);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
      overlay.innerHTML = `
        <div class="modal share-modal">
          <div class="modal-title" style="margin-bottom:12px;">📤 Compartilhar Treino</div>
          <div class="share-preview"><pre>${text}</pre></div>
          <div class="share-actions">
            <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`).then(() => alert('Copiado!'))">📋 Copiar</button>
            <button class="close-share-btn" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }).catch(() => {
      prompt('Copie o texto abaixo:', text);
    });
  } else {
    prompt('Copie o texto abaixo:', text);
  }
}

/* ======================== */
/* REST TIME SETTINGS       */
/* ======================== */

function showRestTimeSettings() {
  const options = [30, 60, 90, 120, 180];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">Tempo de Descanso</div>
      <div class="timer-options" style="margin: 16px 0;">
        ${options.map(o => `
          <button class="timer-option ${REST_TIME === o ? 'active' : ''}" onclick="setRestTimeFromModal(${o}, this)">
            ${o}s
          </button>
        `).join('')}
        <button class="timer-option" onclick="setCustomRestTime(this)">Custom</button>
      </div>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function setRestTimeFromModal(time) {
  saveRestTime(time);
  document.querySelectorAll('.timer-option').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  setTimeout(() => {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
    if (activeExercise) renderActiveExercise();
  }, 300);
}

function setCustomRestTime() {
  const val = prompt('Digite o tempo de descanso em segundos:', REST_TIME);
  if (val !== null) {
    const num = parseInt(val, 10);
    if (num > 0 && num <= 600) {
      saveRestTime(num);
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) overlay.remove();
      if (activeExercise) renderActiveExercise();
    } else {
      alert('Valor inválido. Use um número entre 1 e 600.');
    }
  }
}

/* ======================== */
/* ADMIN PANEL              */
/* ======================== */

function renderAdmin() {
  if (!currentUserIsAdmin) { renderHome(); return; }
  currentView = 'admin';

  const usersHtml = remoteConfig.users.map(u => `
    <div class="admin-user-row">
      <div class="admin-user-info">
        <span class="admin-user-icon">${u.isAdmin ? '👑' : '👤'}</span>
        <div class="admin-user-details">
          <strong>${u.name}</strong>
          <span class="admin-user-login">Login: ${u.id}</span>
        </div>
      </div>
      ${u.id !== 387 ? `<button class="admin-remove-btn" onclick="removeUser(${u.id})">✕</button>` : ''}
    </div>
  `).join('');

  const editCount = Object.keys(remoteConfig.exerciseEdits).length;

  app.innerHTML = `
    ${renderTabBar()}
    <div class="screen admin-screen">
      <div class="admin-header">
        <div class="admin-header-top">
          <div class="admin-title">⚙️ Painel Admin</div>
          <button class="admin-logout-btn" onclick="doLogout()">Sair</button>
        </div>
        <div class="admin-subtitle">Gerenciar usuários e configurações</div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">📋 Usuários Cadastrados</div>
        <div class="admin-user-list">${usersHtml}</div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">➕ Novo Usuário</div>
        <div class="admin-add-user">
          <input class="admin-input" type="number" id="new-user-id" placeholder="Login (número)" inputmode="numeric">
          <input class="admin-input" type="password" id="new-user-pass" placeholder="Senha" inputmode="numeric">
          <input class="admin-input" type="text" id="new-user-name" placeholder="Nome do aluno">
          <select class="admin-input" id="new-user-gender">
            <option value="homem">Homem</option>
            <option value="mulher">Mulher</option>
          </select>
          <button class="admin-btn-create" onclick="createUser()">+ Criar Usuário</button>
        </div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">📝 Exercícios Editados (${editCount})</div>
        <div class="admin-exercise-search">
          <input class="admin-input" type="text" id="admin-ex-search" placeholder="Buscar exercício por nome ou ID..." oninput="filterAdminExercises()">
        </div>
        <div id="admin-exercise-list" class="admin-exercise-list"></div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">📅 Dias da Semana</div>
        <div id="admin-schedule" class="admin-schedule"></div>
      </div>

      <div class="admin-section">
        <button class="admin-save-btn" id="admin-save-btn" onclick="saveAllConfig()">💾 Salvar tudo na API</button>
        <button class="admin-export-btn" onclick="exportConfig()">📦 Exportar Config JSON</button>
      </div>
    </div>
  `;

  filterAdminExercises();
  renderAdminSchedule();
}

function filterAdminExercises() {
  const query = (document.getElementById('admin-ex-search')?.value || '').toLowerCase();
  const db = typeof EXERCISES_DB !== 'undefined' ? EXERCISES_DB : [];
  const MUSCLES = ["Abdome","Antebraço","Bíceps","Corpo","Costas","Glúteo","Ombro","Peito","Perna","Tríceps"];
  let filtered = db;
  if (query) {
    filtered = filtered.filter(ex =>
      String(ex.id).includes(query) ||
      ex.name.toLowerCase().includes(query) ||
      ex.muscle.toLowerCase().includes(query)
    );
  }
  const listEl = document.getElementById('admin-exercise-list');
  if (!listEl) return;

  listEl.innerHTML = filtered.map(ex => {
    const edit = remoteConfig.exerciseEdits[String(ex.id)] || {};
    const displayName = edit.name || ex.name;
    const displayMuscle = edit.muscle || ex.muscle;
    const muscleOptions = MUSCLES.map(m =>
      `<option value="${m}" ${m === displayMuscle ? 'selected' : ''}>${m}</option>`
    ).join('');
    return `
      <div class="admin-ex-row">
        <img class="admin-ex-gif" src="gifs/${ex.gif || ex.id}.gif" alt="${displayName}" onerror="this.style.display='none'">
        <div class="admin-ex-info">
          <input class="admin-ex-name-input" type="text" value="${displayName}" onchange="updateExerciseName(${ex.id}, this.value)">
          <div class="admin-ex-id">#${ex.id}</div>
          <select class="admin-ex-muscle-select" onchange="updateExerciseMuscle(${ex.id}, this.value)">
            ${muscleOptions}
          </select>
        </div>
      </div>
    `;
  }).join('');
}

function updateExerciseName(exId, newName) {
  if (!newName.trim()) return;
  if (!remoteConfig.exerciseEdits[String(exId)]) remoteConfig.exerciseEdits[String(exId)] = {};
  remoteConfig.exerciseEdits[String(exId)].name = newName.trim();
  saveRemoteConfig();
}

function updateExerciseMuscle(exId, newMuscle) {
  if (!remoteConfig.exerciseEdits[String(exId)]) remoteConfig.exerciseEdits[String(exId)] = {};
  remoteConfig.exerciseEdits[String(exId)].muscle = newMuscle;
  saveRemoteConfig();
}

async function createUser() {
  const id = parseInt(document.getElementById('new-user-id')?.value, 10);
  const pass = document.getElementById('new-user-pass')?.value?.trim();
  const name = document.getElementById('new-user-name')?.value?.trim();
  const gender = document.getElementById('new-user-gender')?.value || 'mulher';
  if (!id || !pass || !name) { alert('Preencha ID, senha e nome.'); return; }
  if (remoteConfig.users.find(u => u.id === id)) { alert('Já existe um usuário com esse Login.'); return; }

  if (authToken) {
    const result = await apiPost('/users', { id, name, password: pass, gender, isAdmin: false });
    if (result.error) { alert('Erro ao criar usuário: ' + result.error); return; }
  }

  remoteConfig.users.push({ id, password: pass, name, isAdmin: false, gender });
  saveRemoteConfig();
  alert(`Usuário ${name} (#${id}) criado!`);
  document.getElementById('new-user-id').value = '';
  document.getElementById('new-user-pass').value = '';
  document.getElementById('new-user-name').value = '';
  renderAdmin();
}

async function removeUser(userId) {
  if (!confirm(`Remover usuário #${userId}?`)) return;

  if (authToken) {
    const result = await apiDelete(`/users/${userId}`);
    if (result.error) { alert('Erro ao remover usuário: ' + result.error); return; }
  }

  remoteConfig.users = remoteConfig.users.filter(u => u.id !== userId);
  saveRemoteConfig();
  renderAdmin();
}

function exportConfig() {
  const json = JSON.stringify(remoteConfig, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.json';
  a.click();
  URL.revokeObjectURL(url);
}

function renderAdminSchedule() {
  const el = document.getElementById('admin-schedule');
  if (!el) return;
  const schedule = remoteConfig.weeklySchedule || {};
  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">Para configurar a agenda de um usuário, use o ID dele no campo abaixo.</div>
    <div class="admin-schedule-user">
      <input class="admin-input" type="number" id="schedule-user-id" placeholder="Login do usuário" inputmode="numeric" style="width:120px;">
      <button class="admin-btn" onclick="loadUserSchedule()">Carregar</button>
    </div>
    <div id="schedule-days-container"></div>
  `;
}

function loadUserSchedule() {
  const uid = parseInt(document.getElementById('schedule-user-id')?.value, 10);
  if (!uid) return;
  const container = document.getElementById('schedule-days-container');
  if (!container) return;
  const schedule = remoteConfig.weeklySchedule || {};
  const userSchedule = schedule[String(uid)] || {};

  container.innerHTML = WEEK_DAYS_DISPLAY.map((day, idx) => {
    const dayNum = (idx + 1) % 7;
    const active = userSchedule[String(dayNum)] !== false;
    return `
      <div class="schedule-day-row">
        <span class="schedule-day-name">${day}</span>
        <label class="schedule-toggle">
          <input type="checkbox" ${active ? 'checked' : ''} onchange="toggleScheduleDay(${uid}, ${dayNum}, this.checked)">
          <span class="schedule-slider"></span>
        </label>
      </div>
    `;
  }).join('');
}

function toggleScheduleDay(uid, dayNum, active) {
  if (!remoteConfig.weeklySchedule) remoteConfig.weeklySchedule = {};
  if (!remoteConfig.weeklySchedule[String(uid)]) remoteConfig.weeklySchedule[String(uid)] = {};
  remoteConfig.weeklySchedule[String(uid)][String(dayNum)] = active;
  saveRemoteConfig();
}

/* ======================== */
/* NAVIGATION / HISTORY     */
/* ======================== */

function handlePopState(e) {
  if (timerInterval) clearInterval(timerInterval);
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  activeExercise = null;
  isResting = false;
  timer = 0;
  workoutStartTime = null;

  if (!currentUserId) { renderLogin(); return; }

  if (e.state && e.state.view) {
    currentGender = e.state.gender || currentGender;
    switch (e.state.view) {
      case 'home': currentTab = 'home'; renderHome(); break;
      case 'dayList': renderDayList(); break;
      case 'workout':
        if (e.state.data?.dayId) selectDay(e.state.data.dayId);
        else renderWorkout();
        break;
      case 'library': currentTab = 'library'; pickerMode = false; renderLibrary(); break;
      case 'builder': currentTab = 'builder'; renderBuilder(); break;
      case 'history': currentTab = 'history'; renderHistory(); break;
      case 'admin': renderAdmin(); break;
      default: renderHome();
    }
  } else {
    renderHome();
  }
}

function initFromUrl() {
  const hash = window.location.hash;

  if (!hash || hash === '#/' || hash === '#') {
    renderHome();
    return;
  }

  const path = hash.replace('#/', '');

  if (path === 'library') {
    currentTab = 'library';
    pickerMode = false;
    renderLibrary();
    return;
  }
  if (path === 'builder') {
    currentTab = 'builder';
    renderBuilder();
    return;
  }
  if (path === 'admin') {
    renderAdmin();
    return;
  }

  const parts = path.split('/');

  if (parts.length === 1 && (parts[0] === 'homem' || parts[0] === 'mulher')) {
    currentGender = parts[0];
    renderDayList();
  } else if (parts.length === 2 && parts[1] === 'history') {
    currentGender = parts[0];
    currentTab = 'history';
    renderHistory();
  } else if (parts.length === 2) {
    currentGender = parts[0];
    const all = mergeWorkouts();
    currentWorkout = (all[currentGender] || []).find(d => d.id === parts[1]);
    if (currentWorkout) {
      exerciseStates = loadExerciseStates(currentGender, parts[1]);
      renderWorkout();
    } else {
      renderHome();
    }
  } else {
    renderHome();
  }
}

window.addEventListener('popstate', handlePopState);

checkSession();
loadRestTime();

if (currentUserId && authToken) {
  renderHome();
  loadWorkouts().then(async () => {
    await loadRemoteConfig();
    await loadUserWorkouts(currentUserId);
    apiLoaded = true;
    renderHome();
  });
} else {
  renderLogin();
  loadWorkouts().then(async () => {
    await loadRemoteConfig();
    apiLoaded = true;
  });
}
