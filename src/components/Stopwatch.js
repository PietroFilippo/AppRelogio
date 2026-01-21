export function Stopwatch() {
    const container = document.createElement('div');
    container.className = 'view-container';

    let startTime = 0;
    let elapsed = 0;
    let intervalId = null;
    let isRunning = false;
    let laps = [];

    function formatTime(ms) {
        const date = new Date(ms);
        const m = String(date.getUTCMinutes()).padStart(2, '0');
        const s = String(date.getUTCSeconds()).padStart(2, '0');
        const cs = String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0');
        return `${m}:${s}.${cs}`;
    }

    function render() {
        container.innerHTML = `
      <div class="header">
        <h1>Stopwatch</h1>
      </div>
      <div class="stopwatch-display">${formatTime(elapsed)}</div>
      <div class="controls">
        <button class="control-btn ${isRunning ? 'stop' : 'start'}" id="toggle-btn">
          ${isRunning ? 'Stop' : 'Start'}
        </button>
        <button class="control-btn reset" id="lap-reset-btn">
          ${isRunning ? 'Lap' : 'Reset'}
        </button>
      </div>
      <div class="laps-list">
        ${laps.map((lap, index) => `
          <div class="lap-item">
            <span>Lap ${laps.length - index}</span>
            <span>${formatTime(lap)}</span>
          </div>
        `).join('')}
      </div>
    `;

        attachListeners();
    }

    function attachListeners() {
        container.querySelector('#toggle-btn').onclick = toggle;
        container.querySelector('#lap-reset-btn').onclick = lapOrReset;
    }

    function toggle() {
        if (isRunning) {
            stop();
        } else {
            start();
        }
        render();
    }

    function start() {
        startTime = Date.now() - elapsed;
        intervalId = setInterval(() => {
            elapsed = Date.now() - startTime;
            const display = container.querySelector('.stopwatch-display');
            if (display) display.textContent = formatTime(elapsed);
        }, 10);
        isRunning = true;
    }

    function stop() {
        clearInterval(intervalId);
        isRunning = false;
    }

    function lapOrReset() {
        if (isRunning) {
            laps.unshift(elapsed);
        } else {
            elapsed = 0;
            laps = [];
        }
        render();
    }

    render();

    return {
        element: container,
        cleanup: () => {
            clearInterval(intervalId);
        }
    };
}
