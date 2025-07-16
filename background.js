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
        16: "Iconos/icon_active16.png",
        32: "Iconos/icon_active32.png",
        48: "Iconos/icon_active48.png",
        128: "Iconos/icon_active128.png"
    } : {
        16: "Iconos/icon16.png",
        32: "Iconos/icon32.png",
        48: "Iconos/icon48.png",
        128: "Iconos/icon128.png"
    };
    chrome.action.setIcon({ path: iconPath });
}

// Al restaurar el estado, reprograma las alarmas si corresponde
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
                        // Reprograma la alarma para la notificación final
                        chrome.alarms.create(`timer-${id}`, { when: timers[id].endTime });
                    } else {
                        // Si ya pasó el tiempo, dispara la notificación inmediatamente
                        notify(id, timers[id].originalMinutes);
                    }
                }
            }
        }
        // Al restaurar el estado, actualiza el icono según si hay temporizadores activos
        const anyActive = Object.values(timers).some(t => t && !t.paused && t.endTime && t.endTime > Date.now());
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
 * Detiene el temporizador después de mostrar la notificación.
 * @param {number} id - ID del temporizador que terminó.
 * @param {number} minutos_ingresado - Tiempo ingresado por el usuario.
 */
function notify(id, minutos_ingresado) {
    // Primero detiene el temporizador
    stopTimer(id);

    // Enviar mensaje para reproducir sonido desde el popup
    // comenté esta función porque no permite reproducir sonidos a menos que el popup esté abierto
    // chrome.runtime.sendMessage({ action: "play_sound", sound: "service-bell.mp3" });

    // Muestra la notificación
    const displayTime = minutos_ingresado > 0 ? `${minutos_ingresado} minuto(s)` : "el tiempo";
    chrome.notifications.create({
        type: "basic",
        iconUrl: "Iconos/icon128.png",
        title: `¡Tiempo terminado!`,
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
    if (timers[id] && timers[id].timer) {
        clearTimeout(timers[id].timer);
    }
    // Limpia la alarma asociada
    chrome.alarms.clear(`timer-${id}`);
    delete timers[id]; // Elimina completamente la entrada
    saveState();

    // Ahora revisa si queda alguno activo y actualiza el icono
    const anyActive = Object.values(timers).some(t => t && !t.paused && t.endTime && t.endTime > Date.now());
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
    const endTime = now + totalTime;
    timers[id] = {
        timer: null, // Ya no usamos setTimeout para la notificación final
        endTime: endTime,
        paused: false,
        pauseTime: null,
        totalTime: totalTime,
        originalMinutes: minutes
    };
    saveState();
    // Crea la alarma para la notificación final
    chrome.alarms.create(`timer-${id}`, { when: endTime });
}

/**
 * Pausa el temporizador indicado, guardando el momento de pausa y deteniendo el timeout.
 * @param {number} id - ID del temporizador a pausar.
 */
function pauseTimer(id) {
    if (timers[id] && !timers[id].paused && timers[id].endTime) {
        timers[id].paused = true;
        timers[id].pauseTime = Date.now();
        // Limpia la alarma asociada
        chrome.alarms.clear(`timer-${id}`);
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
        // Crea la alarma para el tiempo restante
        chrome.alarms.create(`timer-${id}`, { when: timers[id].endTime });
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
            const anyActive = Object.values(timers).some(t => t && !t.paused && t.endTime && t.endTime > Date.now());
            updateExtensionIcon(anyActive);
        }, 50);

        startTimer(id, message.minutes);
        sendResponse({ started: true });
    } else if (message.action === "pause_timer") {
        setTimeout(() => {
            const anyActive = Object.values(timers).some(t => t && !t.paused && t.endTime && t.endTime > Date.now());
            updateExtensionIcon(anyActive);
        }, 50);

        pauseTimer(id);
        sendResponse({ paused: true });
    } else if (message.action === "resume_timer") {
        setTimeout(() => {
            const anyActive = Object.values(timers).some(t => t && !t.paused && t.endTime && t.endTime > Date.now());
            updateExtensionIcon(anyActive);
        }, 50);

        resumeTimer(id);
        sendResponse({ resumed: true });
    } else if (message.action === "reset_timer") {
        // Después de resetear, actualiza el icono
        setTimeout(() => {
            const anyActive = Object.values(timers).some(t => t && !t.paused && t.endTime && t.endTime > Date.now());
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
                isRunning: !!(t && !t.paused && t.endTime && t.endTime > Date.now()),
                paused: t ? t.paused : false,
                endTime: t ? t.endTime : null,
                totalTime: total
            });
        });
        return true; // Indica que la respuesta será asíncrona

    }
    return true;
});

// Listener para alarmas de Chrome (notificación final)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('timer-')) {
        const id = parseInt(alarm.name.split('-')[1], 10);
        if (timers[id]) {
            notify(id, timers[id].originalMinutes);
        }
    }
});


