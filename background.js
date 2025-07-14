let timer = null;
let endTime = null;
let paused = false;
let pauseTime = null;

function saveState() {
    chrome.storage.local.set({ timerState: { endTime, paused, pauseTime } });
}

function clearState() {
    chrome.storage.local.remove('timerState');
}

function notify() {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: "¡Tiempo terminado!",
        message: "El temporizador ha finalizado."
    });
}

function stopTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
    endTime = null;
    paused = false;
    pauseTime = null;
    clearState();
}

function startTimer(minutes) {
    stopTimer();
    endTime = Date.now() + minutes * 60 * 1000;
    paused = false;
    pauseTime = null;
    saveState();
    timer = setTimeout(() => {
        notify();
        stopTimer();
    }, minutes * 60 * 1000);
}

function pauseTimer() {
    if (!paused && endTime) {
        paused = true;
        pauseTime = Date.now();
        if (timer) clearTimeout(timer);
        saveState();
    }
}

function resumeTimer() {
    if (paused && endTime && pauseTime) {
        let timeLeft = endTime - pauseTime;
        endTime = Date.now() + timeLeft;
        paused = false;
        pauseTime = null;
        saveState();
        timer = setTimeout(() => {
            notify();
            stopTimer();
        }, timeLeft);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    stopTimer();
    console.log("La extensión se ha instalado con éxito");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_timer") {
        startTimer(message.minutes);
        sendResponse({ started: true });
    } else if (message.action === "pause_timer") {
        pauseTimer();
        sendResponse({ paused: true });
    } else if (message.action === "resume_timer") {
        resumeTimer();
        sendResponse({ resumed: true });
    } else if (message.action === "reset_timer") {
        stopTimer();
        sendResponse({ reset: true });
    } else if (message.action === "get_timer_status") {
        let timeLeft = 0;
        if (endTime) {
            timeLeft = paused && pauseTime ? endTime - pauseTime : endTime - Date.now();
            if (timeLeft < 0) timeLeft = 0;
        }
        sendResponse({
            timeLeft,
            isRunning: !!timer && !paused,
            paused,
            endTime
        });
        return true;
    }
    return true;
});

// Restaurar estado al cargar el service worker
chrome.storage.local.get('timerState', (data) => {
    if (data.timerState && data.timerState.endTime) {
        endTime = data.timerState.endTime;
        paused = data.timerState.paused;
        pauseTime = data.timerState.pauseTime;
        if (endTime && !paused) {
            let timeLeft = endTime - Date.now();
            if (timeLeft > 0) {
                timer = setTimeout(() => {
                    notify();
                    stopTimer();
                }, timeLeft);
            } else {
                stopTimer();
            }
        }
    }
});
