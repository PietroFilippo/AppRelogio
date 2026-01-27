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

    triggerAlarm(alarm, isSnooze = false) {
        if (this.ringingAlarms.has(alarm.id)) return;

        this.ringingAlarms.add(alarm.id);

        if (this.permissionsGranted) {
            new Notification('Alarm', { body: alarm.label || 'Time is up!' });
        }

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

    triggerTimer(label, soundId) {
        if (this.permissionsGranted) {
            new Notification('Timer Finished', { body: label || 'Time is up!' });
        }

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

    stopAlarm(alarmId) {
        if (alarmId) {
            this.ringingAlarms.delete(alarmId);
        }

        if (this.ringingAlarms.size === 0) {
            this.stopAudio();
        }
    }

    stopAudio() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.loop = false;
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

    addCustomSound(name, data) {
        if (this.customSounds.length >= 10) {
            alert('Maximum of 10 custom sounds allowed.');
            return false;
        }
        const newSound = {
            id: 'custom_' + Date.now(),
            name: name,
            data: data
        };
        this.customSounds.push(newSound);
        this.saveCustomSounds();
        return true;
    }

    deleteCustomSound(id) {
        this.customSounds = this.customSounds.filter(s => s.id !== id);
        this.saveCustomSounds();
    }

    saveCustomSounds() {
        localStorage.setItem('customSounds', JSON.stringify(this.customSounds));
        document.dispatchEvent(new CustomEvent('alarms-updated'));
    }
}

export const alarmManager = new AlarmManager();
