/*
 * popup.js
 *
 * Este archivo implementa la lógica de la interfaz de usuario del popup para la extensión Simple Timer.
 * Se encarga de crear y gestionar los controles de los temporizadores, enviar comandos al background,
 * actualizar la UI, y mantener la sincronización con el estado real de los temporizadores.
 */

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

/**
 * Formatea un tiempo en milisegundos a formato mm:ss.
 * @param {number} ms - Milisegundos
 * @returns {string} Tiempo formateado
 */
function formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Controlador para un temporizador individual en el popup.
 * Se encarga de enlazar los controles de UI con el temporizador correspondiente,
 * enviar mensajes al background y actualizar la interfaz.
 * @param {number} id - ID del temporizador (1 a 5)
 */
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

    // Restaurar el valor guardado al iniciar
    chrome.storage.local.get([`timerInputValue-${id}`], (result) => {
        if (result[`timerInputValue-${id}`] !== undefined) {
            this.timeInput.value = result[`timerInputValue-${id}`];
        }
    });

    // Guardar el valor cada vez que el usuario lo cambie
    this.timeInput.addEventListener('input', () => {
        chrome.storage.local.set({ [`timerInputValue-${id}`]: this.timeInput.value });
    });
    this.totalTime = null;
    this.timerInterval = null;

    /**
     * Formatea un tiempo en milisegundos a formato mm:ss.
     * @param {number} ms - Milisegundos
     * @returns {string} Tiempo formateado
     */
    this.formatTime = function(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    /**
     * Actualiza la interfaz de usuario según el estado actual del temporizador.
     * Muestra/oculta vistas, actualiza el display y la barra de progreso.
     * @param {Object} status - Estado recibido desde el background
     */
    this.updateUI = (status) => {
        if ((status.isRunning || status.paused) && status.timeLeft > 0) {
            this.pausedView.style.display = "none";
            this.activeView.style.display = "flex";
            this.timerDisplay.textContent = this.formatTime(status.timeLeft);
            // Inicializar correctamente el tiempo total
            if (!this.totalTime || status.totalTime > this.totalTime || !status.isRunning) {
                this.totalTime = (status.totalTime && status.totalTime > 0) ? status.totalTime : status.timeLeft;
            }
            // Evita división por cero
            let progress = (this.totalTime > 0) ? (status.timeLeft / this.totalTime) * 100 : 100;
            this.timeBarFill.style.width = `${progress}%`;
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

    /**
     * Consulta periódicamente el estado del temporizador al background
     * para mantener la UI sincronizada en tiempo real.
     */
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
                setTimeout(notifyIconState, 100);
            });
        });
    }
    if (this.pauseBtn) {
        this.pauseBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "pause_timer", id: this.id }, () => {
                this.pollStatus();
                setTimeout(notifyIconState, 100);
            });
        });
    }
    if (this.resumeBtn) {
        this.resumeBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "resume_timer", id: this.id }, () => {
                this.pollStatus();
                setTimeout(notifyIconState, 100);
            });
        });
    }
    if (this.resetBtn) {
        this.resetBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "reset_timer", id: this.id }, () => {
                this.pollStatus();
                setTimeout(notifyIconState, 100);
            });
        });
    }
    // Al abrir el popup, consulta el estado del temporizador
    this.pollStatus();
}

/**
 * Al cargar el DOM, instancia los controladores de los 5 temporizadores
 * para inicializar la interfaz y enlazar los controles.
 */
// Notifica al background si hay al menos un temporizador activo
function notifyIconState() {
    let checks = [];
    for (let i = 1; i <= 5; i++) {
        checks.push(new Promise(resolve => {
            chrome.runtime.sendMessage({ action: "get_timer_status", id: i }, status => {
                resolve(!!(status && status.isRunning));
            });
        }));
    }
    Promise.all(checks).then(results => {
        const anyActive = results.some(Boolean);
        // No es necesario enviar mensaje especial, el background ya actualiza el icono
        // Pero si quieres forzar, puedes enviar un mensaje aquí
    });
}

// Listener para reproducir sonido cuando el background lo solicite
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "play_sound" && message.sound) {
        const audio = new Audio(chrome.runtime.getURL('Sonidos/' + message.sound));
        audio.play();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    for (let i = 1; i <= 5; i++) {
        new TimerController(i);
    }
});