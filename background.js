const MAX_TIMERS = 5;
let timers = {}; // { id: { timer, endTime, paused, pauseTime } }

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

function clearState(id) {
    if (timers[id]) delete timers[id];
    saveState();
}

function notify(id) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: `¡Temporizador ${id} terminado!`,
        message: `El temporizador ${id} ha finalizado.`
    });
}

function stopTimer(id) {
    if (timers[id] && timers[id].timer) clearTimeout(timers[id].timer);
    timers[id] = { timer: null, endTime: null, paused: false, pauseTime: null };
    clearState(id);
}

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

function pauseTimer(id) {
    if (timers[id] && !timers[id].paused && timers[id].endTime) {
        timers[id].paused = true;
        timers[id].pauseTime = Date.now();
        if (timers[id].timer) clearTimeout(timers[id].timer);
        saveState();
    }
}

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

chrome.runtime.onInstalled.addListener(() => {
    for (let i = 1; i <= MAX_TIMERS; i++) stopTimer(i);
    console.log("La extensión se ha instalado con éxito");
});

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

// Restaurar estado al cargar el service worker
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
