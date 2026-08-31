const REST_TIME = 90;
const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const app = document.getElementById('app');
let workouts = {};
let currentGender = null;
let currentWorkout = null;
let exerciseStates = {};
let activeExercise = null;
let currentExercise = null;
let currentSet = 0;
let timer = 0;
let timerInterval = null;
let isResting = false;
let currentView = 'home';
let workoutStartTime = null;
let workoutDurationInterval = null;
let currentWeight = '';

async function loadWorkouts() {
  try {
    const resp = await fetch('shared/workouts.json');
    workouts = await resp.json();
  } catch (e) {
    console.warn('Erro ao carregar treinos:', e);
  }
}

function loadProgress(gender) {
  const saved = localStorage.getItem(`progress_${gender}`);
  return saved ? JSON.parse(saved) : {};
}

function saveProgress(gender, progress) {
  localStorage.setItem(`progress_${gender}`, JSON.stringify(progress));
}

function loadExerciseStates(gender, workoutId) {
  const saved = localStorage.getItem(`exercises_${gender}_${workoutId}`);
  return saved ? JSON.parse(saved) : {};
}

function saveExerciseStates(gender, workoutId, states) {
  localStorage.setItem(`exercises_${gender}_${workoutId}`, JSON.stringify(states));
}

function loadHistory() {
  const saved = localStorage.getItem('workout_history');
  return saved ? JSON.parse(saved) : [];
}

function saveHistory(history) {
  localStorage.setItem('workout_history', JSON.stringify(history));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  return formatTime(totalSec);
}

function getTodayIndex() {
  return new Date().getDay();
}

function getTodayWorkout() {
  if (!currentGender || !workouts[currentGender]) return null;
  const todayIdx = getTodayIndex();
  return workouts[currentGender].find(d => d.dayIndex === todayIdx && !d.restDay);
}

function getWeeklyStats() {
  if (!currentGender) return { completed: 0, total: 0, streak: 0 };
  const days = workouts[currentGender].filter(d => !d.restDay);
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
      const saved = localStorage.getItem(`workout_date_${currentGender}_${d.id}`);
      if (saved) {
        const date = new Date(saved);
        if (date >= wStart && date < wEnd) {}
        else if (!progress[d.id]) {}
        else { weekComplete = false; }
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
    case 'history': renderHistory(); break;
  }
}

function renderHome() {
  currentView = 'home';
  const stats = getWeeklyStats();
  const todayWorkout = getTodayWorkout();

  let todayBtn = '';
  if (todayWorkout) {
    todayBtn = `
      <button class="home-btn today-btn" onclick="selectGender('${currentGender || 'homem'}'); setTimeout(() => selectDay('${todayWorkout.id}'), 10)">
        TREINO DE HOJE — ${todayWorkout.title}
      </button>
    `;
  }

  app.innerHTML = `
    <div class="screen home">
      <div class="home-title">ANTIGRAVITY</div>
      <div class="home-subtitle">Escolha seu treino</div>
      ${todayBtn}
      <button class="home-btn" onclick="selectGender('homem')">HOMEM</button>
      <button class="home-btn female" onclick="selectGender('mulher')">MULHER</button>
    </div>
  `;
}

function selectGender(gender) {
  currentGender = gender;
  exerciseStates = {};
  navigate('dayList');
}

