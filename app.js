const REST_TIME = 90;

const workouts = {
  homem: [
    {
      id: 'h1', day: 'Segunda', title: 'Peito e Tríceps', restDay: false,
      exercises: [
        { id: 'h1e1', name: 'Supino Reto', sets: 3, reps: '8-12', image: 'supino_reto.gif' },
        { id: 'h1e2', name: 'Supino Inclinado', sets: 3, reps: '8-12', image: 'supino_inclinado.gif' },
        { id: 'h1e3', name: 'Peck Deck', sets: 3, reps: '10-15', image: 'peck_deck.gif' },
        { id: 'h1e4', name: 'Crucifixo', sets: 3, reps: '10-15', image: 'crucifixo.gif' },
        { id: 'h1e5', name: 'Tríceps na Polia', sets: 3, reps: '10-15', image: 'triceps_polia.gif' },
        { id: 'h1e6', name: 'Tríceps Francês', sets: 3, reps: '10-12', image: 'triceps_frances.gif' },
      ],
    },
    {
      id: 'h2', day: 'Terça', title: 'Costas e Bíceps', restDay: false,
      exercises: [
        { id: 'h2e1', name: 'Puxada Frontal', sets: 3, reps: '8-12', image: 'puxada_frontal.gif' },
        { id: 'h2e2', name: 'Remada Baixa', sets: 3, reps: '8-12', image: 'remada_baixa.gif' },
        { id: 'h2e3', name: 'Remada Unilateral', sets: 3, reps: '10-12', image: 'remada_unilateral.gif' },
        { id: 'h2e4', name: 'Rosca Direta', sets: 3, reps: '8-12', image: 'rosca_direta.gif' },
        { id: 'h2e5', name: 'Rosca Martelo', sets: 3, reps: '10-12', image: 'rosca_martelo.gif' },
        { id: 'h2e6', name: 'Rosca Scott', sets: 3, reps: '10-12', image: 'rosca_Scott.gif' },
      ],
    },
    {
      id: 'h3', day: 'Quarta', title: 'Descanso', restDay: true, exercises: [],
    },
    {
      id: 'h4', day: 'Quinta', title: 'Pernas', restDay: false,
      exercises: [
        { id: 'h4e1', name: 'Leg Press', sets: 3, reps: '8-12', image: 'leg_press45.gif' },
        { id: 'h4e2', name: 'Cadeira Extensora', sets: 3, reps: '10-15', image: 'cadeira_extensora.gif' },
        { id: 'h4e3', name: 'Mesa Flexora', sets: 3, reps: '10-15', image: 'mesa_flexora.gif' },
        { id: 'h4e4', name: 'Panturrilha Banco Sentado', sets: 4, reps: '10-15', image: 'panturrilha_banco_sentado.gif' },
        { id: 'h4e5', name: 'Panturrilha em Pé', sets: 4, reps: '10-15', image: 'panturriha_em_pe.gif' },
      ],
    },
    {
      id: 'h5', day: 'Sexta', title: 'Ombros e Abdômen', restDay: false,
      exercises: [
        { id: 'h5e1', name: 'Desenvolvimento de Ombros', sets: 3, reps: '8-12', image: 'desenvolvimmento_ombros.gif' },
        { id: 'h5e2', name: 'Elevação Lateral', sets: 3, reps: '10-15', image: 'elevacao_lateral.gif' },
        { id: 'h5e3', name: 'Elevação Frontal', sets: 3, reps: '10-15', image: 'elevacao_frontal.gif' },
        { id: 'h5e4', name: 'Encolhimento', sets: 3, reps: '10-15', image: 'encolhimento.gif' },
        { id: 'h5e5', name: 'Abdominal', sets: 3, reps: '15-20', image: 'abdominal.gif' },
      ],
    },
  ],
  mulher: [
    {
      id: 'm1', day: 'Segunda', title: 'Inferior A (Foco Perna)', restDay: false,
      exercises: [
        { id: 'm1e1', name: 'Agachamento no Smith', sets: 4, reps: '10-12', image: 'agachamento_smith.gif' },
        { id: 'm1e2', name: 'Leg Press 45°', sets: 3, reps: '10-12', image: 'leg_press45.gif' },
        { id: 'm1e3', name: 'Cadeira Extensora', sets: 3, reps: '12-15', image: 'cadeira_extensora.gif' },
        { id: 'm1e4', name: 'Mesa Flexora', sets: 3, reps: '12-15', image: 'mesa_flexora.gif' },
        { id: 'm1e5', name: 'Panturrilha em Pé', sets: 3, reps: '15', image: 'panturriha_em_pe.gif' },
        { id: 'm1e6', name: 'Prancha', sets: 3, reps: '30s', image: 'prancha.gif' },
      ],
    },
    {
      id: 'm2', day: 'Terça', title: 'Superior A (Peito/Costas/Ombro)', restDay: false,
      exercises: [
        { id: 'm2e1', name: 'Supino Reto com Halter', sets: 4, reps: '10-12', image: 'supino_reto_altere.gif' },
        { id: 'm2e2', name: 'Puxada Frente', sets: 4, reps: '10-12', image: 'puxada_frontal.gif' },
        { id: 'm2e3', name: 'Remada Baixa', sets: 3, reps: '10-12', image: 'remada_baixa.gif' },
        { id: 'm2e4', name: 'Desenvolvimento com Halter', sets: 3, reps: '10-12', image: 'desenvolvimmento_ombros.gif' },
        { id: 'm2e5', name: 'Tríceps Polia', sets: 3, reps: '12-15', image: 'triceps_polia.gif' },
        { id: 'm2e6', name: 'Rosca Direta', sets: 3, reps: '12-15', image: 'rosca_direta.gif' },
      ],
    },
    {
      id: 'm3', day: 'Quarta', title: 'Descanso', restDay: true, exercises: [],
    },
    {
      id: 'm4', day: 'Quinta', title: 'Inferior B (Foco Glúteo/Posterior)', restDay: false,
      exercises: [
        { id: 'm4e1', name: 'Levantamento Terra Romeno', sets: 3, reps: '10-12', image: 'levantamento_terreo.gif' },
        { id: 'm4e2', name: 'Afundo', sets: 3, reps: '10 cada perna', image: 'afundo.gif' },
        { id: 'm4e3', name: 'Cadeira Abdutora', sets: 3, reps: '15', image: 'cadeira_abdutora.gif' },
        { id: 'm4e4', name: 'Cadeira Flexora', sets: 3, reps: '12-15', image: 'cadeira_flexora.gif' },
        { id: 'm4e5', name: 'Elevação Pélvica', sets: 3, reps: '12', image: 'elevacao_pelvica.gif' },
      ],
    },
    {
      id: 'm5', day: 'Sexta', title: 'Superior B (Foco Braço e Definição)', restDay: false,
      exercises: [
        { id: 'm5e1', name: 'Supino Inclinado Banco', sets: 3, reps: '10-12', image: 'supino_inclinado.gif' },
        { id: 'm5e2', name: 'Remada Curvada com Halter', sets: 3, reps: '10-12', image: 'remada_curvada.gif' },
        { id: 'm5e3', name: 'Elevação Lateral', sets: 3, reps: '12-15', image: 'elevacao_lateral.gif' },
        { id: 'm5e4', name: 'Peck Deck', sets: 3, reps: '12-15', image: 'peck_deck.gif' },
        { id: 'm5e5', name: 'Rosca Martelo', sets: 3, reps: '12', image: 'rosca_martelo.gif' },
        { id: 'm5e6', name: 'Tríceps Testa com Halter', sets: 3, reps: '12', image: 'triceps_testa.gif' },
      ],
    },
  ],
};

