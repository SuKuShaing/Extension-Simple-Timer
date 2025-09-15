/**
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
const iconoTimerContainer = document.querySelector(".iconoTimerContainer");

let timerInterval = null;

/**
 * Convierte un valor de entrada con decimales a milisegundos totales
 * @param {string} inputValue - Valor ingresado por el usuario (ej: "1,30", "0,2", "2,9")
 * @returns {number} Milisegundos totales
 */
function parseTimeInput(inputValue) {
    if (!inputValue || inputValue.trim() === '') {
        return 0;
    }
    
    // Reemplazar coma por punto para manejo consistente
    const normalizedValue = inputValue.replace(',', '.');
    
    // Validar formato: número con máximo 2 decimales
    const regex = /^(\d+)(?:\.(\d{1,2}))?$/;
    const match = normalizedValue.match(regex);
    
    if (!match) {
        return 0;
    }
    
    const wholePart = parseInt(match[1], 10);
    const decimalPart = match[2] ? match[2] : '0';
    
    // Truncar a máximo 2 decimales
    const truncatedDecimal = decimalPart.length > 2 ? decimalPart.substring(0, 2) : decimalPart;
    const decimalValue = parseFloat('0.' + truncatedDecimal);
    
    // Aplicar la lógica de conversión
    let totalSeconds;
    
    if (decimalValue <= 0.6) {
        // Escala de 60: 0.1 = 6 segundos, 0.5 = 30 segundos, 0.6 = 36 segundos
        totalSeconds = wholePart * 60 + Math.round(decimalValue * 100);
    } else {
        // Escala de segundos: 0.7 = 42 segundos, 0.8 = 48 segundos, 0.9 = 54 segundos
        totalSeconds = wholePart * 60 + Math.round(decimalValue * 60);
    }
    
    return totalSeconds * 1000; // Convertir a milisegundos
}

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

    /**
     * Restaurar el último valor ingresado en el input por el usuario cuando se abre el popup
     * y lo coloca en el input.value
     * 
     * Ejemplo de resultado:
     * {
     *     "timerInputValue-1": "1,30",
     *     "timerInputValue-2": "0,2", 
     *     "timerInputValue-3": "2,9",
     * }
    */
    chrome.storage.local.get([`timerInputValue-${id}`], (result) => {
        if (result[`timerInputValue-${id}`] !== undefined) {
            this.timeInput.value = result[`timerInputValue-${id}`];
        }
    });

    // Validación en tiempo real del input
    this.timeInput.addEventListener('input', (e) => {
        let value = e.target.value;
        
        // Permitir solo números, comas y puntos
        value = value.replace(/[^0-9,\.]/g, '');
        
        // Asegurar que solo haya una coma o punto
        const commaIndex = value.indexOf(',');
        const dotIndex = value.indexOf('.');
        
        if (commaIndex !== -1 && dotIndex !== -1) {
            // Si hay ambos, mantener solo el primero
            if (commaIndex < dotIndex) {
                value = value.substring(0, dotIndex) + value.substring(dotIndex + 1);
            } else {
                value = value.substring(0, commaIndex) + value.substring(commaIndex + 1);
            }
        }
        
        // Limitar a 2 decimales
        const parts = value.split(/[,\.]/);
        if (parts.length > 1 && parts[1].length > 2) {
            parts[1] = parts[1].substring(0, 2);
            value = parts.join(',');
        }
        
        e.target.value = value;
        chrome.storage.local.set({ [`timerInputValue-${id}`]: value });
    });

    this.totalTime = null;
    this.timerInterval = null;

    /**
     * Formatea un tiempo en milisegundos a formato mm:ss.
     * @param {number} ms - Milisegundos
     * @returns {string} Tiempo formateado en formato mm:ss para el display del temporizador
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
            iconoTimerContainer.style.display = "none";
            this.timerDisplay.textContent = this.formatTime(status.timeLeft);
            // Muestra el tiempo total
            if (!this.totalTime || status.totalTime > this.totalTime || !status.isRunning) {
                this.totalTime = (status.totalTime && status.totalTime > 0) ? status.totalTime : status.timeLeft;
            }
            // Calcula el progreso de la barra de tiempo
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
            if (chrome.runtime.lastError) {
                console.error(`[TIMER DEBUG] Error obteniendo estado del timer ${this.id}:`, chrome.runtime.lastError);
                return;
            }
            
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
            const inputValue = this.timeInput.value.trim();
            if (!inputValue) return;
            
            const totalMs = parseTimeInput(inputValue);
            if (totalMs <= 0) return;
            
            // Convertir milisegundos a minutos para enviar al background
            const totalMinutes = totalMs / (60 * 1000);
            
            console.log(`[TIMER DEBUG] Iniciando timer ${this.id} con input "${inputValue}" -> ${totalMs}ms (${totalMinutes} minutos) desde popup`);
            chrome.runtime.sendMessage({ action: "start_timer", minutes: totalMinutes, id: this.id }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(`[TIMER DEBUG] Error iniciando timer ${this.id}:`, chrome.runtime.lastError);
                    return;
                }
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
// Controla la visibilidad de `iconoTimerContainer`: solo se muestra cuando
// no hay ningún temporizador ni corriendo ni pausado (con tiempo restante > 0)
function notifyIconState() {
    const checks = [];
    for (let i = 1; i <= 5; i++) {
        checks.push(new Promise(resolve => {
            chrome.runtime.sendMessage({ action: "get_timer_status", id: i }, status => {
                const engaged = !!(status && (status.isRunning || status.paused) && status.timeLeft > 0);
                resolve(engaged);
            });
        }));
    }
    Promise.all(checks).then(results => {
        const anyEngaged = results.some(Boolean);
        iconoTimerContainer.style.display = anyEngaged ? "none" : "flex";
    });
}

document.addEventListener('DOMContentLoaded', () => {
    for (let i = 1; i <= 5; i++) {
        new TimerController(i);
    }
    // Asegura el estado inicial correcto del contenedor del icono
    notifyIconState();
});