const CACHE_NAME = 'anttigravity-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icon.png',
  './shared/workouts.json',
];

const EXERCISE_IMAGES = [
  'abdominal.gif', 'afundo.gif', 'agachamento_smith.gif',
  'cadeira_abdutora.gif', 'cadeira_extensora.gif', 'cadeira_flexora.gif',
  'crucifixo.gif', 'desenvolvimmento_ombros.gif', 'elevacao_frontal.gif',
  'elevacao_lateral.gif', 'elevacao_pelvica.gif', 'encolhimento.gif',
  'leg_press45.gif', 'levantamento_terreo.gif', 'mesa_flexora.gif',
  'panturriha_em_pe.gif', 'panturrilha_banco_sentado.gif', 'peck_deck.gif',
  'prancha.gif', 'puxada_frontal.gif', 'remada_baixa.gif',
  'remada_curvada.gif', 'remada_unilateral.gif', 'rosca_direta.gif',
  'rosca_martelo.gif', 'rosca_Scott.gif', 'supino_inclinado.gif',
  'supino_reto.gif', 'supino_reto_altere.gif', 'triceps_frances.gif',
  'triceps_polia.gif', 'triceps_testa.gif',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c =>
      c.addAll([...ASSETS, ...EXERCISE_IMAGES.map(f => `assets/exercises/${f}`)])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match(e.request)))
  );
});
