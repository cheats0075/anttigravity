const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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

let librarySearchQuery = '';
let libraryActiveFilter = 'Todos';
let libraryDisplayCount = 30;
let libraryScrollListener = null;

let builderName = '';
let builderDay = 'nenhum';
let builderExercises = [];
let editingWorkoutId = null;
let pickerMode = false;
let pickerCallback = null;
let showBuilderForm = false;

let customWorkouts = {};

function getExerciseGifPath(exercise) {
  if (typeof exercise.id === 'string') {
    return `assets/exercises/${exercise.gif || exercise.id}.gif`;
  }
  return `gifs/${exercise.gif || exercise.id}.gif`;
}

function getWorkoutExerciseGif(exercise) {
  if (exercise.image && exercise.image.endsWith('.gif')) {
    return `assets/exercises/${exercise.image}`;
  }
  if (exercise.image) return `assets/exercises/${exercise.image}`;
  const dbEx = EXERCISES_DB.find(e => e.id === exercise.id || e.name === exercise.name);
  if (dbEx) return getExerciseGifPath(dbEx);
  return '';
}

function tryLoadLib() {
  try { customWorkouts = JSON.parse(localStorage.getItem('custom_workouts')) || {}; } catch (e) { customWorkouts = {}; }
}
tryLoadLib();

function getExercisesDB() {
  return typeof EXERCISES_DB !== 'undefined' ? EXERCISES_DB : [];
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
    const saved = localStorage.getItem('rest_time');
    if (saved !== null) REST_TIME = parseInt(saved, 10) || 90;
  } catch (e) {}
}