const app = document.getElementById('app');
let currentGender = null;
let currentWorkout = null;
let exerciseStates = {};
let activeExercise = null;
let currentSet = 0;
let timer = 0;
let timerInterval = null;
let isResting = false;

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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderHome() {
  app.innerHTML = `
    <div class="screen home">
      <div class="home-title">ANTIGRAVITY</div>
      <div class="home-subtitle">Escolha seu treino</div>
      <button class="home-btn" onclick="selectGender('homem')">HOMEM</button>
      <button class="home-btn female" onclick="selectGender('mulher')">MULHER</button>
    </div>
  `;
}

function selectGender(gender) {
  currentGender = gender;
  exerciseStates = {};
  renderDayList();
}

function renderDayList() {
  const days = workouts[currentGender];
  const progress = loadProgress(currentGender);

  let html = `
    <div class="screen">
      <div class="day-list-title">${currentGender === 'homem' ? 'HOMEM' : 'MULHER'}</div>
  `;

  days.forEach(day => {
    const completed = progress[day.id] === true;
    const cardClass = day.restDay ? 'day-card rest' : completed ? 'day-card completed' : 'day-card';
    const titleClass = day.restDay ? 'day-title rest-text' : 'day-title';

    html += `
      <div class="${cardClass}" ${!day.restDay ? `onclick="selectDay('${day.id}')"` : ''}>
        <div class="day-header">
          <span class="day-name">${day.day}</span>
          ${completed ? '<span class="day-check">✓</span>' : ''}
        </div>
        <div class="${titleClass}">${day.title}</div>
        ${!day.restDay ? `<div class="day-count">${day.exercises.length} exercícios</div>` : ''}
      </div>
    `;
  });

  html += `</div>`;
  app.innerHTML = html;
}

