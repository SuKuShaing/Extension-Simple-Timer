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
    const iconPath = isActive
        ? {
              16: "Iconos/icon_active16.png",
              32: "Iconos/icon_active32.png",
              48: "Iconos/icon_active48.png",
              128: "Iconos/icon_active128.png",
          }
        : {
              16: "Iconos/icon16.png",
              32: "Iconos/icon32.png",
              48: "Iconos/icon48.png",
              128: "Iconos/icon128.png",
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
            let timeLeft =
                t.paused && t.pauseTime
                    ? t.endTime - t.pauseTime
                    : t.endTime - now;
            if (timeLeft > 0) {
                activeTimers.push({ id, timeLeft, paused: t.paused });
            }
        }
    }

    if (activeTimers.length === 0) {
        // No hay temporizadores activos, oculta el badge
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        // Detiene las alarmas de actualización del badge
        stopBadgeUpdateAlarms();
    } else {
        // Determina el color del badge: Azul si alguno corre, Gris si todos pausados
        const anyRunning = activeTimers.some((t) => !t.paused);
        const badgeColor = anyRunning ? "#006ce0" : "#7b7b7b";

        if (activeTimers.length === 1) {
            // Un solo temporizador activo, muestra el tiempo restante en minutos
            const timeLeftMinutes = Math.ceil(
                activeTimers[0].timeLeft / (60 * 1000)
            );
            chrome.action.setBadgeText({ text: timeLeftMinutes.toString() });
            chrome.action.setBadgeBackgroundColor({ color: badgeColor });
            chrome.action.setBadgeTextColor({ color: "#FFFFFF" }); // Texto blanco
            if (activeTimers[0].paused) {
                // Un temporizador pausado no cambia su badge, no hace falta despertar al worker
                stopBadgeUpdateAlarms();
            } else {
                // Inicia las alarmas para actualizar cada minuto
                startBadgeUpdateAlarms();
            }
        } else {
            // Múltiples temporizadores activos, muestra el número con "T"
            chrome.action.setBadgeText({ text: `${activeTimers.length}-T` });
            chrome.action.setBadgeBackgroundColor({ color: badgeColor });
            chrome.action.setBadgeTextColor({ color: "#FFFFFF" }); // Texto blanco
            // Detiene las alarmas de actualización del badge
            stopBadgeUpdateAlarms();
        }
    }
}

// Nueva función para iniciar las alarmas de actualización del badge
function startBadgeUpdateAlarms() {
    // Si ya hay alarmas de badge corriendo, no crear más
    if (badgeUpdateActive) {
        return;
    }

    badgeUpdateActive = true;

    // El badge ya se actualizó, así que la primera alarma va al próximo cambio de minuto.
    // Esto también evita adelantar la alarma cada vez que el worker despierta.
    scheduleNextBadgeUpdate();

    console.log("[TIMER DEBUG] Alarmas de actualización del badge iniciadas");
}

// Nueva función para programar la próxima actualización del badge
function scheduleNextBadgeUpdate() {
    if (!badgeUpdateActive) {
        return;
    }

    // Encuentra el temporizador corriendo más próximo a cambiar de minuto
    const now = Date.now();
    let nextUpdateTime = null;

    for (let id in timers) {
        const t = timers[id];
        // Un temporizador pausado no cambia su badge, no necesita alarma
        if (t && t.endTime && !t.paused) {
            const timeLeft = t.endTime - now;
            if (timeLeft > 0) {
                // Tiempo restante en el que el badge bajará al minuto siguiente
                const currentMinutes = Math.ceil(timeLeft / (60 * 1000));
                const nextMinuteChange = (currentMinutes - 1) * 60 * 1000;

                // Despierta 500 ms después del cambio para asegurar que ya ocurrió.
                // Chrome no dispara alarmas con menos de 1 segundo de separación.
                const updateDelay = Math.max(
                    1000,
                    timeLeft - nextMinuteChange + 500
                );

                if (!nextUpdateTime || updateDelay < nextUpdateTime) {
                    nextUpdateTime = updateDelay;
                }
            }
        }
    }

    if (nextUpdateTime) {
        chrome.alarms.create("badge-update", {
            when: now + nextUpdateTime,
        });
        console.log(
            `[TIMER DEBUG] Próxima actualización del badge en ${Math.round(
                nextUpdateTime / 1000
            )}s`
        );
    } else {
        // No hay temporizadores activos, detener las alarmas
        stopBadgeUpdateAlarms();
    }
}

