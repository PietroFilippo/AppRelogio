import './style.css';
import { Navigation } from './components/Navigation.js';
import { WorldClock } from './components/WorldClock.js';
import { Alarm } from './components/Alarm.js';
import { Stopwatch } from './components/Stopwatch.js';
import { Timer } from './components/Timer.js';
import { Settings } from './components/Settings.js';
import { alarmManager } from './modules/AlarmManager.js';
import { timerManager } from './modules/TimerManager.js';
import { showModal } from './utils/modal.js';

alarmManager.init();


// Helper pra rastrear o modal aberto
let currentOverlay = null;

function onAlarmRing(e) {
  const { alarm, isSnooze } = e.detail;
  const overlay = showModal({
    title: alarm.label || '',
    content: `
              <div style="text-align:center;">
                  <h1 style="font-size:60px; margin:20px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:block;">${alarm.time}</h1>
                  ${alarm.snoozeEnabled ? `<button class="modal-btn snooze-btn" style="background:var(--accent-orange); color:black; width:100%; margin-bottom:10px;">Snooze (${alarm.snoozeInterval || 9} min)</button>` : ''}
              </div>
          `,
    onSave: () => {
      alarmManager.stopAlarm(alarm.id);
      currentOverlay = null;
    }
  });
  currentOverlay = { element: overlay, type: 'alarm', id: alarm.id };

  const snoozeBtn = overlay.querySelector('.snooze-btn');
  if (snoozeBtn) {
    snoozeBtn.onclick = () => {
      alarmManager.snoozeAlarm(alarm.id);
      overlay.remove();
      currentOverlay = null;
    };
  }

  // Desativa o botão Cancelar e o clique no fundo pro modal
  overlay.querySelector('.cancel').style.display = 'none';
  overlay.onclick = null;

  const saveBtn = overlay.querySelector('.modal-btn.save');
  if (saveBtn) {
    saveBtn.textContent = 'Stop';
    saveBtn.style.background = 'var(--accent-red)';
    saveBtn.style.color = 'white';
  }
}

document.addEventListener('alarm-ring', onAlarmRing);

function onTimerRing(e) {
  const { label } = e.detail;
  const overlay = showModal({
    title: 'Timer',
    content: `
              <div style="text-align:center;">
                  <h1 style="font-size:34px; margin:20px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:block; padding: 0 10px;">${label}</h1>
                  <p style="color:var(--text-secondary); font-size:24px;">Time is up!</p>
              </div>
          `,
    onSave: () => {
      alarmManager.stopAudio(); // Para o som
      currentOverlay = null;
    }
  });

  currentOverlay = { element: overlay, type: 'timer' };

  // Estilo similar ao alarme
  overlay.querySelector('.cancel').style.display = 'none';
  overlay.onclick = null;

  const saveBtn = overlay.querySelector('.modal-btn.save');
  if (saveBtn) {
    saveBtn.textContent = 'Stop';
    saveBtn.style.background = 'var(--accent-red)';
    saveBtn.style.color = 'white';
  }
}

document.addEventListener('timer-ring', onTimerRing);

// Listener pra requisições externas de parada (ex: de Notificação)
document.addEventListener('timer-stop-requested', () => {
  if (currentOverlay && currentOverlay.type === 'timer') {
    currentOverlay.element.remove();
    currentOverlay = null;
  }
});

document.addEventListener('alarm-stop-requested', (e) => {
  if (currentOverlay && currentOverlay.type === 'alarm' && currentOverlay.id === e.detail.id) {
    currentOverlay.element.remove();
    currentOverlay = null;
  }
});

document.addEventListener('alarm-snooze-requested', (e) => {
  if (currentOverlay && currentOverlay.type === 'alarm' && currentOverlay.id === e.detail.id) {
    currentOverlay.element.remove();
    currentOverlay = null;
  }
});


const app = document.querySelector('#app');

let currentTab = localStorage.getItem('activeTab') || 'world-clock';
let activeComponentCleanup = null;

function render() {
  app.innerHTML = `
    <div class="app-container">
      <div id="title-bar" class="title-bar">
        <div class="title-bar-drag"></div>
        <div class="title-bar-controls">
          <button id="min-btn" class="title-btn">−</button>
          <button id="max-btn" class="title-btn">▢</button>
          <button id="close-btn" class="title-btn">×</button>
        </div>
      </div>
      <main id="content" class="content-area"></main>
      <footer id="nav-container"></footer>
    </div>
  `;

  // Window Controls Listeners
  const minBtn = app.querySelector('#min-btn');
  const maxBtn = app.querySelector('#max-btn');
  const closeBtn = app.querySelector('#close-btn');

  if (window.electronAPI) {
    if (minBtn) minBtn.onclick = () => window.electronAPI.minimizeWindow();
    if (maxBtn) maxBtn.onclick = () => window.electronAPI.maximizeWindow();
    if (closeBtn) closeBtn.onclick = () => window.electronAPI.closeWindow();
  }

  const navContainer = app.querySelector('#nav-container');

  // Render Navigation
  navContainer.appendChild(Navigation(currentTab, (newTab) => {
    if (currentTab === newTab) return;
    currentTab = newTab;
    localStorage.setItem('activeTab', currentTab);
    updateView();
    updateNav();
  }));

  updateView();
}

function updateView() {
  const contentArea = document.querySelector('#content');

  // Limpa componente anterior
  if (activeComponentCleanup) {
    activeComponentCleanup();
    activeComponentCleanup = null;
  }

  contentArea.innerHTML = ''; // Limpa view atual

  let componentResult;
  switch (currentTab) {
    case 'world-clock': componentResult = WorldClock(); break;
    case 'alarm': componentResult = Alarm(); break;
    case 'stopwatch': componentResult = Stopwatch(); break;
    case 'timer': componentResult = Timer(); break;
    case 'settings': componentResult = Settings(); break;
    default: componentResult = WorldClock();
  }

  // Gerencia tanto DOM Node quanto { element, cleanup } returns
  if (componentResult instanceof Node) {
    contentArea.appendChild(componentResult);
  } else if (componentResult && componentResult.element) {
    contentArea.appendChild(componentResult.element);
    if (componentResult.cleanup) {
      activeComponentCleanup = componentResult.cleanup;
    }
  }
}

function updateNav() {
  const navContainer = document.querySelector('#nav-container');
  navContainer.innerHTML = '';
  navContainer.appendChild(Navigation(currentTab, (newTab) => {
    if (currentTab === newTab) return;
    currentTab = newTab;
    localStorage.setItem('activeTab', currentTab);
    updateView();
    updateNav();
  }));
}


render();

