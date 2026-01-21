export function WorldClock() {
    const container = document.createElement('div');
    container.className = 'view-container world-clock-view';

    // State
    let clocks = JSON.parse(localStorage.getItem('worldClocks')) || [
        { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'Local Time' }
    ];

    function renderClocks() {
        container.innerHTML = `
      <div class="header">
        <h1>World Clock</h1>
        <button class="add-btn" id="add-clock-btn">+</button>
      </div>
      <div class="clock-list">
        ${clocks.map((clock, index) => createClockHTML(clock, index)).join('')}
      </div>
    `;

        // Reanexa listeners
        container.querySelector('#add-clock-btn').onclick = promptAddClock;
    }

    function createClockHTML(clock, index) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            timeZone: clock.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const timeParts = timeString.split(':'); // Simples para hh:mm básico por enquanto

        // Calcula a diferença de tempo
        // Simplifica por enquanto mostrando apenas a hora

        return `
      <div class="clock-card">
        <div class="clock-info">
          <span class="clock-label">${clock.label}</span>
          <span class="clock-timezone">${clock.timezone}</span>
        </div>
        <div class="clock-time">${timeString}</div>
      </div>
    `;
    }

    function updateTimes() {
        const timeElements = container.querySelectorAll('.clock-time');
        timeElements.forEach((el, index) => {
            const clock = clocks[index];
            const now = new Date();
            el.textContent = now.toLocaleTimeString('en-US', {
                timeZone: clock.timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        });
    }

    function promptAddClock() {
        // Prompt simples temporário
        const tz = prompt("Enter Timezone (e.g., 'America/New_York' or 'Europe/London')", "UTC");
        if (tz) {
            try {
                // Valida timezone
                new Date().toLocaleString('en-US', { timeZone: tz });
                clocks.push({ timezone: tz, label: tz.split('/')[1] || tz });
                localStorage.setItem('worldClocks', JSON.stringify(clocks));
                renderClocks();
            } catch (e) {
                alert("Invalid Timezone");
            }
        }
    }

    renderClocks();

    const intervalId = setInterval(updateTimes, 1000);

    // Retorna objeto com elemento e cleanup
    return {
        element: container,
        cleanup: () => {
            clearInterval(intervalId);
        }
    };
}
