import { alarmManager } from './AlarmManager.js';

class TimerManager {
    constructor() {
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.label = '';
        this.soundId = 'default';
        this.intervalId = null;

        this.initialHours = 0;
        this.initialMinutes = 0;
        this.initialSeconds = 0;

        this.loadState();
        if (this.isRunning && !this.isPaused) {
            this.startTicking();
        }
    }

    loadState() {
        const saved = localStorage.getItem('timer-state');
        if (saved) {
            const state = JSON.parse(saved);
            const now = Date.now();

            this.totalSeconds = state.totalSeconds || 0;
            this.label = state.label || '';
            this.soundId = state.soundId || 'default';
            this.isPaused = state.isPaused || false;
            this.isRunning = state.isRunning || false;

            this.initialHours = state.initialHours || 0;
            this.initialMinutes = state.initialMinutes || 0;
            this.initialSeconds = state.initialSeconds || 0;

            if (this.isRunning) {
                if (this.isPaused) {
                    this.remainingSeconds = state.remainingSeconds;
                } else {
                    const elapsedSinceSave = Math.floor((now - state.lastSaved) / 1000);
                    this.remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSinceSave);
                    if (this.remainingSeconds === 0) {
                        this.isRunning = false;
                        setTimeout(() => alarmManager.triggerTimer(this.label, this.soundId), 500);
                    }
                }
            }
        }
    }

    saveState() {
        const state = {
            totalSeconds: this.totalSeconds,
            remainingSeconds: this.remainingSeconds,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            label: this.label,
            soundId: this.soundId,
            initialHours: this.initialHours,
            initialMinutes: this.initialMinutes,
            initialSeconds: this.initialSeconds,
            lastSaved: Date.now()
        };
        localStorage.setItem('timer-state', JSON.stringify(state));
    }

    start(h, m, s, label, soundId) {
        this.totalSeconds = h * 3600 + m * 60 + s;
        if (this.totalSeconds <= 0) return;

        this.initialHours = h;
        this.initialMinutes = m;
        this.initialSeconds = s;

        this.remainingSeconds = this.totalSeconds;
        this.label = label;
        this.soundId = soundId;
        this.isRunning = true;
        this.isPaused = false;

        this.startTicking();
        this.saveState();
        this.notify();
    }

    startTicking() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.tick(), 1000);
    }

    tick() {
        if (this.isRunning && !this.isPaused) {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                if (this.remainingSeconds % 5 === 0) this.saveState();
                this.notify();
            } else {
                this.finish();
            }
        }
    }

    pause() {
        this.isPaused = true;
        this.saveState();
        this.notify();
    }

    resume() {
        this.isPaused = false;
        this.saveState();
        this.notify();
    }

    cancel() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        this.isPaused = false;
        this.remainingSeconds = 0;
        this.saveState();
        this.notify();
    }

    finish() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        this.isPaused = false;
        this.saveState();

        alarmManager.triggerTimer(this.label, this.soundId);
        this.notify('timer-finished');
    }

    getState() {
        return {
            totalSeconds: this.totalSeconds,
            remainingSeconds: this.remainingSeconds,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            label: this.label,
            soundId: this.soundId,
            initialHours: this.initialHours,
            initialMinutes: this.initialMinutes,
            initialSeconds: this.initialSeconds
        };
    }

    notify(eventName = 'timer-updated') {
        document.dispatchEvent(new CustomEvent(eventName, { detail: this.getState() }));
    }
}

export const timerManager = new TimerManager();
