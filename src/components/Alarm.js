import { alarmManager } from '../modules/AlarmManager.js';
import { showModal } from '../utils/modal.js';

export function Alarm() {
    const container = document.createElement('div');
    container.className = 'view-container';

    function render() {
        const alarms = alarmManager.getAlarms();
        alarms.sort((a, b) => a.time.localeCompare(b.time));

        container.innerHTML = `
      <div class="header">
        <h1>Alarm</h1>
        <button class="add-btn" id="add-alarm-btn">+</button>
      </div>
      <div class="alarm-list">
        ${alarms.length === 0 ? '<p style="text-align:center; color:var(--text-secondary)">No Alarms</p>' : ''}
        ${alarms.map(alarm => `
          <div class="alarm-item">
            <div class="alarm-info">
              <span class="alarm-time ${!alarm.enabled ? 'disabled' : ''}">${alarm.time}</span>
              <span class="alarm-label">${alarm.label}${alarm.repeat ? ', Repeat' : ''}</span>
            </div>
            <label class="switch">
              <input type="checkbox" class="alarm-toggle" data-id="${alarm.id}" ${alarm.enabled ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
            <button class="delete-btn" data-id="${alarm.id}">🗑️</button>
          </div>
        `).join('')}
      </div>
    `;

        attachListeners();
    }

    function attachListeners() {
        container.querySelector('#add-alarm-btn').onclick = promptAddAlarm;

        container.querySelectorAll('.alarm-toggle').forEach(toggle => {
            toggle.onchange = (e) => {
                const id = Number(e.target.dataset.id);
                alarmManager.toggleAlarm(id);
                render(); // Re-render para atualizar o estilo
            };
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = Number(e.target.dataset.id);
                if (confirm('Delete this alarm?')) {
                    alarmManager.deleteAlarm(id);
                    render();
                }
            };
        });
    }

    function promptAddAlarm() {
        showModal({
            title: 'Add Alarm',
            content: `
        <input type="time" id="alarm-time-input" class="modal-input" value="07:00">
        <input type="text" id="alarm-label-input" class="modal-input" placeholder="Label" value="Alarm">
        <select id="alarm-sound-input" class="modal-input">
          <option value="default">Default Sound</option>
          <option value="beep">Beep</option>
        </select>
        <label style="display:flex; align-items:center; gap:10px; font-size:14px;">
           <input type="checkbox" id="alarm-repeat-input"> Repeat
        </label>
      `,
            onSave: (overlay) => {
                const time = overlay.querySelector('#alarm-time-input').value;
                const label = overlay.querySelector('#alarm-label-input').value;
                const repeat = overlay.querySelector('#alarm-repeat-input').checked;

                if (time) {
                    alarmManager.addAlarm(time, label, repeat);
                    render();
                }
            }
        });
    }

    // Escuta updates externos (ex: alarme disparado e desabilitado)
    function onAlarmsUpdated() {
        render();
    }
    document.addEventListener('alarms-updated', onAlarmsUpdated);

    render();

    return {
        element: container,
        cleanup: () => {
            document.removeEventListener('alarms-updated', onAlarmsUpdated);
        }
    };
}
