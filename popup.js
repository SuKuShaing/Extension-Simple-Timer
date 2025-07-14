const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resumeBtn = document.getElementById("resume-btn");
const resetBtn = document.getElementById("reset-btn");
const timeInput = document.querySelector(".time-input");
const timerDisplay = document.getElementById("timer-display");
const pausedView = document.getElementById("paused-view");
const activeView = document.getElementById("active-view");
const timeBarFill = document.getElementById("time-bar-fill");

let timerInterval = null;

function formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function TimerController(id) {
    this.id = id;
    this.startBtn = document.getElementById(`start-btn-${id}`);
    this.pauseBtn = document.getElementById(`pause-btn-${id}`);
    this.resumeBtn = document.getElementById(`resume-btn-${id}`);
    this.resetBtn = document.getElementById(`reset-btn-${id}`);
    this.timeInput = document.getElementById(`time-input-${id}`);
    this.timerDisplay = document.getElementById(`timer-display-${id}`);
    this.pausedView = document.querySelector(`.timer-${id} .paused-view`);
    this.activeView = document.getElementById(`active-view-${id}`);
    this.timeBarFill = document.getElementById(`time-bar-fill-${id}`);
    this.totalTime = null;
    this.timerInterval = null;

    this.formatTime = function(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    this.updateUI = (status) => {
        if ((status.isRunning || status.paused) && status.timeLeft > 0) {
            this.pausedView.style.display = "none";
            this.activeView.style.display = "block";
            this.timerDisplay.textContent = this.formatTime(status.timeLeft);
            // Guardar el tiempo total al iniciar
            if (!this.totalTime || status.totalTime > this.totalTime || !status.isRunning) {
                this.totalTime = status.totalTime || status.timeLeft;
            }
            // Calcular el porcentaje de la barra
            let percent = 100;
            if (this.totalTime && this.totalTime > 0) {
                percent = Math.max(0, Math.min(100, 100 * (status.timeLeft / this.totalTime)));
            }
            this.timeBarFill.style.width = percent + "%";
            if (status.paused) {
                this.pauseBtn.style.display = "none";
                this.resumeBtn.style.display = "inline-block";
            } else {
                this.pauseBtn.style.display = "inline-block";
                this.resumeBtn.style.display = "none";
            }
        } else {
            this.pausedView.style.display = "block";
            this.activeView.style.display = "none";
            this.timerDisplay.textContent = "00:00";
            this.timeBarFill.style.width = "0%";
            this.totalTime = null;
        }
    };

    this.pollStatus = () => {
        chrome.runtime.sendMessage({ action: "get_timer_status", id: this.id }, (status) => {
            this.updateUI(status);
            if ((status.isRunning || status.paused) && status.timeLeft > 0) {
                this.timerInterval = setTimeout(this.pollStatus, 1000);
            } else {
                this.timerInterval = null;
            }
        });
    };

    if (this.startBtn) {
        this.startBtn.addEventListener("click", () => {
            const minutes = parseInt(this.timeInput.value, 10);
            if (!minutes || minutes <= 0) return;
            chrome.runtime.sendMessage({ action: "start_timer", minutes, id: this.id }, () => {
                this.pollStatus();
            });
        });
    }
    if (this.pauseBtn) {
        this.pauseBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "pause_timer", id: this.id }, () => {
                this.pollStatus();
            });
        });
    }
    if (this.resumeBtn) {
        this.resumeBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "resume_timer", id: this.id }, () => {
                this.pollStatus();
            });
        });
    }
    if (this.resetBtn) {
        this.resetBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "reset_timer", id: this.id }, () => {
                this.pollStatus();
            });
        });
    }
    // Al abrir el popup, consulta el estado del temporizador
    this.pollStatus();
}

// Instanciar los 5 temporizadores
document.addEventListener('DOMContentLoaded', () => {
    for (let i = 1; i <= 5; i++) {
        new TimerController(i);
    }
});