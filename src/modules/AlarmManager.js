import { timerManager } from './TimerManager.js';
import { showAlert } from '../utils/notification.js';

export class AlarmManager {
    constructor() {
        this.alarms = JSON.parse(localStorage.getItem('alarms')) || [];
        this.customSounds = JSON.parse(localStorage.getItem('customSounds')) || [];
        this.volume = parseFloat(localStorage.getItem('alarmVolume')) || 1.0;
        this.permissionsGranted = false;
        this.checkInterval = null;
        this.audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Som default
        this.audio.volume = this.volume;
        this.snoozedAlarms = {};
        this.ringingAlarms = new Set();
        this.lastUsedSound = localStorage.getItem('lastUsedSound') || 'default';
    }

    init() {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                this.permissionsGranted = permission === 'granted';
            });
        } else {
            this.permissionsGranted = true;
        }

        this.startMonitoring();
        this.setupIPCListeners();
    }

    setupIPCListeners() {
        if (window.electronAPI && window.electronAPI.onNotificationAction) {
            window.electronAPI.onNotificationAction((data) => {
                console.log('Notification Action:', data);
                if (data.action === 'stop') {
                    if (data.id === 'timer') {
                        this.stopAudio(); // Stop genérico pro timer
                        document.dispatchEvent(new CustomEvent('timer-stop-requested'));
                    } else {
                        this.stopAlarm(Number(data.id));
                        document.dispatchEvent(new CustomEvent('alarm-stop-requested', { detail: { id: Number(data.id) } }));
                    }
                } else if (data.action === 'snooze') {
                    if (data.id !== 'timer') {
                        this.snoozeAlarm(Number(data.id));
                        document.dispatchEvent(new CustomEvent('alarm-snooze-requested', { detail: { id: Number(data.id) } }));
                    }
                }
            });
        }
    }

    startMonitoring() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = setInterval(() => this.checkAlarms(), 1000);
    }

    checkAlarms() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentSeconds = now.getSeconds();
        const currentDay = now.getDay();

        if (currentSeconds !== 0) return;

        this.alarms.forEach(alarm => {
            if (!alarm.enabled) return;
            const isToday = Array.isArray(alarm.repeat) && alarm.repeat.length > 0
                ? alarm.repeat.includes(currentDay)
                : true;

            if (alarm.time === currentTime && isToday) {
                this.triggerAlarm(alarm);

                if (!Array.isArray(alarm.repeat) || alarm.repeat.length === 0) {
                    alarm.enabled = false;
                    this.saveAlarms();
                }
            }
        });

        Object.keys(this.snoozedAlarms).forEach(id => {
            if (this.snoozedAlarms[id] === currentTime) {
                const alarm = this.alarms.find(a => a.id === Number(id));
                if (alarm) {
                    this.triggerAlarm(alarm, true);
                    delete this.snoozedAlarms[id];
                }
            }
        });
    }

    getLastUsedSound() {
        return this.lastUsedSound;
    }

    setLastUsedSound(soundId) {
        this.lastUsedSound = soundId;
        localStorage.setItem('lastUsedSound', soundId);
    }

    async triggerAlarm(alarm, isSnooze = false) {
        if (this.ringingAlarms.has(alarm.id)) return;

        this.ringingAlarms.add(alarm.id);

        await this.handleNotification('Alarm', alarm.label || 'Time is up!', {
            snoozeEnabled: alarm.snoozeEnabled,
            id: alarm.id
        });

        // Determina fonte de áudio
        let src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Fallback default

        if (alarm.sound === 'default') {
            src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
        } else if (alarm.sound === 'beep') {
            src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Placeholder
        } else {
            // Verifica sons personalizados
            const custom = this.customSounds.find(s => s.id === alarm.sound);
            if (custom) {
                src = custom.data;
            }
        }

        this.audio.src = src;
        this.audio.volume = this.volume;
        this.audio.loop = true;
        this.audio.play().catch(e => console.error("Audio play failed", e));

        document.dispatchEvent(new CustomEvent('alarm-ring', { detail: { alarm, isSnooze } }));
    }

    async triggerTimer(label, soundId) {
        await this.handleNotification('Timer Finished', label || 'Time is up!', {
            snoozeEnabled: false,
            id: 'timer'
        });

        let src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
        if (soundId !== 'default' && soundId) {
            const custom = this.customSounds.find(s => s.id === soundId);
            if (custom) src = custom.data;
        }

        this.audio.src = src;
        this.audio.volume = this.volume;
        this.audio.loop = true;
        this.audio.play().catch(e => console.error("Audio play failed", e));

        document.dispatchEvent(new CustomEvent('timer-ring', { detail: { label } }));
    }

    async handleNotification(title, body) {
        if (!this.permissionsGranted) return;

        let type = 'system';
        if (window.electronAPI) {
            const settings = await window.electronAPI.getSettings();
            type = settings.notificationType || 'both';
        }

        if (type === 'system' || type === 'both') {
            new Notification(title, { body });
        }

        if (type === 'app' || type === 'both') {
            if (window.electronAPI) {
                // Passa o ID para saber o que parar
                // Pra Alarmes, usa o ID do alarme. Pra Timers, pode precisar de uma flag
                // é passado { id: 'timer' } ou { id: alarm.id }
                let idPayload = null;
                if (title === 'Timer Finished') {
                    idPayload = 'timer';
                } else {
                }

            }
        }
    }

    async handleNotification(title, body, data = {}) {
        if (!this.permissionsGranted) return;

        let type = 'system';
        if (window.electronAPI) {
            const settings = await window.electronAPI.getSettings();
            type = settings.notificationType || 'both';
        }

        if (type === 'system' || type === 'both') {
            new Notification(title, { body });
        }

        if (type === 'app' || type === 'both') {
            if (window.electronAPI) {
                window.electronAPI.showCustomNotification({
                    title,
                    body,
                    snoozeEnabled: data.snoozeEnabled,
                    id: data.id
                });
            }
        }
    }

    stopAlarm(alarmId) {
        if (alarmId) {
            this.ringingAlarms.delete(alarmId);
        }

        if (this.ringingAlarms.size === 0) {
            this.stopAudio();
        }

        if (window.electronAPI) {
            window.electronAPI.closeCustomNotification();
        }
    }

    stopAudio() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.loop = false;

        if (window.electronAPI) {
            window.electronAPI.closeCustomNotification();
        }
    }

    snoozeAlarm(alarmId) {
        this.stopAlarm(alarmId);
        const alarm = this.alarms.find(a => a.id === alarmId);
        if (!alarm) return;

        const duration = alarm.snoozeInterval || 9;
        const now = new Date();
        now.setMinutes(now.getMinutes() + duration);
        const nextTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        this.snoozedAlarms[alarmId] = nextTime;
        console.log(`Alarm snoozed for ${duration} min. Next: ${nextTime}`);
        document.dispatchEvent(new CustomEvent('alarms-updated'));
    }

    addAlarm(data) {
        this.alarms.push({
            id: Date.now(),
            time: data.time,
            label: data.label || 'Alarm',
            repeat: data.repeat || [],
            sound: data.sound || 'default',
            snoozeEnabled: data.snoozeEnabled !== false,
            snoozeInterval: data.snoozeInterval || 9,
            enabled: true
        });
        this.saveAlarms();
    }

    updateAlarm(id, data) {
        const index = this.alarms.findIndex(a => a.id === id);
        if (index !== -1) {
            this.alarms[index] = { ...this.alarms[index], ...data };
            this.saveAlarms();
        }
    }

    toggleAlarm(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            if (!alarm.enabled && this.snoozedAlarms[id]) {
                delete this.snoozedAlarms[id];
            }
            this.saveAlarms();
        }
    }

    deleteAlarm(id) {
        this.alarms = this.alarms.filter(a => a.id !== id);
        if (this.snoozedAlarms[id]) delete this.snoozedAlarms[id];
        this.saveAlarms();
    }

    saveAlarms() {
        localStorage.setItem('alarms', JSON.stringify(this.alarms));
        document.dispatchEvent(new CustomEvent('alarms-updated'));
    }

    getAlarms() {
        return this.alarms;
    }

    getSnoozedAlarms() {
        return this.snoozedAlarms;
    }

    getCustomSounds() {
        return this.customSounds;
    }

    getVolume() {
        return this.volume;
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.audio.volume = this.volume;
        localStorage.setItem('alarmVolume', this.volume);
    }

    async addCustomSound(name, data) {
        // Platform check: Electron ou Browser
        const isElectron = !!window.electronAPI;

        if (!isElectron) {
            // Limite do browser
            if (this.customSounds.length >= 10) {
                showAlert('Maximum of 10 custom sounds allowed in browser mode.', 'Limit Reached');
                return false;
            }
        } else {
            // Limite do Electron
            if (this.customSounds.length >= 20) {
                showAlert('Maximum of 20 custom sounds allowed in desktop mode.', 'Limit Reached');
                return false;
            }
        }

        let soundData = data;

        if (isElectron) {
            try {
                // se parecer com um caminho de arquivo (e não base64), usa cópia direta
                if (typeof data === 'string' && !data.startsWith('data:')) {
                    const savedPath = await window.electronAPI.copySoundFile(data, name + '.mp3');
                    soundData = savedPath;
                } else {
                    const base64Data = data.split(',')[1];
                    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    const savedPath = await window.electronAPI.saveFile(name + '.mp3', buffer);
                    soundData = savedPath;
                }
            } catch (err) {
                console.error('Failed to save file natively:', err);
                showAlert('Failed to save sound file.', 'Error');
                return false;
            }
        }

        const newSound = {
            id: 'custom_' + Date.now(),
            name: name,
            data: soundData,
            isNative: isElectron
        };

        this.customSounds.push(newSound);
        this.saveCustomSounds();
        return true;
    }

    async deleteCustomSound(id) {
        const sound = this.customSounds.find(s => s.id === id);
        if (sound && sound.isNative && window.electronAPI) {
            try {
                // espera a deleção do arquivo
                await window.electronAPI.deleteFile(sound.data);
            } catch (e) {
                console.warn("Could not delete physical file", e);
            }
        }

        this.customSounds = this.customSounds.filter(s => s.id !== id);
        this.saveCustomSounds();
        return true;
    }

    saveCustomSounds() {
        localStorage.setItem('customSounds', JSON.stringify(this.customSounds));
        document.dispatchEvent(new CustomEvent('alarms-updated'));
    }
}

export const alarmManager = new AlarmManager();