// Nueva función para detener las alarmas de actualización del badge
function stopBadgeUpdateAlarms() {
    if (badgeUpdateActive) {
        chrome.alarms.clear("badge-update");
        badgeUpdateActive = false;
        console.log(
            "[TIMER DEBUG] Alarmas de actualización del badge detenidas"
        );
    }
}

/**
 * Formatea el tiempo para mostrar en la notificación de manera legible
 * @param {number} totalMs - Tiempo total en milisegundos
 * @returns {string} Tiempo formateado para la notificación
 */
function formatTimeForNotification(totalMs) {
    const totalSeconds = Math.round(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
        return `${seconds} segundo${seconds !== 1 ? "s" : ""}`;
    } else if (seconds === 0) {
        return `${minutes} minuto${minutes !== 1 ? "s" : ""}`;
    } else {
        return `${minutes} minuto${
            minutes !== 1 ? "s" : ""
        } y ${seconds} segundo${seconds !== 1 ? "s" : ""}`;
    }
}

// Al restaurar el estado, reprograma las alarmas si corresponde
const stateRestored = new Promise((resolve) => {
    chrome.storage.local.get("timersState", (data) => {
        console.log("[TIMER DEBUG] Restaurando estado:", data.timersState);

        if (data.timersState) {
            for (let id in data.timersState) {
                let t = data.timersState[id];
                timers[id] = {
                    timer: null,
                    endTime: t.endTime,
                    paused: t.paused,
                    pauseTime: t.pauseTime,
                    totalTime: t.totalTime,
                    originalMinutes: t.originalMinutes,
                };

                if (timers[id].endTime && !timers[id].paused) {
                    let timeLeft = timers[id].endTime - Date.now();
                    console.log(
                        `[TIMER DEBUG] Timer ${id}: timeLeft = ${timeLeft}ms (${Math.ceil(
                            timeLeft / 1000
                        )}s)`
                    );

                    // Dar margen de tolerancia de 30 segundos para evitar cancelaciones prematuras
                    if (timeLeft > -30000) {
                        // Si pasaron menos de 30 segundos del tiempo límite
                        if (timeLeft > 0) {
                            // Reprograma la alarma para la notificación final
                            chrome.alarms.create(`timer-${id}`, {
                                when: timers[id].endTime,
                            });
                            console.log(
                                `[TIMER DEBUG] Timer ${id} reprogramado`
                            );
                        } else {
                            // Está en el margen de tolerancia, asume que debe notificar ahora
                            console.log(
                                `[TIMER DEBUG] Timer ${id} debe notificar (margen de tolerancia)`
                            );
                            notify(id, timers[id].totalTime);
                        }
                    } else {
                        // Expiró hace más de 30 segundos, elimina silenciosamente
                        console.log(
                            `[TIMER DEBUG] Timer ${id} expirado hace tiempo, eliminando silenciosamente`
                        );
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
        console.log(
            "[TIMER DEBUG] Estado restaurado, icono y badge recalculados"
        );
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
                originalMinutes: timers[id].originalMinutes,
            };
        }
        console.log("[TIMER DEBUG] Guardando estado:", state);
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

/*
 * Petición de reseña
 *
 * Cuenta los temporizadores terminados y, en ciertos hitos, muestra una notificación
 * que invita a dejar una reseña en la Chrome Web Store:
 * - Si el usuario nunca hizo clic en "Dejar reseña": en el uso 10 y en cada múltiplo de 100.
 * - Si ya hizo clic alguna vez: solo en cada múltiplo de 1000.
 * El estado vive en chrome.storage.local, en `reviewState`, separado de `timersState`.
 */
const REVIEW_URL =
    "https://chromewebstore.google.com/detail/simple-timer/fepcghiedlojkgidicokpnhifnfbmabe/reviews";
const REVIEW_NOTIFICATION_ID = "review-request";
// Espera tras "¡Tiempo terminado!" para no taparla. Un setTimeout basta porque el service
// worker sigue vivo 30 s después del último evento, y una alarma no puede durar menos de 30 s.
const REVIEW_DELAY_MS = 10000;

// No mencionan cuántos temporizadores terminó el usuario, para que no se sienta vigilado
const REVIEW_MESSAGES = [
    {
        title: "¿Te está sirviendo Simple Timer?",
        message: "Déjanos una reseña en la Chrome Web Store.",
    },
    {
        title: "¿Te gusta Simple Timer?",
        message: "Déjanos tu reseña, nos ayuda a seguir mejorando.",
    },
    {
        title: "Cuéntale a los demás sobre Simple Timer",
        message: "Tu reseña ayuda a que otras personas lo encuentren.",
    },
    {
        title: "Cuéntanos cuánto te gusta Simple Timer",
        message: "Déjanos una reseña en la Chrome Web Store.",
    },
    {
        title: "¿Qué te parece Simple Timer?",
        message: "Tu opinión nos importa, déjanos una reseña.",
    },
    {
        title: "¿Simple Timer te ayuda con tu tiempo?",
        message: "Cuéntalo en una reseña en la Chrome Web Store.",
    },
    {
        title: "Ayúdanos a crecer",
        message: "Una reseña de Simple Timer marca la diferencia.",
    },
    {
        title: "¿Simple Timer te ha sido útil?",
        message: "Compártelo con una reseña en la Chrome Web Store.",
    },
    {
        title: "Tu opinión cuenta",
        message: "Déjale una reseña a Simple Timer, solo toma un minuto.",
    },
    {
        title: "¿Recomendarías Simple Timer?",
        message: "Déjanos una reseña y cuéntale a otros.",
    },
];

// Encadena las lecturas y escrituras de `reviewState` para que dos temporizadores que
// terminan a la vez (o un clic simultáneo) no se pisen el contador
let reviewStateQueue = Promise.resolve();

/**
 * Aplica `update` sobre `reviewState` y guarda el resultado, de forma serializada.
 * @param {(state: {completedTimers: number, reviewClicked: boolean}) => (Function|void)} update
 *        Modifica el estado recibido; puede devolver una acción a ejecutar después de guardar.
 */
function updateReviewState(update) {
    reviewStateQueue = reviewStateQueue
        .then(async () => {
            const data = await chrome.storage.local.get("reviewState");
            const state = {
                completedTimers: data.reviewState?.completedTimers || 0,
                reviewClicked: !!data.reviewState?.reviewClicked,
            };
            const afterSave = update(state);
            await chrome.storage.local.set({ reviewState: state });
            if (typeof afterSave === "function") afterSave();
        })
        .catch((error) => {
            console.error("[TIMER DEBUG] Error al actualizar reviewState:", error);
        });
}

/**
 * Indica si corresponde pedir la reseña al llegar a `completedTimers` usos.
 * @param {number} completedTimers - Temporizadores terminados, incluido el actual.
 * @param {boolean} reviewClicked - Si el usuario ya hizo clic en "Dejar reseña".
 * @returns {boolean}
 */
function shouldRequestReview(completedTimers, reviewClicked) {
    if (reviewClicked) return completedTimers % 1000 === 0;
    return completedTimers === 10 || completedTimers % 100 === 0;
}

/**
 * Suma un temporizador terminado y, si es un hito, programa la petición de reseña.
 */
function registerCompletedTimer() {
    updateReviewState((state) => {
        state.completedTimers++;
        console.log(
            `[TIMER DEBUG] Temporizadores terminados: ${state.completedTimers}`
        );
        if (shouldRequestReview(state.completedTimers, state.reviewClicked)) {
            return () => setTimeout(showReviewRequest, REVIEW_DELAY_MS);
        }
    });
}

/**
 * Muestra la notificación que pide la reseña, con un texto al azar.
 */
function showReviewRequest() {
    const text =
        REVIEW_MESSAGES[Math.floor(Math.random() * REVIEW_MESSAGES.length)];
    chrome.notifications.create(REVIEW_NOTIFICATION_ID, {
        type: "basic",
        iconUrl: "Iconos/icon128.png",
        title: text.title,
        message: text.message,
        buttons: [{ title: "Dejar reseña" }, { title: "Ahora no" }],
        priority: 1,
        silent: true, // "¡Tiempo terminado!" ya sonó
    });
    console.log("[TIMER DEBUG] Petición de reseña mostrada");
}

/**
 * Abre la página de reseñas y registra el clic, para pedirla solo cada 1000 usos.
 */
function openReviewPage() {
    chrome.tabs.create({ url: REVIEW_URL });
    chrome.notifications.clear(REVIEW_NOTIFICATION_ID);
    updateReviewState((state) => {
        state.reviewClicked = true;
    });
}

/**
 * Muestra una notificación nativa cuando un temporizador finaliza.
 * Detiene el temporizador después de mostrar la notificación.
 * @param {number} id - ID del temporizador que terminó.
 * @param {number} totalTimeMs - Tiempo total en milisegundos.
 */
function notify(id, totalTimeMs) {
    // Primero detiene el temporizador
    stopTimer(id);

    // Enviar mensaje para reproducir sonido desde el popup
    // comenté esta función porque no permite reproducir sonidos a menos que el popup esté abierto
    // chrome.runtime.sendMessage({ action: "play_sound", sound: "service-bell.mp3" });

    // Muestra la notificación
    const displayTime =
        totalTimeMs > 0 ? formatTimeForNotification(totalTimeMs) : "el tiempo";
    chrome.notifications.create({
        type: "basic",
        iconUrl: "Iconos/icon128.png",
        title: `¡Tiempo terminado!`,
        message: `Tu temporizador de ${displayTime} ha finalizado.`,
        priority: 2, // Prioridad alta (0-2)
        requireInteraction: true, // Evita que se oculte automáticamente
        silent: false, // Permite sonido
    });

    // Actualiza el badge después de detener el temporizador
    updateBadge();

    // Cuenta el uso y, si es un hito, pide una reseña unos segundos después
    registerCompletedTimer();
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
 * @param {number} minutes - Duración en minutos (puede ser decimal).
 */
function startTimer(id, minutes) {
    console.log(`[TIMER DEBUG] Iniciando timer ${id} por ${minutes} minutos`);

    // Solo limpia el temporizador específico, no llama a stopTimer que actualiza el icono
    if (timers[id]) {
        chrome.alarms.clear(`timer-${id}`);
    }

    const now = Date.now();
    const totalTime = minutes * 60 * 1000; // Convertir minutos a milisegundos
    const endTime = now + totalTime;

    timers[id] = {
        timer: null,
        endTime: endTime,
        paused: false,
        pauseTime: null,
        totalTime: totalTime,
        originalMinutes: minutes,
    };

    saveState();

    // Crea la alarma para la notificación final
    chrome.alarms.create(`timer-${id}`, { when: endTime });
    console.log(
        `[TIMER DEBUG] Timer ${id} iniciado, termina a las ${new Date(
            endTime
        ).toLocaleTimeString()}`
    );

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
    if (
        timers[id] &&
        timers[id].paused &&
        timers[id].endTime &&
        timers[id].pauseTime
    ) {
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
 * Páginas de la web (docs/, publicada en GitHub Pages).
 * La bienvenida se abre solo al instalar, no al actualizar.
 * La de despedida la abre Chrome al desinstalar; lleva la versión para el feedback.
 */
const WEB_URL = "https://sukushaing.github.io/Extension-Simple-Timer";
const WELCOME_URL = `${WEB_URL}/bienvenida.html`;
const UNINSTALL_URL = `${WEB_URL}/despedida.html?v=${chrome.runtime.getManifest().version}`;

// Se registra en cada arranque del worker: es idempotente y no requiere permisos
chrome.runtime.setUninstallURL(UNINSTALL_URL);

/**
 * Evento que se ejecuta cuando la extensión se instala o actualiza.
 * Resetea todos los temporizadores y deja el sistema limpio al instalar.
 * Espera a que se restaure el estado: si no, la restauración podría terminar después
 * y volver a cargar los temporizadores recién borrados junto con sus alarmas.
 */
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({ url: WELCOME_URL });
    }
    stateRestored.then(() => {
        for (let i = 1; i <= MAX_TIMERS; i++) stopTimer(i);
        // Detiene cualquier alarma de badge que pueda estar corriendo
        stopBadgeUpdateAlarms();
        console.log("La extensión se ha instalado con éxito");
    });
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
            const anyFutureAlarm = (alarms || []).some(
                (a) =>
                    a.name &&
                    a.name.startsWith("timer-") &&
                    a.scheduledTime &&
                    a.scheduledTime > now
            );
            const anyRunning = Object.values(timers).some(
                (t) => t && !t.paused && t.endTime && t.endTime > now
            );
            const anyPausedPending = Object.values(timers).some(
                (t) =>
                    t &&
                    t.paused &&
                    t.endTime &&
                    t.pauseTime &&
                    t.endTime - t.pauseTime > 0
            );
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

    // Todas las acciones esperan a que el estado se restaure: si el mensaje despertó al
    // service worker, actuar antes dejaría que la restauración pisara el cambio
    stateRestored.then(() => {
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
            let timeLeft = 0,
                total = 0;
            let t = timers[id];
            if (t && t.endTime) {
                timeLeft =
                    t.paused && t.pauseTime
                        ? t.endTime - t.pauseTime
                        : t.endTime - Date.now();
                if (timeLeft < 0) timeLeft = 0;
                total = t.totalTime || 0;
            }
            sendResponse({
                timeLeft,
                isRunning: !!(
                    t &&
                    !t.paused &&
                    t.endTime &&
                    t.endTime > Date.now()
                ),
                paused: t ? t.paused : false,
                endTime: t ? t.endTime : null,
                totalTime: total,
            });
        }
    });

    return true; // Indica que la respuesta será asíncrona
});

// Listener para alarmas de Chrome (notificación final y actualización de badge)
chrome.alarms.onAlarm.addListener((alarm) => {
    stateRestored.then(() => {
        if (alarm.name.startsWith("timer-")) {
            // Alarma de temporizador
            const id = parseInt(alarm.name.split("-")[1], 10);
            console.log(`[TIMER DEBUG] Alarma disparada para timer ${id}`);

            const t = timers[id];
            if (t && !t.paused) {
                console.log(`[TIMER DEBUG] Notificando timer ${id}`);
                notify(id, t.totalTime);
            } else {
                console.log(
                    `[TIMER DEBUG] Timer ${id} no existe o está pausado, ignorando alarma`
                );
            }
        } else if (alarm.name === "badge-update") {
            // Alarma de actualización del badge
            console.log("[TIMER DEBUG] Actualizando badge por alarma");
            updateBadge();

            // Programa la próxima actualización
            scheduleNextBadgeUpdate();
        }
    });
});

// Clic en el cuerpo de la petición de reseña: abre la página de reseñas
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === REVIEW_NOTIFICATION_ID) {
        openReviewPage();
    }
});

// Botones de la petición de reseña: 0 = "Dejar reseña", 1 = "Ahora no"
chrome.notifications.onButtonClicked.addListener(
    (notificationId, buttonIndex) => {
        if (notificationId !== REVIEW_NOTIFICATION_ID) return;
        if (buttonIndex === 0) {
            openReviewPage();
        } else {
            chrome.notifications.clear(REVIEW_NOTIFICATION_ID);
        }
    }
);