function renderDayList() {
  const days = workouts[currentGender] || [];
  const todayIdx = getTodayIndex();
  const stats = getWeeklyStats();
  const progress = loadProgress(currentGender);

  let html = `
    <div class="screen">
      <div class="day-list-title">${currentGender === 'homem' ? 'HOMEM' : 'MULHER'}</div>
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

  days.forEach(day => {
    const completed = progress[day.id] === true;
    const isToday = day.dayIndex === todayIdx && !day.restDay;
    let cardClass = day.restDay ? 'day-card rest' : completed ? 'day-card completed' : 'day-card';
    if (isToday && !completed) cardClass += ' today';
    const titleClass = day.restDay ? 'day-title rest-text' : 'day-title';

    html += `
      <div class="${cardClass}" ${!day.restDay ? `onclick="selectDay('${day.id}')"` : ''}>
        <div class="day-header">
          <span class="day-name">${day.day}</span>
          ${isToday && !completed ? '<span class="today-badge">HOJE</span>' : ''}
          ${completed ? '<span class="day-check">✓</span>' : ''}
        </div>
        <div class="${titleClass}">${day.title}</div>
        ${!day.restDay ? `<div class="day-count">${day.exercises.length} exercícios</div>` : ''}
      </div>
    `;
  });

  html += `
    <div class="btn-row" style="justify-content: center; margin-top: 8px;">
      <button class="btn-back-days" onclick="goHome()">← Voltar</button>
      <button class="btn-history" onclick="showHistory()">Histórico</button>
    </div>
  </div>`;
  app.innerHTML = html;
}

function goHome() {
  if (timerInterval) clearInterval(timerInterval);
  activeExercise = null;
  isResting = false;
  navigate('home');
}

function selectDay(dayId) {
  currentWorkout = workouts[currentGender].find(d => d.id === dayId);
  exerciseStates = loadExerciseStates(currentGender, dayId);
  activeExercise = null;
  workoutStartTime = null;
  navigate('workout');
}

function renderWorkout() {
  let html = `
    <div class="screen">
      <div class="workout-title">${currentWorkout.title}</div>
      <div class="workout-day">${currentWorkout.day}</div>
  `;

  currentWorkout.exercises.forEach(ex => {
    const state = exerciseStates[ex.id] || {};
    const completed = state.completed === true;
    const completedSets = state.completedSets || 0;
    const lastWeight = state.lastWeight || '';

    html += `
      <div class="exercise-card ${completed ? 'completed' : ''}" onclick="startExercise('${ex.id}')">
        <div class="exercise-row">
          <img class="exercise-thumb" src="assets/exercises/${ex.image}" alt="${ex.name}" onerror="this.style.display='none'">
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
  activeExercise = currentWorkout.exercises.find(e => e.id === exerciseId);
  currentExercise = activeExercise;
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
  workoutDurationInterval = setInterval(() => {
    const el = document.getElementById('workout-duration');
    if (el && workoutStartTime) {
      el.textContent = formatDuration(Date.now() - workoutStartTime);
    }
  }, 1000);
}

function renderActiveExercise() {
  const state = exerciseStates[activeExercise.id] || {};
  const lastWeight = state.lastWeight || '';
  const elapsed = workoutStartTime ? formatDuration(Date.now() - workoutStartTime) : '';

  if (isResting) {
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - timer / REST_TIME);

    app.innerHTML = `
      <div class="screen active-exercise">
        ${elapsed ? `<div class="workout-timer-bar" id="workout-duration">${elapsed}</div>` : ''}
        <div class="active-name">${activeExercise.name}</div>
        <img class="active-image" src="assets/exercises/${activeExercise.image}" alt="${activeExercise.name}" onerror="this.style.display='none'">
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
        <button class="btn-back" onclick="cancelTimer()">Cancelar</button>
      </div>
    `;
  } else {
    const weightOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 140, 160];

    app.innerHTML = `
      <div class="screen active-exercise">
        ${elapsed ? `<div class="workout-timer-bar" id="workout-duration">${elapsed}</div>` : ''}
        <div class="active-name">${activeExercise.name}</div>
        <img class="active-image" src="assets/exercises/${activeExercise.image}" alt="${activeExercise.name}" onerror="this.style.display='none'">
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
            ${weightOptions.filter(w => w >= 0 && w <= 100).map(w =>
              `<button class="weight-chip ${currentWeight == w ? 'active' : ''}" onclick="setWeight(${w})">${w}</button>`
            ).join('')}
          </div>
        </div>
        <button class="btn-done" onclick="completeSet()">CONCLUÍDO ✓</button>
        <button class="btn-back" onclick="cancelExercise()">Voltar</button>
      </div>
    `;
  }
}

function adjustWeight(delta) {
  const input = document.getElementById('weightInput');
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
  currentExercise = null;
  isResting = false;
  timer = 0;
  navigate('workout');
}

