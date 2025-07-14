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
            pauseTime: timers[id].pauseTime
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
function notify(id) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: `¡Temporizador ${id} terminado!`,
        message: `El temporizador ${id} ha finalizado.`
    });
}

/**
 * Detiene y resetea el temporizador indicado, limpiando su estado y timeout.
 * @param {number} id - ID del temporizador a detener.
 */
function stopTimer(id) {
    if (timers[id] && timers[id].timer) clearTimeout(timers[id].timer);
    timers[id] = { timer: null, endTime: null, paused: false, pauseTime: null };
    clearState(id);
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
            notify(id);
            stopTimer(id);
        }, totalTime),
        endTime: now + totalTime,
        paused: false,
        pauseTime: null,
        totalTime: totalTime
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
            notify(id);
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
        startTimer(id, message.minutes);
        sendResponse({ started: true });
    } else if (message.action === "pause_timer") {
        pauseTimer(id);
        sendResponse({ paused: true });
    } else if (message.action === "resume_timer") {
        resumeTimer(id);
        sendResponse({ resumed: true });
    } else if (message.action === "reset_timer") {
        stopTimer(id);
        sendResponse({ reset: true });
    } else if (message.action === "get_timer_status") {
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
        return true;
    }
    return true;
});

/**
 * Al iniciar el service worker (background), recupera el estado de los temporizadores guardados
 * en chrome.storage.local y los restaura en memoria. Así, los temporizadores continúan funcionando
 * después de recargas o cierres del background.
 */
chrome.storage.local.get('timersState', (data) => {
    if (data.timersState) {
        for (let id in data.timersState) {
            let t = data.timersState[id];
            timers[id] = {
                timer: null,
                endTime: t.endTime,
                paused: t.paused,
                pauseTime: t.pauseTime,
                totalTime: t.totalTime // restaurar el tiempo total
            };
            if (timers[id].endTime && !timers[id].paused) {
                let timeLeft = timers[id].endTime - Date.now();
                if (timeLeft > 0) {
                    timers[id].timer = setTimeout(() => {
                        notify(id);
                        stopTimer(id);
                    }, timeLeft);
                } else {
                    stopTimer(id);
                }
            }
        }
    }
});
