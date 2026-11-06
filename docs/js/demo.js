/**
 * demo.js
 *
 * Réplica jugable del popup de Simple Timer para la web. Imita el comportamiento de la
 * extensión: la entrada de tiempo (`parseTimeInput` de popup.js), la barra con rayas, el
 * badge (minutos con uno, `N-T` con varios, gris si todos están pausados), el icono activo
 * y la notificación al terminar. Corre solo en la página: no usa chrome.* ni guarda estado.
 *
 * Se monta en cada elemento con `data-demo`. El badge y el icono son opcionales y se buscan
 * dentro del `.navegador` que lo contiene (`data-demo-badge`, `data-demo-icono`).
 * Los botones con `data-probar="2,5"` inician ese tiempo en la primera demo de la página.
 */
(function () {
	const MAX_TIMERS = 5;
	const ICONO = "img/icon128.png";
	const ICONO_ACTIVO = "img/icon_active128.png";
	const DURACION_NOTIFICACION = 8000;

	// Iconos de los botones, los mismos SVG que usa popup.html
	const SVG = {
		play: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>',
		pausa: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>',
		detener: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" /></svg>',
	};

	const t = (clave) => (window.I18N ? window.I18N.t(clave) : clave);
	const idioma = () => (window.I18N ? window.I18N.idioma() : "es");

	/**
	 * Copia de `parseTimeInput` de popup.js: minutos con hasta 2 decimales (fracción de
	 * minuto) o segundos con sufijo. Devuelve milisegundos, o 0 si no es válido.
	 * @param {string} inputValue
	 * @returns {number}
	 */
	function parseTimeInput(inputValue) {
		if (!inputValue) return 0;
		const value = inputValue.trim().toLowerCase();

		const secondsMatch = value.match(/^(\d+)\s*(?:s|segs?|segundos?|secs?|seconds?)$/);
		if (secondsMatch) return parseInt(secondsMatch[1], 10) * 1000;

		const normalizedValue = value.replace(",", ".");
		if (!/^(?=.*\d)\d*(?:\.\d{0,2})?$/.test(normalizedValue)) return 0;

		return Math.round(parseFloat(normalizedValue) * 60) * 1000;
	}

	/**
	 * Filtro del input, igual al de popup.js: números, una coma o punto, hasta 2 decimales,
	 * y letras y espacios para el formato de segundos.
	 * @param {string} value
	 * @returns {string}
	 */
	function filtrarEntrada(value) {
		value = value.replace(/[^0-9,.\sa-z]/gi, "");
		const commaIndex = value.indexOf(",");
		const dotIndex = value.indexOf(".");
		if (commaIndex !== -1 && dotIndex !== -1) {
			const quitar = Math.max(commaIndex, dotIndex);
			value = value.substring(0, quitar) + value.substring(quitar + 1);
		}
		return value.replace(/([,.]\d{2})\d+/, "$1");
	}

	/** Formato mm:ss del display, igual al del popup. */
	function formatTime(ms) {
		const totalSeconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	}

	/** Duración legible para la notificación, como `formatTimeForNotification` en background.js. */
	function formatoNotificacion(totalMs) {
		const totalSeconds = Math.round(totalMs / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		const [min, mins, seg, segs, y] =
			idioma() === "en"
				? ["minute", "minutes", "second", "seconds", "and"]
				: ["minuto", "minutos", "segundo", "segundos", "y"];
		const textoMin = `${minutes} ${minutes === 1 ? min : mins}`;
		const textoSeg = `${seconds} ${seconds === 1 ? seg : segs}`;
		if (minutes === 0) return textoSeg;
		if (seconds === 0) return textoMin;
		return `${textoMin} ${y} ${textoSeg}`;
	}

	function crearBoton(clase, svg) {
		const boton = document.createElement("button");
		boton.type = "button";
		boton.className = `popup-btn ${clase}`.trim();
		boton.innerHTML = svg;
		return boton;
	}

	/**
	 * Muestra una notificación simulada en la esquina, como la del sistema.
	 * @param {number} totalMs - Duración del temporizador que terminó
	 */
	function mostrarNotificacion(totalMs) {
		const aviso = document.createElement("div");
		aviso.className = "notificacion";
		aviso.setAttribute("role", "status");

		const icono = document.createElement("img");
		icono.src = ICONO;
		icono.alt = "";

		const cuerpo = document.createElement("div");
		const titulo = document.createElement("strong");
		titulo.textContent = t("demo.notif_titulo");
		const mensaje = document.createElement("span");
		mensaje.textContent = t("demo.notif_mensaje").replace("{tiempo}", formatoNotificacion(totalMs));
		const origen = document.createElement("small");
		origen.textContent = t("demo.notif_origen");
		cuerpo.append(titulo, mensaje, origen);

		const cerrar = document.createElement("button");
		cerrar.type = "button";
		cerrar.textContent = "×";
		cerrar.setAttribute("aria-label", t("demo.cerrar"));

		aviso.append(icono, cuerpo, cerrar);

		const quitar = () => {
			if (aviso.classList.contains("saliendo")) return;
			aviso.classList.add("saliendo");
			aviso.addEventListener("animationend", () => aviso.remove(), { once: true });
			// Por si las animaciones están desactivadas
			setTimeout(() => aviso.remove(), 400);
		};
		cerrar.addEventListener("click", quitar);
		setTimeout(quitar, DURACION_NOTIFICACION);

		// Apila las notificaciones si terminan varias seguidas
		document.querySelectorAll(".notificacion:not(.saliendo)").forEach((otra) => {
			const actual = parseFloat(otra.style.bottom || "20");
			otra.style.bottom = `${actual + 120}px`;
		});
		document.body.append(aviso);
	}

	/**
	 * Un popup de demostración con cinco temporizadores.
	 * @param {HTMLElement} popup - Contenedor con `data-demo`
	 */
	function Demo(popup) {
		const navegador = popup.closest(".navegador");
		this.popup = popup;
		this.badge = navegador ? navegador.querySelector("[data-demo-badge]") : null;
		this.icono = navegador ? navegador.querySelector("[data-demo-icono]") : null;
		this.hero = popup.closest(".hero");
		this.timers = [];
		this.intervalo = null;

		popup.textContent = ""; // Quita el contenido de <noscript>
		for (let id = 1; id <= MAX_TIMERS; id++) this.timers.push(this.crearFila(id));

		const logo = document.createElement("div");
		logo.className = "popup-logo";
		logo.setAttribute("aria-hidden", "true");
		logo.innerHTML = `<img src="${ICONO}" alt="" /><span>Simple Timer</span>`;
		popup.append(logo);

		this.traducir();
		document.addEventListener("cambio-idioma", () => this.traducir());
		this.actualizar();
	}

	/** Crea la fila de un temporizador con sus dos vistas: entrada y barra. */
	Demo.prototype.crearFila = function (id) {
		const fila = document.createElement("div");
		fila.className = "popup-fila";

		const vistaEntrada = document.createElement("div");
		vistaEntrada.className = "popup-vista";
		const input = document.createElement("input");
		input.type = "text";
		input.className = "popup-input";
		input.autocomplete = "off";
		input.spellcheck = false;
		input.maxLength = 14;
		const iniciar = crearBoton("iniciar", SVG.play);
		vistaEntrada.append(input, iniciar);

		const vistaActiva = document.createElement("div");
		vistaActiva.className = "popup-vista";
		vistaActiva.hidden = true;
		const barra = document.createElement("div");
		barra.className = "popup-barra";
		const relleno = document.createElement("div");
		relleno.className = "popup-relleno";
		const tiempo = document.createElement("div");
		tiempo.className = "popup-tiempo";
		tiempo.setAttribute("role", "timer");
		barra.append(relleno, tiempo);
		const pausar = crearBoton("", SVG.pausa);
		const reanudar = crearBoton("", SVG.play);
		reanudar.hidden = true;
		const detener = crearBoton("detener", SVG.detener);
		vistaActiva.append(barra, pausar, reanudar, detener);

		fila.append(vistaEntrada, vistaActiva);
		this.popup.append(fila);

		const timer = {
			id,
			input,
			iniciar,
			vistaEntrada,
			vistaActiva,
			relleno,
			tiempo,
			pausar,
			reanudar,
			detener,
			endTime: null,
			pauseTime: null,
			total: 0,
		};

		input.addEventListener("input", () => {
			input.value = filtrarEntrada(input.value);
			input.classList.remove("invalido");
		});
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.iniciar(timer);
			}
		});
		iniciar.addEventListener("click", () => this.iniciar(timer));
		pausar.addEventListener("click", () => this.pausar(timer));
		reanudar.addEventListener("click", () => this.reanudar(timer));
		detener.addEventListener("click", () => {
			this.detener(timer);
			input.focus();
		});

		return timer;
	};

	Demo.prototype.traducir = function () {
		for (const timer of this.timers) {
			timer.input.placeholder = t("demo.placeholder");
			timer.input.setAttribute("aria-label", t("demo.input_aria").replace("{n}", timer.id));
			timer.input.title = t("demo.input_title");
			const etiquetas = [
				[timer.iniciar, "demo.iniciar"],
				[timer.pausar, "demo.pausar"],
				[timer.reanudar, "demo.reanudar"],
				[timer.detener, "demo.detener"],
			];
			for (const [boton, clave] of etiquetas) {
				boton.title = t(clave);
				boton.setAttribute("aria-label", t(clave));
			}
		}
	};

	/** Tiempo restante; contempla el caso pausado, como `updateBadge` en background.js. */
	Demo.prototype.restante = function (timer) {
		if (!timer.endTime) return 0;
		const referencia = timer.pauseTime || Date.now();
		return Math.max(0, timer.endTime - referencia);
	};

	Demo.prototype.iniciar = function (timer) {
		const ms = parseTimeInput(timer.input.value);
		if (ms <= 0) {
			// Reinicia la animación de error
			timer.input.classList.remove("invalido");
			void timer.input.offsetWidth;
			timer.input.classList.add("invalido");
			timer.input.focus();
			return;
		}
		timer.total = ms;
		timer.endTime = Date.now() + ms;
		timer.pauseTime = null;
		this.actualizar();
		timer.pausar.focus();
	};

	Demo.prototype.pausar = function (timer) {
		timer.pauseTime = Date.now();
		this.actualizar();
		timer.reanudar.focus();
	};

	Demo.prototype.reanudar = function (timer) {
		timer.endTime = Date.now() + (timer.endTime - timer.pauseTime);
		timer.pauseTime = null;
		this.actualizar();
		timer.pausar.focus();
	};

	Demo.prototype.detener = function (timer) {
		timer.endTime = null;
		timer.pauseTime = null;
		timer.total = 0;
		this.actualizar();
	};

	/**
	 * Inicia un tiempo en el primer temporizador libre. Si están todos ocupados, reemplaza
	 * el último. Lo usan los ejemplos de la tabla de formatos.
	 * @param {string} valor
	 */
	Demo.prototype.probar = function (valor) {
		const timer = this.timers.find((tm) => !tm.endTime) || this.timers[this.timers.length - 1];
		this.detener(timer);
		timer.input.value = valor;
		this.iniciar(timer);

		const caja = this.popup.getBoundingClientRect();
		if (caja.top < 70 || caja.bottom > window.innerHeight) {
			this.popup.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

	/** Refresca la UI, el badge y el icono, y termina los temporizadores vencidos. */
	Demo.prototype.actualizar = function () {
		const activos = [];

		for (const timer of this.timers) {
			if (timer.endTime && !timer.pauseTime && Date.now() >= timer.endTime) {
				const total = timer.total;
				this.detener(timer);
				mostrarNotificacion(total);
				return; // detener() ya volvió a llamar a actualizar()
			}

			const enUso = Boolean(timer.endTime);
			const pausado = Boolean(timer.pauseTime);
			timer.vistaEntrada.hidden = enUso;
			timer.vistaActiva.hidden = !enUso;

			if (enUso) {
				const restante = this.restante(timer);
				activos.push({ restante, pausado });
				timer.tiempo.textContent = formatTime(restante);
				timer.relleno.style.width = `${(restante / timer.total) * 100}%`;
				timer.relleno.classList.toggle("corriendo", !pausado);
				timer.pausar.hidden = pausado;
				timer.reanudar.hidden = !pausado;
			}
		}

		const algunoCorre = activos.some((a) => !a.pausado);
		this.popup.classList.toggle("con-temporizadores", activos.length > 0);
		// Detiene las rayas del fondo del hero mientras algún temporizador corre
		if (this.hero) this.hero.classList.toggle("temporizador-corriendo", algunoCorre);

		if (this.icono) this.icono.src = algunoCorre ? ICONO_ACTIVO : ICONO;

		if (this.badge) {
			if (activos.length === 0) {
				this.badge.hidden = true;
			} else {
				this.badge.hidden = false;
				this.badge.textContent =
					activos.length === 1 ? String(Math.ceil(activos[0].restante / 60000)) : `${activos.length}-T`;
				this.badge.classList.toggle("pausado", !algunoCorre);
			}
		}

		// El intervalo solo vive mientras algún temporizador corre
		if (algunoCorre && !this.intervalo) {
			this.intervalo = setInterval(() => this.actualizar(), 250);
		} else if (!algunoCorre && this.intervalo) {
			clearInterval(this.intervalo);
			this.intervalo = null;
		}
	};

	document.addEventListener("DOMContentLoaded", () => {
		const demos = Array.from(document.querySelectorAll("[data-demo]"), (el) => new Demo(el));
		if (demos.length === 0) return;

		const ejemplos = document.querySelectorAll("[data-probar]");
		ejemplos.forEach((boton) => {
			boton.addEventListener("click", () => demos[0].probar(boton.dataset.probar));
		});

		// En inglés los ejemplos usan punto decimal y "s": la extensión no acepta "sec"
		const adaptarEjemplos = () => {
			ejemplos.forEach((boton) => {
				if (!boton.dataset.probarEs) boton.dataset.probarEs = boton.dataset.probar;
				const valor =
					idioma() === "en"
						? boton.dataset.probarEs.replace(",", ".").replace(/\s*seg$/, " s")
						: boton.dataset.probarEs;
				boton.dataset.probar = valor;
				boton.lastChild.textContent = valor;
			});
		};
		adaptarEjemplos();
		document.addEventListener("cambio-idioma", adaptarEjemplos);
	});
})();
