/*
 * background.js
 *
 * Este archivo implementa la lógica principal de los temporizadores para la extensión Simple Timer.
 * Gestiona hasta 5 temporizadores independientes en segundo plano, permitiendo iniciar, pausar,
 * reanudar, resetear y notificar al usuario cuando finaliza cada temporizador. La lógica y el estado
 * se mantienen aquí para asegurar persistencia y funcionamiento aunque el popup esté cerrado.
 */

const MAX_TIMERS = 5;
let timers = {}; // { id: { timer, endTime, paused, pauseTime, totalTime } }

// Cambia el icono de la extensión según si hay temporizadores activos
function updateExtensionIcon(isActive) {
    const iconPath = isActive ? {
        16: "icon_active16.png",
        32: "icon_active32.png",
        48: "icon_active48.png",
        128: "icon_active128.png"
    } : {
        16: "icon16.png",
        32: "icon32.png",
        48: "icon48.png",
        128: "icon128.png"
    };
    chrome.action.setIcon({ path: iconPath });
}

// Promesa que se resuelve cuando el estado de los temporizadores se ha restaurado desde el almacenamiento.
// Esto previene condiciones de carrera al iniciar el script de fondo.
const stateRestored = new Promise(resolve => {
    chrome.storage.local.get('timersState', (data) => {
        if (data.timersState) {
            for (let id in data.timersState) {
                let t = data.timersState[id];
                timers[id] = {
                    timer: null,
                    endTime: t.endTime,
                    paused: t.paused,
                    pauseTime: t.pauseTime,
                    totalTime: t.totalTime,
                    originalMinutes: t.originalMinutes
                };
                if (timers[id].endTime && !timers[id].paused) {
                    let timeLeft = timers[id].endTime - Date.now();
                    if (timeLeft > 0) {
                        timers[id].timer = setTimeout(() => {
                            notify(id, timers[id].originalMinutes);
                            stopTimer(id);
                        }, timeLeft);
                    } else {
                        stopTimer(id);
                    }
                }
            }
        }
        // Al restaurar el estado, actualiza el icono según si hay temporizadores activos
        const anyActive = Object.values(timers).some(t => t && t.timer && !t.paused);
        updateExtensionIcon(anyActive);
        resolve(); // La restauración ha finalizado
    });
});

/**
 * Guarda el estado actual de todos los temporizadores en chrome.storage.local
 * para asegurar persistencia entre recargas del background.
 */
function saveState() {
    // Guardar solo endTime, paused, pauseTime (no funciones)
    let state = {};
    for (let id in timers) {
        state[id] = {
            endTime: timers[id].endTime,
            paused: timers[id].paused,
            pauseTime: timers[id].pauseTime,
            totalTime: timers[id].totalTime,
            originalMinutes: timers[id].originalMinutes
        };
    }
    chrome.storage.local.set({ timersState: state });
}

/**
 * Elimina el estado de un temporizador específico y actualiza el almacenamiento persistente.
 */
function clearState(id) {
    if (timers[id]) delete timers[id];
    saveState();
}

/**
 * Muestra una notificación nativa cuando un temporizador finaliza.
 * @param {number} id - ID del temporizador que terminó.
 */
function notify(id, minutos_ingresado) {
    const displayTime = minutos_ingresado > 0 ? `${minutos_ingresado} minuto(s)` : "el tiempo";
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: `¡${displayTime} minutos terminado!`,
        message: `Tu temporizador de ${displayTime} minutos ha finalizado.`,
        priority: 2, // Prioridad alta (0-2)
        requireInteraction: true, // Evita que se oculte automáticamente
        silent: false, // Permite sonido
    });
}

/**
 * Detiene y resetea el temporizador indicado, limpiando su estado y timeout.
 * @param {number} id - ID del temporizador a detener.
 */
function stopTimer(id) {
    if (timers[id] && timers[id].timer) clearTimeout(timers[id].timer);
    clearState(id);

    // Después de detener, verifica si queda algún temporizador activo y actualiza el icono.
    const anyActive = Object.values(timers).some(t => t && t.timer && !t.paused);
    updateExtensionIcon(anyActive);
}

/**
 * Inicia un temporizador con la duración indicada (en minutos) y lo registra en el estado.
 * Si ya existe uno con el mismo ID, lo reinicia.
 * @param {number} id - ID del temporizador.
 * @param {number} minutes - Duración en minutos.
 */
