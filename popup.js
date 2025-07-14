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

function updateUI(status) {
    if (status.isRunning || status.paused) {
        pausedView.style.display = "none";
        activeView.style.display = "block";
        timerDisplay.textContent = formatTime(status.timeLeft);
        const total = status.endTime ? status.endTime - Date.now() + status.timeLeft : status.timeLeft;
        let percent = 0;
        if (status.endTime && total > 0) {
            percent = 100 * (status.timeLeft / total);
        }
        timeBarFill.style.width = percent + "%";
        if (status.paused) {
            pauseBtn.style.display = "none";
            resumeBtn.style.display = "inline-block";
        } else {
            pauseBtn.style.display = "inline-block";
            resumeBtn.style.display = "none";
        }
    } else {
        pausedView.style.display = "block";
        activeView.style.display = "none";
        timerDisplay.textContent = "00:00";
        timeBarFill.style.width = "0%";
    }
}

function pollStatus() {
    chrome.runtime.sendMessage({ action: "get_timer_status" }, (status) => {
        updateUI(status);
        if ((status.isRunning || status.paused) && status.timeLeft > 0) {
            timerInterval = setTimeout(pollStatus, 1000);
        } else {
            timerInterval = null;
        }
    });
}

startBtn.addEventListener("click", () => {
    const minutes = parseInt(timeInput.value, 10);
    if (!minutes || minutes <= 0) return;
    chrome.runtime.sendMessage({ action: "start_timer", minutes }, () => {
        pollStatus();
    });
});

pauseBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "pause_timer" }, () => {
        pollStatus();
    });
});

resumeBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resume_timer" }, () => {
        pollStatus();
    });
});

resetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "reset_timer" }, () => {
        pollStatus();
    });
});

// Al abrir el popup, consulta el estado del temporizador
pollStatus();