function selectDay(dayId) {
  currentWorkout = workouts[currentGender].find(d => d.id === dayId);
  exerciseStates = loadExerciseStates(currentGender, dayId);
  activeExercise = null;
  renderWorkout();
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

    html += `
      <div class="exercise-card ${completed ? 'completed' : ''}" onclick="startExercise('${ex.id}')">
        <div class="exercise-row">
          <img class="exercise-thumb" src="assets/exercises/${ex.image}" alt="${ex.name}" onerror="this.style.display='none'">
          <div class="exercise-info">
            <div class="exercise-name ${completed ? 'done' : ''}">${ex.name}</div>
            <div class="exercise-details">${ex.sets}x ${ex.reps}</div>
            ${!completed && completedSets > 0 ? `<div class="exercise-progress">Séries: ${completedSets}/${ex.sets}</div>` : ''}
          </div>
          ${completed ? '<span class="exercise-check">✓</span>' : ''}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  app.innerHTML = html;
}

function startExercise(exerciseId) {
  activeExercise = currentWorkout.exercises.find(e => e.id === exerciseId);
  const state = exerciseStates[activeExercise.id] || {};
  currentSet = state.completedSets || 0;
  isResting = false;
  timer = 0;
  if (timerInterval) clearInterval(timerInterval);
  renderActiveExercise();
}

function renderActiveExercise() {
  if (isResting) {
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - timer / REST_TIME);

    app.innerHTML = `
      <div class="screen active-exercise">
        <div class="active-name">${activeExercise.name}</div>
        <img class="active-image" src="assets/exercises/${activeExercise.image}" alt="${activeExercise.name}" onerror="this.style.display='none'">
        <div class="active-reps">Repetições: ${activeExercise.reps}</div>
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
    app.innerHTML = `
      <div class="screen active-exercise">
        <div class="active-name">${activeExercise.name}</div>
        <img class="active-image" src="assets/exercises/${activeExercise.image}" alt="${activeExercise.name}" onerror="this.style.display='none'">
        <div class="active-reps">Repetições: ${activeExercise.reps}</div>
        <div class="set-info">Série ${currentSet + 1} de ${activeExercise.sets}</div>
        <button class="btn-done" onclick="completeSet()">CONCLUÍDO ✓</button>
        <button class="btn-back" onclick="cancelExercise()">Voltar</button>
      </div>
    `;
  }
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
  renderWorkout();
}

function completeSet() {
  const nextSet = currentSet + 1;
  const totalSets = activeExercise.sets;

  if (nextSet >= totalSets) {
    exerciseStates[activeExercise.id] = { completed: true, completedSets: totalSets };
    saveExerciseStates(currentGender, currentWorkout.id, exerciseStates);
    activeExercise = null;
    currentSet = 0;
    checkAllCompleted();
  } else {
    exerciseStates[activeExercise.id] = { completed: false, completedSets: nextSet };
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
      renderActiveExercise();
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
    alert('Parabéns! Você concluiu todos os exercícios de hoje!');
    renderWorkout();
  } else {
    renderWorkout();
  }
}

renderHome();
