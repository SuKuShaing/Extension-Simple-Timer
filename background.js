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

// Variable para controlar si el badge se está actualizando
let badgeUpdateActive = false;

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

// Nueva función para actualizar el badge
function updateBadge() {
    const now = Date.now();
    const activeTimers = [];
    
    // Encuentra todos los temporizadores activos (corriendo o pausados con tiempo restante)
    for (let id in timers) {
        const t = timers[id];
        if (t && t.endTime) {
            let timeLeft = t.paused && t.pauseTime ? t.endTime - t.pauseTime : t.endTime - now;
            if (timeLeft > 0) {
                activeTimers.push({ id, timeLeft });
            }
        }
    }
    
    if (activeTimers.length === 0) {
        // No hay temporizadores activos, oculta el badge
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        // Detiene las alarmas de actualización del badge
        stopBadgeUpdateAlarms();
    } else if (activeTimers.length === 1) {
        // Un solo temporizador activo, muestra el tiempo restante en minutos
        const timeLeftMinutes = Math.ceil(activeTimers[0].timeLeft / (60 * 1000));
        chrome.action.setBadgeText({ text: timeLeftMinutes.toString() });
        chrome.action.setBadgeBackgroundColor({ color: "#006ce0" });
        chrome.action.setBadgeTextColor({ color: "#FFFFFF" }); // Texto blanco
        // Inicia las alarmas para actualizar cada minuto
        startBadgeUpdateAlarms();
    } else {
        // Múltiples temporizadores activos, muestra el número con "T"
        chrome.action.setBadgeText({ text: `${activeTimers.length}T` });
        chrome.action.setBadgeBackgroundColor({ color: "#7b7b7b" });
        chrome.action.setBadgeTextColor({ color: "#FFFFFF" }); // Texto blanco
        // Detiene las alarmas de actualización del badge
        stopBadgeUpdateAlarms();
    }
}

// Nueva función para iniciar las alarmas de actualización del badge
function startBadgeUpdateAlarms() {
    // Si ya hay alarmas de badge corriendo, no crear más
    if (badgeUpdateActive) {
        return;
    }
    
    badgeUpdateActive = true;
    
    // Programa la primera alarma para el próximo minuto
    const now = Date.now();
    const nextMinute = Math.ceil(now / 60000) * 60000; // Próximo minuto exacto
    
    chrome.alarms.create('badge-update', { 
        when: nextMinute,
        periodInMinutes: 1 // Se repite cada minuto
    });
    
    console.log('[TIMER DEBUG] Alarmas de actualización del badge iniciadas');
}

// Nueva función para detener las alarmas de actualización del badge
function stopBadgeUpdateAlarms() {
    if (badgeUpdateActive) {
        chrome.alarms.clear('badge-update');
        badgeUpdateActive = false;
        console.log('[TIMER DEBUG] Alarmas de actualización del badge detenidas');
    }
}

// Al restaurar el estado, reprograma las alarmas si corresponde
const stateRestored = new Promise(resolve => {
    chrome.storage.local.get('timersState', (data) => {
        console.log('[TIMER DEBUG] Restaurando estado:', data.timersState);
        
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
                    console.log(`[TIMER DEBUG] Timer ${id}: timeLeft = ${timeLeft}ms (${Math.ceil(timeLeft/1000)}s)`);
                    
                    // Dar margen de tolerancia de 30 segundos para evitar cancelaciones prematuras
                    if (timeLeft > -30000) { // Si pasaron menos de 30 segundos del tiempo límite
                        if (timeLeft > 0) {
                            // Reprograma la alarma para la notificación final
                            chrome.alarms.create(`timer-${id}`, { when: timers[id].endTime });
                            console.log(`[TIMER DEBUG] Timer ${id} reprogramado`);
                        } else {
                            // Está en el margen de tolerancia, asume que debe notificar ahora
                            console.log(`[TIMER DEBUG] Timer ${id} debe notificar (margen de tolerancia)`);
                            notify(id, timers[id].originalMinutes);
                        }
                    } else {
                        // Expiró hace más de 30 segundos, elimina silenciosamente
                        console.log(`[TIMER DEBUG] Timer ${id} expirado hace tiempo, eliminando silenciosamente`);
                        delete timers[id];
                    }
                }
            }
            // Guarda el estado limpio después de eliminar temporizadores obsoletos
            saveState();
        }
        
        // Al restaurar el estado, recalcula el icono de forma debounced considerando timers y alarmas
        updateIconDebounced();
        updateBadge(); // Actualiza el badge al restaurar el estado
        console.log('[TIMER DEBUG] Estado restaurado, icono y badge recalculados');
        resolve(); // La restauración ha finalizado
    });
});

// Debounce para evitar múltiples escrituras simultáneas al storage
let saveStateTimeout = null;

/**
 * Guarda el estado actual de todos los temporizadores en chrome.storage.local
 * para asegurar persistencia entre recargas del background.
 */
