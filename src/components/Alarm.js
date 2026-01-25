import { alarmManager } from '../modules/AlarmManager.js';
import { showModal } from '../utils/modal.js';

export function Alarm() {
  const container = document.createElement('div');
  container.className = 'view-container';

  let isEditing = false;

  function render() {
    const alarms = alarmManager.getAlarms();
    const snoozed = alarmManager.getSnoozedAlarms();
    // Ordena os ativados primeiro, depois por horário
    alarms.sort((a, b) => a.time.localeCompare(b.time));

    container.innerHTML = `
      <div class="header">
        <button class="edit-btn" id="edit-alarm-btn">${isEditing ? 'Done' : 'Edit'}</button>
        <h1>Alarm</h1>
        <div style="display: flex; gap: 10px;">
            <button class="add-btn" id="audio-settings-btn" style="visibility: ${isEditing ? 'hidden' : 'visible'}; font-size: 14px; width: auto; padding: 0 10px;">Sound</button>
            <button class="add-btn" id="add-alarm-btn" style="visibility: ${isEditing ? 'hidden' : 'visible'}">+</button>
        </div>
      </div>
      <div class="alarm-list ${isEditing ? 'edit-mode' : ''}">
        ${alarms.length === 0 ? '<p style="text-align:center; color:var(--text-secondary); margin-top:50px;">No Alarms</p>' : ''}
        ${alarms.map(alarm => {
      const isSnoozing = snoozed[alarm.id];
      // Formata o rótulo ou status de snooze
      let labelText = alarm.label;
      let subTextClass = 'alarm-label';

      if (isSnoozing) {
        labelText = `Snoozing until ${isSnoozing}`;
        subTextClass = 'alarm-label snoozing'; // Adiciona CSS
      } else if (alarm.repeat && alarm.repeat.length > 0) {
        labelText += `, ${formatDays(alarm.repeat)}`;
      }

      return `
          <div class="alarm-item" style="position:relative;">
             ${isEditing ? `<button class="delete-clock-btn" data-id="${alarm.id}">−</button>` : ''}
             
            <div class="alarm-info" data-id="${alarm.id}" style="padding-left: ${isEditing ? '40px' : '0'}; transition: padding 0.3s; cursor: pointer; width: 100%;">
              <span class="alarm-time ${!alarm.enabled ? 'disabled' : ''}">${alarm.time}</span>
              <span class="${subTextClass}" style="${isSnoozing ? 'color: var(--accent-orange);' : ''}">${labelText}</span>
            </div>
            
            ${!isEditing ? `
                <label class="switch">
                <input type="checkbox" class="alarm-toggle" data-id="${alarm.id}" ${alarm.enabled ? 'checked' : ''}>
                <span class="slider round"></span>
                </label>
            ` : `<div style="width: 50px;"></div>`}
            
          </div>
        `}).join('')}
      </div>
    `;

    attachListeners();
  }

  function formatDays(days) {
    if (!days || days.length === 0) return '';
    if (days.length === 7) return 'Every day';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
  }

  function attachListeners() {
    container.querySelector('#add-alarm-btn').onclick = () => openAlarmModal();
    container.querySelector('#audio-settings-btn').onclick = () => openAudioSettingsModal();
    container.querySelector('#edit-alarm-btn').onclick = () => {
      isEditing = !isEditing;
      render();
    };

    container.querySelectorAll('.alarm-toggle').forEach(toggle => {
      toggle.onchange = (e) => {
        e.stopPropagation();
        const id = Number(e.target.dataset.id);
        alarmManager.toggleAlarm(id);
        render();
      };
    });

    // Edita clicando no item
    container.querySelectorAll('.alarm-info').forEach(info => {
      info.onclick = (e) => {
        // abre modal de edição mesmo no modo de edição (no estilo iOS)
        const id = Number(e.currentTarget.dataset.id);
        openAlarmModal(id);
      };
    });

    if (isEditing) {
      container.querySelectorAll('.delete-clock-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = Number(e.currentTarget.dataset.id);
          alarmManager.deleteAlarm(id);
          render();
        };
      });
    }
  }

  function openAudioSettingsModal() {
    const volume = alarmManager.getVolume();
    const customSounds = alarmManager.getCustomSounds();

    const content = `
        <div class="audio-settings">
            <div class="audio-controls">
                <label>Master Volume</label>
                <div class="volume-slider-container">
                    <span id="vol-low">🔈</span>
                    <input type="range" id="master-volume" class="volume-slider" min="0" max="1" step="0.1" value="${volume}">
                    <span id="vol-high">🔊</span>
                </div>
            </div>

            <label style="display:block; margin-bottom:10px;">Custom Sounds (${customSounds.length}/10)</label>
            <div class="custom-sound-list" id="custom-sound-list">
                ${customSounds.map(s => `
                    <div class="custom-sound-item">
                        <span class="custom-sound-name">${s.name}</span>
                        <div class="sound-actions">
                            <button class="sound-btn play-preview" data-id="${s.id}" data-src="${s.data}">▶</button>
                            <button class="sound-btn delete" data-id="${s.id}">🗑</button>
                        </div>
                    </div>
                `).join('')}
                ${customSounds.length === 0 ? '<div style="text-align:center; color:#555; padding:10px;">No custom sounds</div>' : ''}
            </div>

            ${customSounds.length < 10 ? `
            <div class="file-input-wrapper">
                <div class="upload-btn">Upload Sound (Max 2MB)</div>
                <input type="file" id="sound-upload" accept="audio/*">
            </div>
            ` : '<div style="text-align:center; color:var(--accent-red);">Limit reached (10/10)</div>'}
        </div>
      `;

    const overlay = showModal({
      title: 'Audio Settings',
      content,
      onSave: () => { } // Save is unnecessary as changes are instant, but button closes modal
    });

    // Hide Cancel/Save buttons or rename Save to Close?
    // "Save" button acts as Close here. We can rename it.
    overlay.querySelector('.modal-btn.save').textContent = 'Done';
    overlay.querySelector('.modal-btn.cancel').style.display = 'none';

    // Attach Listeners
    const volumeSlider = overlay.querySelector('#master-volume');
    volumeSlider.oninput = (e) => {
      alarmManager.setVolume(Number(e.target.value));
    };

    // Upload
    const uploadInput = overlay.querySelector('#sound-upload');
    if (uploadInput) {
      uploadInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB
          alert('File too large (Max 2MB)');
          return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const base64 = loadEvent.target.result;
          const name = file.name.split('.')[0]; // remove extension for label
          if (alarmManager.addCustomSound(name, base64)) {
            overlay.remove(); // Close and re-open to refresh list (lazy way)
            openAudioSettingsModal(); // Re-open
          }
        };
        reader.readAsDataURL(file);
      };
    }

    // List Actions
    overlay.querySelectorAll('.play-preview').forEach(btn => {
      btn.onclick = () => {
        const src = btn.dataset.src;
        const audio = new Audio(src);
        audio.volume = alarmManager.getVolume();
        audio.play();
      };
    });

    overlay.querySelectorAll('.delete').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Delete this sound?')) {
          alarmManager.deleteCustomSound(btn.dataset.id);
          overlay.remove();
          openAudioSettingsModal();
        }
      };
    });
  }

  function openAlarmModal(existingId = null) {
    let alarm = {
      time: '08:00',
      label: '',
      repeat: [],
      sound: 'default',
      snoozeEnabled: true,
      snoozeInterval: 5
    };

    if (existingId) {
      const found = alarmManager.getAlarms().find(a => a.id === existingId);
      if (found) alarm = { ...found };
    }

    const customSounds = alarmManager.getCustomSounds();

    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const content = `
            <div style="text-align:center; padding: 20px 0;">
                <input type="time" id="modal-time" value="${alarm.time}" style="font-size: 48px; background: transparent; border: none; color: white; font-family: inherit;">
            </div>
            
            <div class="modal-section">
                <div class="day-selector">
                    ${days.map((d, i) => `
                        <div class="day-option ${alarm.repeat.includes(i) ? 'selected' : ''}" data-day="${i}">${d}</div>
                    `).join('')}
                </div>
            </div>

            <div class="modal-section">
                <div class="modal-row">
                    <span>Label</span>
                    <input type="text" id="modal-label" value="${alarm.label}" placeholder="Alarm">
                </div>
                <div class="modal-row">
                    <span>Sound</span>
                    <select id="modal-sound">
                        <option value="default" ${alarm.sound === 'default' ? 'selected' : ''}>Radar (Default)</option>
                        ${customSounds.map(s => `<option value="${s.id}" ${alarm.sound === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                </div>
                <div class="modal-row">
                    <span>Snooze</span>
                    <label class="switch">
                        <input type="checkbox" id="modal-snooze" ${alarm.snoozeEnabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="modal-row" id="snooze-duration-row" style="display: ${alarm.snoozeEnabled ? 'flex' : 'none'}; flex-direction: column; align-items: stretch; gap: 10px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span>Duration</span>
                        <span id="snooze-val-display" style="color:var(--text-secondary)">${alarm.snoozeInterval} min</span>
                    </div>
                    <input type="range" id="modal-snooze-interval" min="1" max="30" value="${alarm.snoozeInterval}" style="width: 100%; accent-color: var(--accent-orange);"> 
                </div>
            </div>
        `;

    showModal({
      title: existingId ? 'Edit Alarm' : 'Add Alarm',
      content: content,
      onSave: (overlay) => {
        const time = overlay.querySelector('#modal-time').value;
        const label = overlay.querySelector('#modal-label').value;
        const sound = overlay.querySelector('#modal-sound').value;
        const snoozeEnabled = overlay.querySelector('#modal-snooze').checked;
        const snoozeInterval = Number(overlay.querySelector('#modal-snooze-interval').value);

        // Obtém os dias selecionados
        const selectedDays = [];
        overlay.querySelectorAll('.day-option.selected').forEach(el => {
          selectedDays.push(Number(el.dataset.day));
        });

        const data = {
          time,
          label,
          repeat: selectedDays,
          sound,
          snoozeEnabled,
          snoozeInterval
        };

        if (existingId) {
          alarmManager.updateAlarm(existingId, data);
        } else {
          alarmManager.addAlarm(data);
        }
        render();
      }
    });

    // Lógica pós-interação pra interatividade no modal
    setTimeout(() => {
      const overlay = document.querySelector('.modal-overlay');
      if (!overlay) return;

      overlay.querySelectorAll('.day-option').forEach(opt => {
        opt.onclick = () => {
          opt.classList.toggle('selected');
        };
      });

      const snoozeToggle = overlay.querySelector('#modal-snooze');
      const snoozeRow = overlay.querySelector('#snooze-duration-row');
      const snoozeInput = overlay.querySelector('#modal-snooze-interval');
      const snoozeDisplay = overlay.querySelector('#snooze-val-display');

      snoozeToggle.onchange = (e) => {
        snoozeRow.style.display = e.target.checked ? 'flex' : 'none';
      };

      snoozeInput.oninput = (e) => {
        snoozeDisplay.textContent = `${e.target.value} min`;
      };
    }, 100);
  }

  // Atualizações externas (ex: alarme disparado e desabilitado)
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
