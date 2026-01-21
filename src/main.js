import './style.css';
import { Navigation } from './components/Navigation.js';
import { WorldClock } from './components/WorldClock.js';
import { Alarm } from './components/Alarm.js';
import { Stopwatch } from './components/Stopwatch.js';
import { Timer } from './components/Timer.js';
import { alarmManager } from './modules/AlarmManager.js';

alarmManager.init(); // Inicia checagem de alarmes


const app = document.querySelector('#app');

let currentTab = localStorage.getItem('activeTab') || 'world-clock';
let activeComponentCleanup = null;

function render() {
  app.innerHTML = `
    <div class="app-container">
      <main id="content" class="content-area"></main>
      <footer id="nav-container"></footer>
    </div>
  `;

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