function saveRestTime(time) {
  try { localStorage.setItem('rest_time', time); } catch (e) {}
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
    const saved = localStorage.getItem(`progress_${gender}`);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function saveProgress(gender, progress) {
  try { localStorage.setItem(`progress_${gender}`, JSON.stringify(progress)); } catch (e) {}
}

function loadExerciseStates(gender, workoutId) {
  try {
    const saved = localStorage.getItem(`exercises_${gender}_${workoutId}`);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function saveExerciseStates(gender, workoutId, states) {
  try { localStorage.setItem(`exercises_${gender}_${workoutId}`, JSON.stringify(states)); } catch (e) {}
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('workout_history');
    return saved ? JSON.parse(saved) : [];
  } catch (e) { return []; }
}

function saveHistory(history) {
  try { localStorage.setItem('workout_history', JSON.stringify(history)); } catch (e) {}
}

function loadCustomWorkouts() {
  try {
    const saved = localStorage.getItem('custom_workouts');
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function saveCustomWorkouts(data) {
  try { localStorage.setItem('custom_workouts', JSON.stringify(data)); } catch (e) {}
  customWorkouts = data;
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
  return genderWorkouts.find(d => d.dayIndex === todayIdx && !d.restDay);
}

function getWeeklyStats() {
  if (!currentGender) return { completed: 0, total: 0, streak: 0 };
  const all = mergeWorkouts();
  const days = (all[currentGender] || []).filter(d => !d.restDay);
  const progress = loadProgress(currentGender);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  let completedThisWeek = 0;
  days.forEach(d => {
    if (progress[d.id]) {
      const saved = localStorage.getItem(`workout_date_${currentGender}_${d.id}`);
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
    days.forEach(d => {
      if (progress[d.id]) {
        const saved = localStorage.getItem(`workout_date_${currentGender}_${d.id}`);
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

  return { completed: completedThisWeek, total: days.length, streak };
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
    case 'home': renderHome(); break;
    case 'dayList': renderDayList(); break;
    case 'workout': renderWorkout(); break;
    case 'activeExercise': renderActiveExercise(); break;
    case 'library': renderLibrary(); break;
    case 'builder': renderBuilder(); break;
    case 'history': renderHistory(); break;
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
      ${todayBtn}
      <button class="home-btn" onclick="selectGender('homem')">HOMEM</button>
      <button class="home-btn female" onclick="selectGender('mulher')">MULHER</button>
      ${statsHtml}
      ${customSection}
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
      <div class="weekly-summary">
        <div class="weekly-progress">
          <div class="weekly-label">Esta semana</div>
          <div class="weekly-bar">
            <div class="weekly-fill" style="width: ${stats.total > 0 ? (stats.completed / stats.total * 100) : 0}%"></div>
          </div>
          <div class="weekly-text">${stats.completed}/${stats.total} treinos</div>
        </div>
        ${stats.streak > 0 ? `<div class="streak-badge">🔥 ${stats.streak} semana${stats.streak > 1 ? 's' : ''}</div>` : ''}
      </div>
  `;

  const defaultDays = workouts[currentGender] || [];
  const customDays = customWorkouts[currentGender] || [];

  if (defaultDays.length > 0) {
    html += '<div class="section-label" style="font-size:0.7rem;color:var(--text-muted);margin:12px 0 8px;letter-spacing:1px;font-weight:700;">TREINOS PADRÃO</div>';
    defaultDays.forEach(day => {
      html += renderDayCard(day, todayIdx, progress);
    });
  }

  if (customDays.length > 0) {
    html += '<div class="section-label" style="font-size:0.7rem;color:var(--secondary);margin:16px 0 8px;letter-spacing:1px;font-weight:700;">⭐ TREINOS PERSONALIZADOS</div>';
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
  const titleClass = day.restDay ? 'day-title rest-text' : 'day-title';

  return `
    <div class="${cardClass}" ${!day.restDay ? `onclick="selectDay('${day.id}')"` : ''}>
      <div class="day-header">
        <span class="day-name">${day.day}</span>
        ${isCustom ? '<span class="custom-tag">⭐ PERSONALIZADO</span>' : ''}
        ${isToday && !completed ? '<span class="today-badge">HOJE</span>' : ''}
        ${completed ? '<span class="day-check">✓</span>' : ''}
      </div>
      <div class="${titleClass}">${day.title}</div>
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

  currentWorkout.exercises.forEach(ex => {
    const state = exerciseStates[ex.id] || {};
    const completed = state.completed === true;
    const completedSets = state.completedSets || 0;
    const lastWeight = state.lastWeight || '';
    const gif = getWorkoutExerciseGif(ex);

    html += `
      <div class="exercise-card ${completed ? 'completed' : ''}" onclick="startExercise('${ex.id}')">
        <div class="exercise-row">
          <img class="exercise-thumb" src="${gif}" alt="${ex.name}" onerror="this.style.display='none'">
          <div class="exercise-info">
            <div class="exercise-name ${completed ? 'done' : ''}">${ex.name}</div>
            ${ex.muscle ? `<div class="exercise-muscle">${ex.muscle}</div>` : ''}
            <div class="exercise-details">${ex.sets}x ${ex.reps}${lastWeight ? ` • ${lastWeight}kg` : ''}</div>
            ${!completed && completedSets > 0 ? `<div class="exercise-progress">Séries: ${completedSets}/${ex.sets}</div>` : ''}
          </div>
          ${completed ? '<span class="exercise-check">✓</span>' : ''}
        </div>
      </div>
    `;
  });

  html += `
    <div class="btn-row" style="justify-content: center;">
      <button class="btn-back-days" onclick="goDayList()">← Voltar</button>
      <button class="btn-reset" onclick="resetProgress()">Zerar Treinos</button>
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

function startExercise(exerciseId) {
  const ex = currentWorkout.exercises.find(e => e.id === exerciseId);
  if (!ex) return;
  activeExercise = ex;
  const state = exerciseStates[activeExercise.id] || {};
  currentSet = state.completedSets || 0;
  isResting = false;
  timer = 0;
  currentWeight = state.lastWeight || '';
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

function renderActiveExercise() {
  if (!activeExercise) return;
  const state = exerciseStates[activeExercise.id] || {};
  const lastWeight = state.lastWeight || '';
  const elapsed = workoutStartTime ? formatDuration(Date.now() - workoutStartTime) : '';
  const gif = getWorkoutExerciseGif(activeExercise);

  if (isResting) {
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - timer / REST_TIME);

    app.innerHTML = `
      <div class="screen active-exercise">
        ${elapsed ? `<div class="workout-timer-bar" id="workout-duration">${elapsed}</div>` : ''}
        <div class="active-name">${activeExercise.name}</div>
        <img class="active-image" src="${gif}" alt="${activeExercise.name}" onerror="this.style.display='none'">
        <div class="active-reps">Repetições: ${activeExercise.reps}</div>
        ${activeExercise.tips ? `<div class="active-tips">💡 ${activeExercise.tips}</div>` : ''}
        <div class="timer-circle">
          <svg viewBox="0 0 200 200">
            <circle class="track" cx="100" cy="100" r="90"/>
            <circle class="progress" cx="100" cy="100" r="90"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="time-text">${formatTime(timer)}</div>
        </div>
        <div class="timer-hint">Prepare-se para a próxima série</div>
        <button class="btn-settings" onclick="showRestTimeSettings()">⚙️ Descanso: ${REST_TIME}s</button>
        <button class="btn-back" onclick="cancelTimer()">Cancelar</button>
      </div>
    `;
  } else {
    const weightOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];

    app.innerHTML = `
      <div class="screen active-exercise">
        ${elapsed ? `<div class="workout-timer-bar" id="workout-duration">${elapsed}</div>` : ''}
        <div class="active-name">${activeExercise.name}</div>
        <img class="active-image" src="${gif}" alt="${activeExercise.name}" onerror="this.style.display='none'">
        <div class="active-reps">Repetições: ${activeExercise.reps}</div>
        ${activeExercise.tips ? `<div class="active-tips">💡 ${activeExercise.tips}</div>` : ''}
        <div class="set-info">Série ${currentSet + 1} de ${activeExercise.sets}</div>
        <div class="weight-input-group">
          <label class="weight-label">Carga (kg)</label>
          <div class="weight-controls">
            <button class="weight-btn" onclick="adjustWeight(-2.5)">−</button>
            <input type="number" class="weight-field" id="weightInput" value="${currentWeight}" placeholder="0" step="0.5" min="0" onchange="updateWeight(this.value)" oninput="updateWeight(this.value)">
            <button class="weight-btn" onclick="adjustWeight(2.5)">+</button>
          </div>
          <div class="weight-quick">
            ${weightOptions.map(w =>
              `<button class="weight-chip ${currentWeight == w ? 'active' : ''}" onclick="setWeight(${w})">${w}</button>`
            ).join('')}
          </div>
        </div>
        <button class="btn-settings" onclick="showRestTimeSettings()">⚙️ Descanso: ${REST_TIME}s</button>
        <button class="btn-done" onclick="completeSet()">CONCLUÍDO ✓</button>
        <button class="btn-back" onclick="cancelExercise()">Voltar</button>
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
  const timeText = document.querySelector('.time-text');
  const progressCircle = document.querySelector('.timer-circle .progress');
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

    try { localStorage.setItem(`workout_date_${currentGender}_${currentWorkout.id}`, new Date().toISOString()); } catch (e) {}

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

  try {
    localStorage.removeItem(`exercises_${currentGender}_${dayId}`);
    localStorage.removeItem(`workout_date_${currentGender}_${dayId}`);
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
    renderExercisePicker();
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
        <div class="builder-day-select">${dayBtns}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px;font-weight:600;">Exercícios (${builderExercises.length})</div>
        <div class="builder-exercise-list">${exItems}</div>
        <button class="builder-add-btn" onclick="openExercisePicker()">+</button>
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
  builderDay = 'nenhum';
  builderExercises = [];
  showBuilderForm = true;
  renderBuilder();
}

function setBuilderDay(day) {
  builderDay = day;
  renderBuilder();
}

function openExercisePicker() {
  pickerMode = true;
  pickerCallback = null;
  librarySearchQuery = '';
  libraryActiveFilter = 'Todos';
  libraryDisplayCount = 30;
  renderBuilder();
}

function closePicker() {
  pickerMode = false;
  pickerCallback = null;
  renderBuilder();
}

function addExerciseFromPicker(exerciseId) {
  const db = getExercisesDB();
  const ex = db.find(e => e.id === exerciseId);
  if (!ex) return;
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
  if (builderExercises.length === 0) {
    alert('Adicione pelo menos um exercício.');
    return;
  }
  if (!currentGender) currentGender = 'homem';

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

  if (!customWorkouts[currentGender]) customWorkouts[currentGender] = [];

  if (editingWorkoutId) {
    const idx = customWorkouts[currentGender].findIndex(d => d.id === editingWorkoutId);
    if (idx >= 0) customWorkouts[currentGender][idx] = workout;
  } else {
    customWorkouts[currentGender].push(workout);
  }

  saveCustomWorkouts(customWorkouts);

  editingWorkoutId = null;
  showBuilderForm = false;
  builderName = '';
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
/* NAVIGATION / HISTORY     */
/* ======================== */

function handlePopState(e) {
  if (timerInterval) clearInterval(timerInterval);
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  activeExercise = null;
  isResting = false;
  timer = 0;
  workoutStartTime = null;

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

loadWorkouts().then(() => {
  loadRestTime();
  history.replaceState({ view: 'home' }, '', '#/');
  initFromUrl();
});