function completeSet() {
  const nextSet = currentSet + 1;
  const totalSets = activeExercise.sets;
  const weightVal = currentWeight ? parseFloat(currentWeight) : null;

  if (nextSet >= totalSets) {
    const setState = { completed: true, completedSets: totalSets, lastWeight: weightVal || '' };
    if (weightVal) setState.lastWeight = weightVal;
    exerciseStates[activeExercise.id] = setState;
    saveExerciseStates(currentGender, currentWorkout.id, exerciseStates);
    activeExercise = null;
    currentExercise = null;
    currentSet = 0;
    checkAllCompleted();
  } else {
    const setState = { completed: false, completedSets: nextSet, lastWeight: weightVal || '' };
    if (weightVal) setState.lastWeight = weightVal;
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
      renderActiveExercise();
    } else {
      updateTimerDisplay();
    }
  }, 1000);
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

    localStorage.setItem(`workout_date_${currentGender}_${currentWorkout.id}`, new Date().toISOString());

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
  }
  navigate('workout');
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
      <div class="modal-title">Parabéns!</div>
      <div class="completion-text">Você concluiu todos os exercícios de hoje!</div>
      ${duration ? `<div class="completion-duration">Tempo total: ${formatDuration(duration)}</div>` : ''}
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">Continuar</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showHistory() {
  navigate('history');
}

function renderHistory() {
  const history = loadHistory();
  const genderHistory = history.filter(h => h.gender === currentGender);

  let html = `
    <div class="screen">
      <div class="day-list-title">Histórico</div>
  `;

  if (genderHistory.length === 0) {
    html += `
      <div class="history-empty">
        <div class="history-empty-icon">📋</div>
        <div class="history-empty-text">Nenhum treino registrado ainda</div>
        <div class="history-empty-sub">Complete um treino para vê-lo aqui</div>
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

  html += `
    <div class="btn-row" style="justify-content: center; margin-top: 8px;">
      <button class="btn-back-days" onclick="goDayList()">← Voltar</button>
    </div>
  </div>`;
  app.innerHTML = html;
}

function resetProgress() {
  const days = workouts[currentGender];
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
        <div class="modal-day-name">${day.day}</div>
        <div class="modal-day-title">${day.title}</div>
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
  const day = workouts[currentGender].find(d => d.id === dayId);
  if (!confirm(`Zerar o treino de ${day.day} - ${day.title}?`)) return;

  const progress = loadProgress(currentGender);
  delete progress[dayId];
  saveProgress(currentGender, progress);

  localStorage.removeItem(`exercises_${currentGender}_${dayId}`);
  localStorage.removeItem(`workout_date_${currentGender}_${dayId}`);

  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();

  renderWorkout();
}

function handlePopState(e) {
  if (timerInterval) clearInterval(timerInterval);
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  activeExercise = null;
  currentExercise = null;
  isResting = false;
  timer = 0;
  workoutStartTime = null;

  if (e.state && e.state.view) {
    currentGender = e.state.gender || currentGender;
    renderView(e.state.view);
  } else {
    renderHome();
  }
}

function initFromUrl() {
  const hash = window.location.hash;
  if (!hash || hash === '#/') {
    renderHome();
    return;
  }

  const parts = hash.replace('#/', '').split('/');
  if (parts.length === 1 && (parts[0] === 'homem' || parts[0] === 'mulher')) {
    currentGender = parts[0];
    navigate('dayList', false);
  } else if (parts.length === 2 && parts[1] === 'history') {
    currentGender = parts[0];
    navigate('history', false);
  } else if (parts.length === 2) {
    currentGender = parts[0];
    currentWorkout = workouts[currentGender]?.find(d => d.id === parts[1]);
    if (currentWorkout) {
      exerciseStates = loadExerciseStates(currentGender, parts[1]);
      navigate('workout', false);
    } else {
      renderHome();
    }
  } else {
    renderHome();
  }
}

window.addEventListener('popstate', handlePopState);

loadWorkouts().then(() => {
  history.replaceState({ view: 'home' }, '', '#/');
  initFromUrl();
});
