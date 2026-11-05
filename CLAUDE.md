# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Extensión de navegador (Manifest V3) con 5 temporizadores independientes, publicada en la Chrome Web Store. Es JavaScript, HTML y CSS sin dependencias.

No hay `package.json`, build, linter ni tests: los archivos se cargan tal cual.

## Desarrollo y verificación

- **Cargar:** `chrome://extensions` → activar modo desarrollador → "Cargar descomprimida" → seleccionar la raíz del repo.
- **Aplicar cambios:** recargar la extensión en `chrome://extensions` si cambió `background.js` o `manifest.json`. Para `popup.*` y `styles.css` basta con reabrir el popup.
- **Logs:** los del service worker se ven en "Inspeccionar vistas: service worker"; los del popup, con clic derecho sobre el popup → Inspeccionar. Ambos usan el prefijo `[TIMER DEBUG]`.
- **Recargar borra los temporizadores:** `onInstalled` detiene todos, así que para probar la restauración de estado hay que detener el service worker, no recargar la extensión.

## Arquitectura

**`background.js` (service worker) es la única fuente de verdad.** `popup.js` no guarda estado de los temporizadores: envía comandos y consulta `get_timer_status` cada segundo mientras el temporizador está activo.

Protocolo de mensajes (`chrome.runtime.sendMessage`): `start_timer` (con `minutes`), `pause_timer`, `resume_timer`, `reset_timer`, `get_timer_status`. El listener rechaza cualquier mensaje sin un `id` entre 1 y 5, de modo que una acción global nueva tendría que cambiar esa validación.

### Ciclo de vida del service worker

Chrome puede terminar el service worker en cualquier momento, y esto condiciona el diseño:

- El fin de cada temporizador se dispara con una alarma `timer-<id>`, no con `setTimeout`. La alarma despierta al worker para notificar.
- Al arrancar, el worker restaura `timersState` desde `chrome.storage.local` y resuelve la promesa `stateRestored`. Solo `get_timer_status` y el listener de alarmas la esperan: un handler nuevo que lea `timers` también debe esperarla.
- Los temporizadores vencidos hace menos de 30 s notifican al restaurarse; los más antiguos se eliminan sin notificar.
- `saveState()` guarda con debounce (100 ms) y copia una lista fija de campos. Un campo nuevo en `timers[id]` debe agregarse en `saveState()` y en la restauración, o se perderá.

### Modelo de tiempo

- Un temporizador corriendo se define por `endTime` (timestamp absoluto).
- Al pausar se guarda `pauseTime` y se borra la alarma. El tiempo restante es `endTime - pauseTime`, y al reanudar se recalcula `endTime`.
- Cada cálculo de tiempo restante debe contemplar ambos casos, como ya hacen `updateBadge` y `get_timer_status`. `scheduleNextBadgeUpdate` es la excepción: ignora los pausados porque su badge no cambia.

### Icono y badge

- **Icono:** usa la variante `icon_active*` solo si hay un temporizador corriendo; los pausados no cuentan. `updateIconDebounced` también consulta las alarmas programadas.
- **Badge:** con un temporizador muestra los minutos restantes y con varios muestra `N-T`. Es azul si alguno corre y gris (`#7b7b7b`) si todos están pausados.
- **Actualización:** la alarma `badge-update` solo existe cuando hay exactamente un temporizador y está corriendo. Se dispara 500 ms después de cada cambio de minuto.

### Entrada de tiempo

`parseTimeInput` (`popup.js`) acepta dos formatos y redondea al segundo:

| Formato | Regla | Ejemplos |
| --- | --- | --- |
| Minutos | Coma o punto, máximo 2 decimales. El decimal es fracción de minuto | `2,5` = 2:30, `0,1` = 6 s, `,75` = 45 s, `1,30` = 1:18 |
| Segundos | Entero con sufijo `s`, `seg`, `segs`, `segundo` o `segundos`, con o sin espacio, sin distinguir mayúsculas | `10s`, `30 seg`, `90 segundos` = 1:30 |

Cualquier otro valor devuelve 0 y no inicia el temporizador. El listener `input` del campo deja pasar letras y espacios para el formato de segundos.

## Restricciones y puntos a cuidar

- **Número de temporizadores:** está repetido en `MAX_TIMERS` (`background.js`), en dos bucles `i <= 5` de `popup.js` y en las secciones de `popup.html`, escritas a mano. `TimerController` enlaza por IDs con el patrón `start-btn-<id>`, `time-input-<id>`, etc. Para cambiarlo hay que tocar los tres archivos.
- **Sonido:** MV3 no permite reproducir sonido desde el service worker, solo desde el popup abierto. Por eso el fin de un temporizador usa solo la notificación nativa (ver la llamada comentada en `notify`).
- **Permisos:** solo `notifications`, `storage` y `alarms`. La versión 1.2 quitó los innecesarios, y un permiso nuevo afecta la revisión de la Web Store.
- **Código sin uso:** las constantes globales al inicio de `popup.js` (`startBtn`, `pauseBtn`, etc.) y el `formatTime` global no se usan. Los iconos de los botones son SVG inline en `popup.html`, no los archivos de `Iconos/iconos_btns/`.

## Convenciones

- **Git:** solo el usuario hace commits y push. No ejecutes `git commit` ni `git push`; deja los cambios en el árbol de trabajo para que los revise.
- El código, los comentarios, los textos de la interfaz y los commits están en español.
- Cada versión nueva actualiza `version` en `manifest.json` y agrega una entrada en la sección "Versiones" de `Readme.md`. Las tareas se llevan en la lista "To Do" del mismo archivo.