function startTimer(id, minutes) {
    stopTimer(id);
    const now = Date.now();
    const totalTime = minutes * 60 * 1000;
    timers[id] = {
        timer: setTimeout(() => {
            notify(id, minutes);
            stopTimer(id);
        }, totalTime),
        endTime: now + totalTime,
        paused: false,
        pauseTime: null,
        totalTime: totalTime,
        originalMinutes: minutes
    };
    saveState();
}

/**
 * Pausa el temporizador indicado, guardando el momento de pausa y deteniendo el timeout.
 * @param {number} id - ID del temporizador a pausar.
 */
function pauseTimer(id) {
    if (timers[id] && !timers[id].paused && timers[id].endTime) {
        timers[id].paused = true;
        timers[id].pauseTime = Date.now();
        if (timers[id].timer) clearTimeout(timers[id].timer);
        saveState();
    }
}

/**
 * Reanuda un temporizador previamente pausado, recalculando el tiempo restante y reiniciando el timeout.
 * @param {number} id - ID del temporizador a reanudar.
 */
function resumeTimer(id) {
    if (timers[id] && timers[id].paused && timers[id].endTime && timers[id].pauseTime) {
        let timeLeft = timers[id].endTime - timers[id].pauseTime;
        timers[id].endTime = Date.now() + timeLeft;
        timers[id].paused = false;
        timers[id].pauseTime = null;
        saveState();
        timers[id].timer = setTimeout(() => {
            notify(id, timers[id].originalMinutes);
            stopTimer(id);
        }, timeLeft);
    }
}

/**
 * Evento que se ejecuta cuando la extensión se instala o actualiza.
 * Resetea todos los temporizadores y deja el sistema limpio al instalar.
 */
chrome.runtime.onInstalled.addListener(() => {
    for (let i = 1; i <= MAX_TIMERS; i++) stopTimer(i);
    console.log("La extensión se ha instalado con éxito");
});

/**
 * Listener principal de mensajes desde el popup o cualquier parte de la extensión.
 * Gestiona las acciones de temporizador (iniciar, pausar, reanudar, resetear, consultar estado)
 * según el mensaje recibido. Permite la comunicación entre la UI y la lógica de fondo.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const id = message.id;
    if (!id || id < 1 || id > MAX_TIMERS) {
        sendResponse({ error: "ID de temporizador inválido" });
        return true;
    }
    if (message.action === "start_timer") {
        // Después de iniciar el temporizador, actualiza el icono
        setTimeout(() => {
            // Chequea si hay algún temporizador activo
            const anyActive = Object.values(timers).some(t => t && t.timer && !t.paused);
            updateExtensionIcon(anyActive);
        }, 50);

        startTimer(id, message.minutes);
        sendResponse({ started: true });
    } else if (message.action === "pause_timer") {
        setTimeout(() => {
            const anyActive = Object.values(timers).some(t => t && t.timer && !t.paused);
            updateExtensionIcon(anyActive);
        }, 50);

        pauseTimer(id);
        sendResponse({ paused: true });
    } else if (message.action === "resume_timer") {
        setTimeout(() => {
            const anyActive = Object.values(timers).some(t => t && t.timer && !t.paused);
            updateExtensionIcon(anyActive);
        }, 50);

        resumeTimer(id);
        sendResponse({ resumed: true });
    } else if (message.action === "reset_timer") {
        // Después de resetear, actualiza el icono
        setTimeout(() => {
            const anyActive = Object.values(timers).some(t => t && t.timer && !t.paused);
            updateExtensionIcon(anyActive);
        }, 50);

        stopTimer(id);
        sendResponse({ reset: true });
    } else if (message.action === "get_timer_status") {
        // Espera a que el estado se restaure antes de responder
        stateRestored.then(() => {
            let timeLeft = 0, total = 0;
            let t = timers[id];
            if (t && t.endTime) {
                timeLeft = t.paused && t.pauseTime ? t.endTime - t.pauseTime : t.endTime - Date.now();
                if (timeLeft < 0) timeLeft = 0;
                total = t.totalTime || 0;
            }
            sendResponse({
                timeLeft,
                isRunning: !!(t && t.timer && !t.paused),
                paused: t ? t.paused : false,
                endTime: t ? t.endTime : null,
                totalTime: total
            });
        });
        return true; // Indica que la respuesta será asíncrona

    }
    return true;
});


