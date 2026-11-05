/**
 * despedida.js
 *
 * Envía el formulario de la página de desinstalación a Web3Forms, que reenvía cada
 * respuesta por correo. La extensión abre esta página con `?v=<versión>` mediante
 * `chrome.runtime.setUninstallURL` (background.js), y esa versión se adjunta al envío.
 *
 * La access key de Web3Forms se genera en https://web3forms.com con el correo que recibirá
 * las respuestas. Está pensada para ir en el código del cliente: solo permite enviar a ese correo.
 */
(function () {
	const WEB3FORMS_ACCESS_KEY = "956e7aa8-3bcf-47da-aa75-119bd3592f7c";
	const WEB3FORMS_URL = "https://api.web3forms.com/submit";

	const t = (clave) => (window.I18N ? window.I18N.t(clave) : clave);

	document.addEventListener("DOMContentLoaded", () => {
		const formulario = document.getElementById("formulario-feedback");
		const estado = document.querySelector("[data-estado]");
		const enviar = document.querySelector("[data-enviar]");
		const gracias = document.querySelector("[data-gracias]");

		const version = new URLSearchParams(location.search).get("v") || "desconocida";

		const mostrarError = (clave) => {
			estado.textContent = t(clave);
			estado.hidden = false;
		};

		formulario.addEventListener("submit", async (e) => {
			e.preventDefault();
			estado.hidden = true;

			const datos = new FormData(formulario);
			const motivo = datos.get("motivo") || "";
			const comentario = (datos.get("comentario") || "").trim();
			const correo = (datos.get("correo") || "").trim();

			if (!motivo && !comentario) {
				mostrarError("despedida.error_vacio");
				return;
			}
			if (correo && !formulario.correo.checkValidity()) {
				mostrarError("despedida.error_correo");
				formulario.correo.focus();
				return;
			}
			const cuerpo = {
				access_key: WEB3FORMS_ACCESS_KEY,
				subject: `Simple Timer: desinstalación (${motivo || "sin motivo"})`,
				from_name: "Simple Timer",
				botcheck: datos.get("botcheck") ? "on" : "",
				Motivo: motivo || "(no eligió)",
				Comentario: comentario || "(vacío)",
				Correo: correo || "(no dejó)",
				"Versión de la extensión": version,
				Idioma: window.I18N ? window.I18N.idioma() : "es",
				Navegador: navigator.userAgent,
			};
			// Permite responder directo desde el correo
			if (correo) cuerpo.replyto = correo;

			const textoBoton = enviar.querySelector("[data-i18n]");
			const textoOriginal = textoBoton.textContent;
			textoBoton.textContent = t("despedida.enviando");
			enviar.disabled = true;
			try {
				const respuesta = await fetch(WEB3FORMS_URL, {
					method: "POST",
					headers: { "Content-Type": "application/json", Accept: "application/json" },
					body: JSON.stringify(cuerpo),
				});
				const resultado = await respuesta.json();
				if (!respuesta.ok || !resultado.success) throw new Error(resultado.message || respuesta.status);

				formulario.hidden = true;
				gracias.hidden = false;
				gracias.focus();
			} catch (error) {
				console.error("[FEEDBACK] Error al enviar:", error);
				mostrarError("despedida.error_envio");
			} finally {
				textoBoton.textContent = textoOriginal;
				enviar.disabled = false;
			}
		});
	});
})();
