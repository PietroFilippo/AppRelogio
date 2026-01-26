class StopwatchManager {
    constructor() {
        this.startTime = 0;
        this.elapsedSoFar = 0;
        this.isRunning = false;
        this.laps = [];
        this.previousLapTime = 0;
        this.loadState();
    }

    loadState() {
        const saved = localStorage.getItem('stopwatch-state');
        if (saved) {
            const state = JSON.parse(saved);
            this.startTime = state.startTime || 0;
            this.elapsedSoFar = state.elapsedSoFar || 0;
            this.isRunning = state.isRunning || false;
            this.laps = state.laps || [];
            this.previousLapTime = state.previousLapTime || 0;
        }
    }

    saveState() {
        const state = {
            startTime: this.startTime,
            elapsedSoFar: this.elapsedSoFar,
            isRunning: this.isRunning,
            laps: this.laps,
            previousLapTime: this.previousLapTime
        };
        localStorage.setItem('stopwatch-state', JSON.stringify(state));
    }

    getElapsed() {
        if (!this.isRunning) return this.elapsedSoFar;
        return Date.now() - this.startTime + this.elapsedSoFar;
    }

    start() {
        if (this.isRunning) return;
        this.startTime = Date.now();
        this.isRunning = true;
        this.saveState();
    }

    stop() {
        if (!this.isRunning) return;
        this.elapsedSoFar = this.getElapsed();
        this.isRunning = false;
        this.saveState();
    }

    lap() {
        const currentElapsed = this.getElapsed();
        const lapTime = currentElapsed - this.previousLapTime;
        this.laps.unshift({ lapTime, totalTime: currentElapsed });
        this.previousLapTime = currentElapsed;
        this.saveState();
        return this.laps;
    }

    reset() {
        this.startTime = 0;
        this.elapsedSoFar = 0;
        this.isRunning = false;
        this.laps = [];
        this.previousLapTime = 0;
        this.saveState();
    }

    getState() {
        return {
            elapsed: this.getElapsed(),
            isRunning: this.isRunning,
            laps: this.laps,
            previousLapTime: this.previousLapTime
        };
    }
}

export const stopwatchManager = new StopwatchManager();
