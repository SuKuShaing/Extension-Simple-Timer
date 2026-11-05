/**
 * i18n.js
 *
 * Traduce la web entre español e inglés sin frameworks.
 *
 * - El español vive en el HTML (es lo que indexan los buscadores y lo que se ve sin JS).
 *   Aquí solo está el inglés, en `EN`. Al volver al español se restaura el HTML original.
 * - `data-i18n="clave"` reemplaza el contenido del elemento (admite HTML).
 * - `data-i18n-attr="atributo:clave, otro:clave"` traduce atributos (placeholder, alt, etc.).
 * - `TEXTOS_JS` tiene los textos que generan los scripts, en ambos idiomas; se leen con `I18N.t()`.
 * - El idioma se elige así: el guardado en localStorage, si no el del navegador, y si no es
 *   español ni inglés, inglés. Al cambiarlo se emite el evento `cambio-idioma` en `document`.
 *
 * Se carga sin `defer` en el <head> para ocultar la página hasta traducirla y evitar que
 * se vea el español un instante.
 */
(function () {
	const IDIOMAS = ["es", "en"];
	const CLAVE_GUARDADO = "simple-timer-idioma";

	const EN = {
		// Común
		"comun.nav_principal": "Main",
		"comun.instalar_corto": "Install free",
		"comun.instalar": "Add to your browser, it's free",
		"comun.demo_aria": "Simple Timer demo",
		"comun.creada_por": 'Made by <a href="https://www.linkedin.com/in/sebastiansanhuezatapia/">Sebastián Sanhueza Tapia</a>',
		"comun.web_store": "Chrome Web Store",
		"comun.codigo": "Code on GitHub",
		"comun.inicio": "Home",
		"comun.atribucion": 'Icon based on <a href="https://tabler.io/icons/icon/stopwatch">Stopwatch from Tabler Icons</a>, MIT license.',

		// Landing
		"inicio.titulo": "Simple Timer: five timers in your browser",
		"inicio.descripcion": "Free extension with five independent timers for Chrome, Edge, Opera and Brave. It notifies you when time is up and shows the time left on its icon.",
		"inicio.og_descripcion": "Five independent timers, one click away in your browser.",
		"inicio.nav_funciones": "Features",
		"inicio.nav_formatos": "How to use",
		"inicio.nav_capturas": "Screenshots",
		"inicio.nav_preguntas": "FAQ",
		"inicio.etiqueta": "Free extension for Chrome, Edge, Opera and Brave",
		"inicio.h1": 'Five timers, <span class="resaltado">one click away</span>',
		"inicio.subtitulo": "Time your work sessions, your coffee break or the pasta on the stove without leaving the browser. Type the minutes, hit play and get back to work: Simple Timer lets you know when time is up.",
		"inicio.ver_funciones": "See features",
		"inicio.confianza_1": "No account",
		"inicio.confianza_2": "No ads",
		"inicio.confianza_3": "Open source",
		"inicio.demo_url": "your-favorite-site.com",
		"inicio.demo_pista": "Try it! Type a time, like <strong>10s</strong> or <strong>2.5</strong>, and press play or Enter.",
		"inicio.funciones_titulo": "Everything you need, nothing in the way",
		"inicio.funciones_sub": "Simple Timer does one thing and does it well: it keeps time while you focus on what matters.",
		"inicio.f1_titulo": "Five timers at once",
		"inicio.f1_texto": "Start, pause and stop each one on its own. Keep track of the meeting, the break and the oven at the same time.",
		"inicio.f2_titulo": "Time always in sight",
		"inicio.f2_texto": 'The icon shows the minutes left (<span class="badge-ejemplo">12</span>) or how many timers are running (<span class="badge-ejemplo">3-T</span>). It turns gray (<span class="badge-ejemplo pausado">12</span>) when they are paused.',
		"inicio.f3_titulo": "It tells you even when you're not looking",
		"inicio.f3_texto": "When time is up you get a system notification, even with the browser minimized. It stays until you see it.",
		"inicio.f4_titulo": "Type the time your way",
		"inicio.f4_texto": "Minutes with decimals (<code>2.5</code> is 2:30) or seconds with an s (<code>90s</code>). Press Enter and you're done.",
		"inicio.f5_titulo": "Keeps counting in the background",
		"inicio.f5_texto": "Close the popup and keep browsing: the timer doesn't stop. Open it again to see exactly how much time is left.",
		"inicio.f6_titulo": "Private and lightweight",
		"inicio.f6_texto": "It only asks for three permissions: notifications, storage and alarms. It doesn't read the pages you visit or send your data anywhere.",
		"inicio.formatos_etiqueta": "How to use",
		"inicio.formatos_titulo": "Type the time your way",
		"inicio.formatos_texto": "Type a number and it's read as minutes. Need more precision? Use decimals: the decimal part is a fraction of a minute. For seconds, add an <code>s</code> at the end.",
		"inicio.formatos_probar": "Click any example to try it in the demo.",
		"inicio.formatos_nota": "Works with a period or a comma and up to two decimals. Seconds can be written as <code>10s</code> or <code>10 s</code>.",
		"inicio.tabla_escribes": "You type",
		"inicio.tabla_dura": "Lasts",
		"inicio.tabla_por_que": "Why",
		"inicio.ej_25": "Whole minutes",
		"inicio.ej_2_5": "Two and a half minutes",
		"inicio.ej_075": "You can skip the zero",
		"inicio.ej_0_1": "A tenth of a minute",
		"inicio.ej_10s": "Seconds with an s",
		"inicio.ej_90seg": "More than 60 seconds works too",
		"inicio.capturas_titulo": "This is how it looks in your browser",
		"inicio.capturas_sub": "A small popup next to the address bar, always at hand.",
		"inicio.cap1_alt": "Simple Timer open in Chrome, with five times ready to start",
		"inicio.cap2_alt": "One timer running, the icon shows 3 minutes",
		"inicio.cap3_alt": "Two timers running, the icon shows 2-T",
		"inicio.cap4_alt": "Four timers running at once",
		"inicio.cap2": "One timer: the icon shows the minutes",
		"inicio.cap3": "Several: the icon counts them",
		"inicio.cap4": "Up to five at the same time",
		"inicio.preguntas_titulo": "Frequently asked questions",
		"inicio.p1": "Which browsers does it work on?",
		"inicio.r1": "Chrome, Edge, Opera, Brave and any Chromium-based browser that can install extensions from the Chrome Web Store.",
		"inicio.p2": "Does an alarm sound when time is up?",
		"inicio.r2": "Simple Timer notifies you with a system notification, which plays a sound or not depending on your computer's notification settings.",
		"inicio.p3": "I don't see the notifications, what can I do?",
		"inicio.r3": "Check that your system allows notifications from your browser:",
		"inicio.r3_windows": "<strong>Windows:</strong> Settings → System → Notifications. Turn on notifications for your browser and turn off “Do not disturb”.",
		"inicio.r3_mac": "<strong>macOS:</strong> System Settings → Notifications → your browser, and allow notifications.",
		"inicio.p4": "What happens if I close the popup?",
		"inicio.r4": "Nothing: the timer keeps running and the icon keeps showing the time. The popup is just a window to see and control it.",
		"inicio.p5": "Is it free? Does it collect my data?",
		"inicio.r5": 'It\'s free, ad-free and open source. Timers are stored only in your browser and the extension doesn\'t send data to any server. You can check the code on <a href="https://github.com/SuKuShaing/Extension-Simple-Timer">GitHub</a>.',
		"inicio.banda_titulo": "Start timing today",
		"inicio.banda_texto": "It installs in seconds and needs no account. Pin it to the toolbar and your timers are always one click away.",

		// Bienvenida
		"bienvenida.titulo": "Welcome to Simple Timer",
		"bienvenida.h1": "Thanks for installing Simple Timer!",
		"bienvenida.sub": "It's ready to use. Follow these three steps and your timers will always be one click away.",
		"bienvenida.p1_titulo": "Pin the icon to the toolbar",
		"bienvenida.p1_texto": "Click the extensions button, the puzzle piece next to the address bar, and then the pin next to <strong>Simple Timer</strong>.",
		"bienvenida.p1_por_que": "That way you'll see the minutes left on the icon without opening anything.",
		"bienvenida.p1_edge": "In Edge, the button next to the extension is an eye: “Show in toolbar”.",
		"bienvenida.menu_titulo": "Extensions",
		"bienvenida.p2_titulo": "Type a time and hit play",
		"bienvenida.p2_texto": "Open Simple Timer, type a time and press play or Enter. You can practice right here:",
		"bienvenida.p2_ej1": "<code>25</code> is 25 minutes",
		"bienvenida.p2_ej2": "<code>2.5</code> is 2 minutes and 30 seconds",
		"bienvenida.p2_ej3": "<code>30s</code> is 30 seconds",
		"bienvenida.p3_titulo": "Make sure notifications get through",
		"bienvenida.p3_texto": "When a timer ends, Simple Timer lets you know with a system notification. If your computer blocks them, you won't see it.",
		"bienvenida.p3_prueba": "Give it a try: start a <code>10s</code> timer and wait.",
		"bienvenida.p3_windows": "Settings → System → Notifications. Turn on notifications for your browser and turn off “Do not disturb”.",
		"bienvenida.p3_mac": "System Settings → Notifications → your browser. Allow notifications and choose the “Alerts” style so they don't go away on their own.",
		"bienvenida.ver_todo": "See all features",

		// Despedida
		"despedida.titulo": "Simple Timer was uninstalled",
		"despedida.h1": "Sorry to see you go",
		"despedida.sub": "Simple Timer was uninstalled. Would you tell us why? It takes less than a minute and helps us improve it.",
		"despedida.motivo": "Why did you uninstall it?",
		"despedida.m_no_necesito": "I don't need it anymore",
		"despedida.m_no_funcionaba": "It didn't work as I expected",
		"despedida.m_faltaba": "It was missing a feature",
		"despedida.m_notificaciones": "I wasn't getting the notifications",
		"despedida.m_alternativa": "I found an alternative",
		"despedida.m_otro": "Other reason",
		"despedida.comentario": "What could we improve?",
		"despedida.opcional": "(optional)",
		"despedida.comentario_placeholder": "Tell us what happened or what you missed",
		"despedida.correo": "Your email",
		"despedida.correo_placeholder": "name@email.com",
		"despedida.correo_ayuda": "Only if you'd like a reply. We won't use it for anything else.",
		"despedida.enviar": "Send feedback",
		"despedida.gracias_titulo": "Thanks for letting us know!",
		"despedida.gracias_texto": "We read every comment. If you left your email, we may get back to you.",
		"despedida.reinstalar": 'Was it a mistake? <a href="https://chromewebstore.google.com/detail/simple-timer/fepcghiedlojkgidicokpnhifnfbmabe">Install Simple Timer again</a>',
	};

	// Textos que generan los scripts (demo, formulario, selector de idioma)
	const TEXTOS_JS = {
		es: {
			"comun.cambiar_idioma": "Change language to English",
			"demo.placeholder": "ej. 2,5",
			"demo.input_aria": "Tiempo del temporizador {n}",
			"demo.input_title": "Minutos con decimales (2,5 = 2 min 30 s) o segundos con una s (30s)",
			"demo.iniciar": "Iniciar temporizador",
			"demo.pausar": "Pausar",
			"demo.reanudar": "Reanudar",
			"demo.detener": "Detener",
			"demo.notif_titulo": "¡Tiempo terminado!",
			"demo.notif_mensaje": "Tu temporizador de {tiempo} ha finalizado.",
			"demo.notif_origen": "Simple Timer · demostración",
			"demo.cerrar": "Cerrar notificación",
			"despedida.error_vacio": "Elige un motivo o escribe un comentario.",
			"despedida.error_correo": "Ese correo no parece válido.",
			"despedida.error_envio": "No se pudo enviar. Inténtalo de nuevo en un momento.",
			"despedida.enviando": "Enviando…",
		},
		en: {
			"comun.cambiar_idioma": "Cambiar idioma a español",
			"demo.placeholder": "e.g. 2.5",
			"demo.input_aria": "Time for timer {n}",
			"demo.input_title": "Minutes with decimals (2.5 = 2 min 30 s) or seconds with an s (30s)",
			"demo.iniciar": "Start timer",
			"demo.pausar": "Pause",
			"demo.reanudar": "Resume",
			"demo.detener": "Stop",
			"demo.notif_titulo": "Time's up!",
			"demo.notif_mensaje": "Your {tiempo} timer has finished.",
			"demo.notif_origen": "Simple Timer · demo",
			"demo.cerrar": "Close notification",
			"despedida.error_vacio": "Choose a reason or write a comment.",
			"despedida.error_correo": "That email doesn't look valid.",
			"despedida.error_envio": "It couldn't be sent. Please try again in a moment.",
			"despedida.enviando": "Sending…",
		},
	};

	// Contenido y atributos originales (español) de cada elemento, para poder restaurarlos
	const originales = new WeakMap();

	function detectarIdioma() {
		try {
			const guardado = localStorage.getItem(CLAVE_GUARDADO);
			if (IDIOMAS.includes(guardado)) return guardado;
		} catch (e) {
			// localStorage bloqueado: se usa el idioma del navegador
		}
		const preferidos = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
		for (const preferido of preferidos) {
			const base = preferido.slice(0, 2).toLowerCase();
			if (IDIOMAS.includes(base)) return base;
		}
		return "en";
	}

	let idiomaActual = detectarIdioma();
	document.documentElement.lang = idiomaActual;
	if (idiomaActual !== "es") document.documentElement.classList.add("i18n-pendiente");

	function original(el) {
		if (!originales.has(el)) originales.set(el, { html: el.innerHTML, attrs: {} });
		return originales.get(el);
	}

	function aplicar() {
		const ingles = idiomaActual === "en";

		document.querySelectorAll("[data-i18n]").forEach((el) => {
			const guardado = original(el);
			const traduccion = EN[el.dataset.i18n];
			el.innerHTML = ingles && traduccion !== undefined ? traduccion : guardado.html;
		});

		document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
			const guardado = original(el);
			el.dataset.i18nAttr.split(",").forEach((par) => {
				const [attr, clave] = par.split(":").map((s) => s.trim());
				if (!(attr in guardado.attrs)) guardado.attrs[attr] = el.getAttribute(attr);
				const traduccion = EN[clave];
				el.setAttribute(attr, ingles && traduccion !== undefined ? traduccion : guardado.attrs[attr]);
			});
		});

		document.querySelectorAll("[data-selector-idioma]").forEach((boton) => {
			const destino = boton.querySelector("[data-idioma-destino]");
			if (destino) destino.textContent = ingles ? "ES" : "EN";
			boton.setAttribute("aria-label", t("comun.cambiar_idioma"));
			boton.title = t("comun.cambiar_idioma");
		});

		document.documentElement.lang = idiomaActual;
	}

	function t(clave) {
		const textos = TEXTOS_JS[idiomaActual] || TEXTOS_JS.es;
		return textos[clave] !== undefined ? textos[clave] : clave;
	}

	function cambiar(idioma) {
		if (!IDIOMAS.includes(idioma) || idioma === idiomaActual) return;
		idiomaActual = idioma;
		try {
			localStorage.setItem(CLAVE_GUARDADO, idioma);
		} catch (e) {
			// Sin localStorage la elección dura solo esta visita
		}
		aplicar();
		document.dispatchEvent(new CustomEvent("cambio-idioma", { detail: { idioma } }));
	}

	window.I18N = {
		t,
		cambiar,
		idioma: () => idiomaActual,
	};

	document.addEventListener("DOMContentLoaded", () => {
		try {
			aplicar();
		} finally {
			document.documentElement.classList.remove("i18n-pendiente");
		}
		document.querySelectorAll("[data-selector-idioma]").forEach((boton) => {
			boton.addEventListener("click", () => cambiar(idiomaActual === "es" ? "en" : "es"));
		});
	});
})();
