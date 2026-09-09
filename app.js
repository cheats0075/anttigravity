const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEK_DAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const WEEK_DAYS_DISPLAY = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MUSCLE_FILTERS = ['Todos', 'Peito', 'Costas', 'Perna', 'Ombro', 'Bíceps', 'Tríceps', 'Abdome', 'Glúteo', 'Corpo', 'Aeróbico', 'Alongamento', 'CrossFit', 'Funcional', 'Mobilidade'];

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

let customWorkouts = {};

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
  try {
    const r = await fetch('config.json?' + Date.now());
    if (r.ok) remoteConfig = await r.json();
  } catch (e) {
    try {
      const saved = localStorage.getItem('remote_config_backup');
      if (saved) remoteConfig = JSON.parse(saved);
    } catch (e2) {}
  }
}

function saveRemoteConfig() {
  try { localStorage.setItem('remote_config_backup', JSON.stringify(remoteConfig)); } catch (e) {}
}

function doLogin(userId, password) {
  const uid = parseInt(userId, 10);
  const pwd = String(password);
  const user = remoteConfig.users.find(u => u.id === uid && u.password === pwd);
  if (!user) return false;
  currentUserId = user.id;
  currentUserIsAdmin = !!user.isAdmin;
  currentUserName = user.name;
  try { localStorage.setItem('current_session', JSON.stringify({ id: user.id, name: user.name, isAdmin: user.isAdmin })); } catch (e) {}
  return true;
}

function doLogout() {
  currentUserId = null;
  currentUserIsAdmin = false;
  currentUserName = '';
  currentGender = null;
  currentWorkout = null;
  try { localStorage.removeItem('current_session'); } catch (e) {}
  renderLogin();
}

