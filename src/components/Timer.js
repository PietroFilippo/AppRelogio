export function Timer() {
    const container = document.createElement('div');
    container.className = 'view-container';

    let totalSeconds = 0;
    let remainingSeconds = 0;
    let intervalId = null;
    let isRunning = false;
    let isPaused = false;

    const radius = 140;
    const circumference = radius * 2 * Math.PI;

    function render() {
        if (isRunning || isPaused) {
            renderRunning();
        } else {
            renderPicker();
        }
    }

    function renderPicker() {
        container.innerHTML = `
      <div class="header"><h1>Timer</h1></div>
      <div class="timer-picker">
        <div class="picker-col">
           <input type="number" id="hours" class="timer-input" min="0" max="23" value="0">
           <div class="timer-label">hours</div>
        </div>
        <div class="picker-col">
           <input type="number" id="minutes" class="timer-input" min="0" max="59" value="0">
           <div class="timer-label">min</div>
        </div>
        <div class="picker-col">
           <input type="number" id="seconds" class="timer-input" min="0" max="59" value="0">
           <div class="timer-label">sec</div>
        </div>
      </div>
      <div class="controls" style="justify-content: center;">
        <button class="control-btn start" id="start-btn">Start</button>
      </div>
    `;
        container.querySelector('#start-btn').onclick = start;
    }

    function renderRunning() {
        container.innerHTML = `
      <div class="header"><h1>Timer</h1></div>
      <div class="timer-display-container">
        <svg class="progress-ring" width="300" height="300">
          <circle 
            class="progress-ring__circle"
            stroke="var(--accent-orange)"
            stroke-width="8"
            fill="transparent"
            r="${radius}"
            cx="150"
            cy="150"
            style="stroke-dasharray: ${circumference} ${circumference}; stroke-dashoffset: ${circumference};"
          />
        </svg>
        <div class="timer-display-text">${formatTime(remainingSeconds)}</div>
      </div>
      <div class="controls">
        <button class="control-btn stop" id="cancel-btn">Cancel</button>
        <button class="control-btn ${isPaused ? 'start' : 'pause'}" id="pause-btn">
          ${isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
    `;

        updateProgress(remainingSeconds);
        container.querySelector('#cancel-btn').onclick = cancel;
        container.querySelector('#pause-btn').onclick = togglePause;
    }

    function formatTime(totalSecs) {
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function start() {
        const h = Number(container.querySelector('#hours').value);
        const m = Number(container.querySelector('#minutes').value);
        const s = Number(container.querySelector('#seconds').value);

        totalSeconds = h * 3600 + m * 60 + s;
        if (totalSeconds <= 0) return;

        remainingSeconds = totalSeconds;
        isRunning = true;
        isPaused = false;

        renderRunning();
        intervalId = setInterval(tick, 1000);
        // Update inicial
        updateProgress(remainingSeconds);
    }

    function tick() {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            const textDisplay = container.querySelector('.timer-display-text');
            if (textDisplay) textDisplay.textContent = formatTime(remainingSeconds);
            updateProgress(remainingSeconds);
        } else {
            finish();
        }
    }

    function updateProgress(remaining) {
        const circle = container.querySelector('.progress-ring__circle');
        if (circle) {
            const offset = circumference - (remaining / totalSeconds) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }

    function togglePause() {
        if (isPaused) {
            isPaused = false;
            intervalId = setInterval(tick, 1000);
            renderRunning();
        } else {
            isPaused = true;
            clearInterval(intervalId);
            renderRunning();
        }
    }

    function cancel() {
        clearInterval(intervalId);
        isRunning = false;
        isPaused = false;
        renderPicker();
    }

    function finish() {
        clearInterval(intervalId);
        isRunning = false;
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(console.error);
        alert("Timer Finished!");
        renderPicker();
    }

    render();

    return {
        element: container,
        cleanup: () => {
            clearInterval(intervalId);
        }
    };
}
