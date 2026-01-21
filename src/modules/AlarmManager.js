export class AlarmManager {
    constructor() {
        this.alarms = JSON.parse(localStorage.getItem('alarms')) || [];
        this.permissionsGranted = false;
        this.checkInterval = null;
        this.audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Placeholder sound
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

        if (currentSeconds !== 0) return; // Checa apenas no início do minuto

        this.alarms.forEach(alarm => {
            if (alarm.enabled && alarm.time === currentTime) {
                this.triggerAlarm(alarm);
                if (!alarm.repeat) {
                    alarm.enabled = false;
                    this.saveAlarms();
                    // Notifica UI se necessário (usando CustomEvent)
                    document.dispatchEvent(new CustomEvent('alarms-updated'));
                }
            }
        });
    }

    triggerAlarm(alarm) {
        if (this.permissionsGranted) {
            new Notification('Alarm', { body: alarm.label || 'Time is up!' });
        }
        this.audio.play().catch(e => console.error("Audio play failed", e));
        alert(`ALARM: ${alarm.label || 'Wake Up!'}`);
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    addAlarm(time, label = 'Alarm', repeat = false) {
        this.alarms.push({
            id: Date.now(),
            time,
            label,
            repeat,
            enabled: true
        });
        this.saveAlarms();
    }

    toggleAlarm(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            this.saveAlarms();
        }
    }

    deleteAlarm(id) {
        this.alarms = this.alarms.filter(a => a.id !== id);
        this.saveAlarms();
    }

    saveAlarms() {
        localStorage.setItem('alarms', JSON.stringify(this.alarms));
        document.dispatchEvent(new CustomEvent('alarms-updated'));
    }

    getAlarms() {
        return this.alarms;
    }
}

export const alarmManager = new AlarmManager();