function checkSession() {
  try {
    const raw = localStorage.getItem('current_session');
    if (!raw) return false;
    const s = JSON.parse(raw);
    const user = remoteConfig.users.find(u => u.id === s.id);
    if (!user) return false;
    currentUserId = user.id;
    currentUserIsAdmin = !!user.isAdmin;
    currentUserName = user.name;
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

function handleLogin(e) {
  e.preventDefault();
  const userId = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;
  if (doLogin(userId, pass)) {
    loadWorkouts().then(() => {
      loadRestTime();
      history.replaceState({ view: 'home' }, '', '#/');
      renderHome();
    });
  } else {
    document.getElementById('login-error').style.display = 'block';
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
  try {
    const resp = await fetch('shared/workouts.json');
    workouts = await resp.json();
  } catch (e) {
    console.warn('Erro ao carregar treinos:', e);
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

function loadHistory() {
  try {
    const saved = sGet('workout_history');
    return saved ? JSON.parse(saved) : [];
  } catch (e) { return []; }
}

function saveHistory(history) {
  try { sSet('workout_history', JSON.stringify(history)); } catch (e) {}
}

function loadCustomWorkouts() {
  try {
    const saved = sGet('custom_workouts');
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function saveCustomWorkouts(data) {
  try { sSet('custom_workouts', JSON.stringify(data)); } catch (e) {}
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

function switchTab(tab) {
  if (timerInterval) clearInterval(timerInterval);
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  activeExercise = null;
  isResting = false;
  timer = 0;
  workoutStartTime = null;
  currentTab = tab;

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
    history.pushState({ view: 'history' }, '', '#/history');
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

  let todayBtn = '';
  if (todayWorkout) {
    todayBtn = `
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
      ${todayBtn}
      <button class="home-btn" onclick="selectGender('homem')">HOMEM</button>
      <button class="home-btn female" onclick="selectGender('mulher')">MULHER</button>
      ${statsHtml}
      ${customSection}
      ${currentUserIsAdmin ? `
        <div style="margin-top:24px;">
          <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;letter-spacing:1px;font-weight:700;">ADMIN</div>
          <button class="home-btn" style="background:#6c5ce7;font-size:0.85rem;" onclick="navigate('admin')">⚙️ Painel Admin</button>
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
  const all = mergeWorkouts();
  const days = all[currentGender] || [];
  const todayIdx = getTodayIndex();
  const stats = getWeeklyStats();
  const progress = loadProgress(currentGender);

  let html = `
    <div class="screen">
      <div class="day-list-header">
        <button class="btn-back-days" onclick="goHome()">← Voltar</button>
        <div class="day-list-title">${currentGender === 'homem' ? 'HOMEM' : 'MULHER'}</div>
        <button class="btn-history" onclick="showHistory()">Histórico</button>
      </div>
  `;

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
              : '<span class="week-day-rest">Adicionar</span>'
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
  navigate('home');
}

function selectDay(dayId) {
  const all = mergeWorkouts();
  currentWorkout = (all[currentGender] || []).find(d => d.id === dayId);
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
          <button class="exercise-edit-btn" onclick="event.stopPropagation(); swapExercise(${idx})">🔄</button>
          <button class="exercise-remove-btn" onclick="event.stopPropagation(); removeExerciseFromWorkout(${idx})">✕</button>
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
    <div class="btn-row" style="justify-content: center;">
      <button class="btn-back-days" onclick="goDayList()">← Voltar</button>
      ${isRestDayWorkout && currentWorkout.exercises.length > 0
        ? `<button class="btn-reset" onclick="resetRestDay()">Limpar Treino</button>`
        : `<button class="btn-reset" onclick="resetProgress()">Zerar Treinos</button>`
      }
    </div>
    <div class="btn-row" style="justify-content: center; margin-top: 8px;">
      <button class="btn-reset" style="background:var(--accent);" onclick="openAddToWorkoutPicker()">+ Adicionar Exercício</button>
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
        <div class="day-list-title">Selecionar Exercício</div>
        <div></div>
      </div>` : `<div class="screen library-screen">`}
      <div class="library-search-wrapper">
        <span class="library-search-icon">🔍</span>
        <input class="library-search" type="text" placeholder="Buscar exercício..." value="${librarySearchQuery}" oninput="onLibrarySearch(this.value)">
      </div>
      <div class="library-filters scroll-x">${filtersHtml}</div>
      <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;">${filtered.length} exercício${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}</div>
      <div class="library-grid">${cardsHtml}</div>
      ${filtered.length > libraryDisplayCount ? `<div id="library-load-more" style="text-align:center;padding:20px;"><button class="btn-back-days" onclick="loadMoreLibrary()">Carregar mais</button></div>` : ''}
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
  renderLibrary();
}

function setLibraryFilter(filter) {
  libraryActiveFilter = filter;
  libraryDisplayCount = 30;
  renderLibrary();
}

function loadMoreLibrary() {
  libraryDisplayCount += 30;
  renderLibrary();
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
  if (pickerMode) {
    renderLibrary();
    return;
  }

  const customDays = currentGender ? (customWorkouts[currentGender] || []) : [];

  let listHtml = '';
  if (!editingWorkoutId && customDays.length > 0) {
    listHtml = `<div style="margin-bottom:24px;">
      <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:12px;letter-spacing:1px;font-weight:700;">SEUS TREINOS</div>
      ${customDays.map(d => `
        <div class="day-card custom" onclick="editCustomWorkout('${d.id}')">
          <div class="day-header">
            <span class="day-name">${d.day}</span>
            <span class="custom-tag">⭐ PERSONALIZADO</span>
          </div>
          <div class="day-title">${d.title}</div>
          <div class="day-count">${d.exercises.length} exercícios</div>
        </div>
      `).join('')}
    </div>`;
  }

  if (editingWorkoutId || showBuilderForm || builderExercises.length > 0 || builderName) {
    const dayBtns = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo', 'Nenhum'].map(d => {
      const val = d.toLowerCase();
      return `<button class="${builderDay === val ? 'active' : ''}" onclick="setBuilderDay('${val}')">${d}</button>`;
    }).join('');

    const exItems = builderExercises.map((ex, i) => `
      <div class="builder-exercise-item">
        <div class="drag-handle" onclick="event.stopPropagation()">
          <button onclick="moveBuilderExercise(${i}, -1)" style="background:none;border:none;color:var(--text-muted);font-size:0.8rem;cursor:pointer;">▲</button>
          <button onclick="moveBuilderExercise(${i}, 1)" style="background:none;border:none;color:var(--text-muted);font-size:0.8rem;cursor:pointer;">▼</button>
        </div>
        <div class="builder-exercise-info">
          <div class="name">${ex.name}</div>
          <div class="muscle">${ex.muscle || ''}</div>
        </div>
        <div class="builder-exercise-sets">
          <div>
            <input type="number" value="${ex.sets}" min="1" max="20" onchange="updateBuilderExerciseSets(${i}, this.value)">
            <span class="sets-label">Séries</span>
          </div>
          <div>
            <input type="text" value="${ex.reps}" placeholder="10" onchange="updateBuilderExerciseReps(${i}, this.value)">
            <span class="reps-label">Reps</span>
          </div>
        </div>
        <button class="remove-btn" onclick="removeBuilderExercise(${i})">✕</button>
      </div>
    `).join('');

    app.innerHTML = `
      ${renderTabBar()}
      <div class="screen builder-screen">
        <div class="builder-header">
          <h2>${editingWorkoutId ? 'Editar Treino' : 'Criar Treino'}</h2>
          <button class="btn-back-days" onclick="showBuilderForm = false; editingWorkoutId = null; renderBuilder();">← Voltar</button>
          <p>Personalize seu treino</p>
        </div>
        <input class="builder-name-input" type="text" placeholder="Nome do treino (ex: Meu Treino A)" value="${builderName}" oninput="builderName = this.value">
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">Para quem é o treino?</div>
        <div class="builder-gender-select">
          <button class="${builderGender === 'homem' ? 'active' : ''}" onclick="setBuilderGender('homem')">HOMEM</button>
          <button class="${builderGender === 'mulher' ? 'active' : ''}" onclick="setBuilderGender('mulher')">MULHER</button>
        </div>
        <div class="builder-day-select">${dayBtns}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px;font-weight:600;">Exercícios (${builderExercises.length})</div>
        <div class="builder-exercise-list">${exItems}</div>
        <button class="builder-add-btn" onclick="openExercisePicker()">+ Adicionar Exercício</button>
        <button class="builder-save-btn" onclick="saveCustomWorkoutBuilder()">💾 Salvar Treino</button>
      </div>
    `;
  } else {
    app.innerHTML = `
      ${renderTabBar()}
      <div class="screen builder-screen">
        <div class="builder-header">
          <h2>Criar Treino</h2>
          <p>Crie treinos personalizados</p>
        </div>
        <button class="home-btn today-btn" onclick="startNewWorkout()" style="margin-bottom:24px;">+ Novo Treino</button>
        ${listHtml}
      </div>
    `;
  }
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

function setBuilderDay(day) {
  builderDay = day;
  renderBuilder();
}

function setBuilderGender(gender) {
  builderGender = gender;
  renderBuilder();
}

function openExercisePicker() {
  pickerMode = true;
  pickerOrigin = (addingToWorkout || swappingExerciseIdx >= 0) ? 'workout' : 'builder';
  pickerCallback = null;
  librarySearchQuery = '';
  libraryActiveFilter = 'Todos';
  libraryDisplayCount = 30;
  renderLibrary();
}

function closePicker() {
  pickerMode = false;
  pickerCallback = null;
  addingToWorkout = false;
  swappingExerciseIdx = -1;
  if (pickerOrigin === 'workout' && currentWorkout) {
    currentView = 'workout';
    renderWorkout();
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
      <span class="admin-user-info">${u.isAdmin ? '👑' : '👤'} <strong>Login: ${u.id}</strong> — ${u.name}</span>
      ${u.id !== 387 ? `<button class="admin-remove-btn" onclick="removeUser(${u.id})">✕</button>` : ''}
    </div>
  `).join('');

  const editCount = Object.keys(remoteConfig.exerciseEdits).length;

  app.innerHTML = `
    <div class="screen admin-screen">
      <div class="day-list-header">
        <button class="btn-back-days" onclick="goHome()">← Voltar</button>
        <div class="day-list-title">⚙️ Admin</div>
        <div></div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">Usuários</div>
        <div class="admin-user-list">${usersHtml}</div>
        <div class="admin-add-user">
          <input class="admin-input" type="number" id="new-user-id" placeholder="Login" inputmode="numeric">
          <input class="admin-input" type="password" id="new-user-pass" placeholder="Senha" inputmode="numeric">
          <input class="admin-input" type="text" id="new-user-name" placeholder="Nome do usuário">
          <button class="admin-btn" onclick="createUser()">+ Criar</button>
        </div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">Exercícios Editados (${editCount})</div>
        <div class="admin-exercise-search">
          <input class="admin-input" type="text" id="admin-ex-search" placeholder="Buscar exercício por nome ou ID..." oninput="filterAdminExercises()">
        </div>
        <div id="admin-exercise-list" class="admin-exercise-list"></div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">Dias da Semana</div>
        <div id="admin-schedule" class="admin-schedule"></div>
      </div>

      <div class="admin-section">
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
  filtered = filtered.slice(0, 50);

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
        <img class="admin-ex-gif" src="https://cdnh.sistemasca.com/arquivos/exercicios/${ex.id}.gif" alt="${displayName}" onerror="this.style.display='none'">
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

function createUser() {
  const id = parseInt(document.getElementById('new-user-id')?.value, 10);
  const pass = document.getElementById('new-user-pass')?.value?.trim();
  const name = document.getElementById('new-user-name')?.value?.trim();
  if (!id || !pass || !name) { alert('Preencha ID, senha e nome.'); return; }
  if (remoteConfig.users.find(u => u.id === id)) { alert('Já existe um usuário com esse Login.'); return; }
  remoteConfig.users.push({ id, password: pass, name, isAdmin: false });
  saveRemoteConfig();
  alert(`Usuário ${name} (#${id}) criado!`);
  document.getElementById('new-user-id').value = '';
  document.getElementById('new-user-pass').value = '';
  document.getElementById('new-user-name').value = '';
  renderAdmin();
}

function removeUser(userId) {
  if (!confirm(`Remover usuário #${userId}?`)) return;
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

loadWorkouts().then(async () => {
  await loadRemoteConfig();
  loadRestTime();
  if (checkSession()) {
    history.replaceState({ view: 'home' }, '', '#/');
    initFromUrl();
  } else {
    renderLogin();
  }
});