function saveState() {
    if (saveStateTimeout) {
        clearTimeout(saveStateTimeout);
    }
    
    saveStateTimeout = setTimeout(() => {
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
        console.log('[TIMER DEBUG] Guardando estado:', state);
        chrome.storage.local.set({ timersState: state });
        saveStateTimeout = null;
    }, 100);
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
    
    // Actualiza el badge después de detener el temporizador
    updateBadge();
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

    // Recalcula el icono de forma debounced (considera timers y alarmas)
    updateIconDebounced();
    updateBadge(); // Actualiza el badge
}

/**
 * Inicia un temporizador con la duración indicada (en minutos) y lo registra en el estado.
 * Si ya existe uno con el mismo ID, lo reinicia.
 * @param {number} id - ID del temporizador.
 * @param {number} minutes - Duración en minutos.
 */
function startTimer(id, minutes) {
    console.log(`[TIMER DEBUG] Iniciando timer ${id} por ${minutes} minutos`);
    
    // Solo limpia el temporizador específico, no llama a stopTimer que actualiza el icono
    if (timers[id]) {
        chrome.alarms.clear(`timer-${id}`);
    }
    
    const now = Date.now();
    const totalTime = minutes * 60 * 1000;
    const endTime = now + totalTime;
    
    timers[id] = {
        timer: null,
        endTime: endTime,
        paused: false,
        pauseTime: null,
        totalTime: totalTime,
        originalMinutes: minutes
    };
    
    saveState();
    
    // Crea la alarma para la notificación final
    chrome.alarms.create(`timer-${id}`, { when: endTime });
    console.log(`[TIMER DEBUG] Timer ${id} iniciado, termina a las ${new Date(endTime).toLocaleTimeString()}`);
    
    // Actualiza el badge inmediatamente
    updateBadge();
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
        updateBadge(); // Actualiza el badge
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
        updateBadge(); // Actualiza el badge
    }
}

/**
 * Evento que se ejecuta cuando la extensión se instala o actualiza.
 * Resetea todos los temporizadores y deja el sistema limpio al instalar.
 */
chrome.runtime.onInstalled.addListener(() => {
    for (let i = 1; i <= MAX_TIMERS; i++) stopTimer(i);
    // Detiene cualquier alarma de badge que pueda estar corriendo
    stopBadgeUpdateAlarms();
    console.log("La extensión se ha instalado con éxito");
});

/**
 * Listener principal de mensajes desde el popup o cualquier parte de la extensión.
 * Gestiona las acciones de temporizador (iniciar, pausar, reanudar, resetear, consultar estado)
 * según el mensaje recibido. Permite la comunicación entre la UI y la lógica de fondo.
 */
// Debounce para actualización del icono y badge
let iconUpdateTimeout = null;
function updateIconDebounced() {
    if (iconUpdateTimeout) {
        clearTimeout(iconUpdateTimeout);
    }
    iconUpdateTimeout = setTimeout(() => {
        // Considera timers y alarmas programadas para un estado consistente
        chrome.alarms.getAll((alarms) => {
            const now = Date.now();
            const anyFutureAlarm = (alarms || []).some(a => a.name && a.name.startsWith('timer-') && a.scheduledTime && a.scheduledTime > now);
            const anyRunning = Object.values(timers).some(t => t && !t.paused && t.endTime && t.endTime > now);
            const anyPausedPending = Object.values(timers).some(t => t && t.paused && t.endTime && t.pauseTime && (t.endTime - t.pauseTime) > 0);
            const shouldBeActive = anyFutureAlarm || anyRunning;
            updateExtensionIcon(shouldBeActive);
            updateBadge(); // Actualiza el badge junto con el icono
            iconUpdateTimeout = null;
        });
    }, 150);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const id = message.id;
    if (!id || id < 1 || id > MAX_TIMERS) {
        sendResponse({ error: "ID de temporizador inválido" });
        return true;
    }
    
    if (message.action === "start_timer") {
        startTimer(id, message.minutes);
        updateIconDebounced();
        sendResponse({ started: true });
        
    } else if (message.action === "pause_timer") {
        pauseTimer(id);
        updateIconDebounced();
        sendResponse({ paused: true });
        
    } else if (message.action === "resume_timer") {
        resumeTimer(id);
        updateIconDebounced();
        sendResponse({ resumed: true });
        
    } else if (message.action === "reset_timer") {
        stopTimer(id);
        updateIconDebounced();
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

// Listener para alarmas de Chrome (notificación final y actualización de badge)
chrome.alarms.onAlarm.addListener((alarm) => {
    stateRestored.then(() => {
        if (alarm.name.startsWith('timer-')) {
            // Alarma de temporizador
            const id = parseInt(alarm.name.split('-')[1], 10);
            console.log(`[TIMER DEBUG] Alarma disparada para timer ${id}`);

            const t = timers[id];
            if (t && !t.paused) {
                console.log(`[TIMER DEBUG] Notificando timer ${id}`);
                notify(id, t.originalMinutes);
            } else {
                console.log(`[TIMER DEBUG] Timer ${id} no existe o está pausado, ignorando alarma`);
            }
        } else if (alarm.name === 'badge-update') {
            // Alarma de actualización del badge
            console.log('[TIMER DEBUG] Actualizando badge por alarma');
            updateBadge();
        }
    });
});

