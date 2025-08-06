# Extensión Simple Timer

Cinco temporizadores simples que se pueden usar para medir el tiempo de tus tarea.

[Extensión Disponible aquí](https://chromewebstore.google.com/detail/simple-timer/fepcghiedlojkgidicokpnhifnfbmabe),
Disponible en Chrome, Edge, Opera y Brave


## Bug de desactivación
Hay un bug, al colocar más de 2, los temporizadores restantes desaparecen

#### Experimentos de cantidad
- Experimento uno: 4 temporizadores, tiempo más largo de 20 minutos, solo se activaron 3 y pasado los 15 minutos se canceló el último temporizador
- Experimento dos: 5 temporizadores, tiempo más largo de 20 minutos, se activaron solo 1 y pasado los 11 minutos se cancelaron el resto de los temporizadores
- Experimento tres: 3 temporizadores, tiempo más largo de 30 minutos, de los cuales se activaron 2, el primero y el último, el segundo no se activó
- Experimento cuatro: 5 temporizadores, tiempo más largo de 30 minutos, solo el primero se activó, al minuto 15 fuí a revisar y todos se habían reiniciado
- Experimento cinco: 2 temporizadores, tiempo más largo de 20 minutos, solo el primero se activó, fuí a revisar y el otro se había desactivado

## To Do
- [ ] Resolver el bug de desactivación de los temporizadores
- [ ] Al darle Enter en el input se debe iniciar el temporizador
- [ ] Colocar Iconos más bonitos en los botones
- [X] Modificar el CSS para que se vea mejor tiempo y dentro de la barra
- [x] Colocar en la función notify que ejecute el sonido de finalizado -> <P style="opacity: 0.6;">_MV3 no permite reproducir sonidos desde el service worker (background.js), solo desde el popup.js y cuando el popup.html esté abierto_</P>
- [x] En la función notify que se envíe a eliminar el temporizador finalizado
- [x] En la función notify que se envíe a actualizar el icono de la extensión a normal
- [x] La función de actualizar el icono de la extensión debe verificar si hay al menos un temporizador activo

---

### Versiones

#### Versión 1.5 (En desarrollo)
- Se añade un icono de pausa y reset más bonito

#### Versión 1.4 (Disponible en Chrome Web Store)
- Cambia el icono de la extensión cuando se active al menos un temporizador
- Se sincroniza la página de popup con el estado de los temporizadores, para que siempre se muestre el estado y el tiempo correcto de los temporizadores
- Se añade la API de chrome.alarms para que despierte al Service Worker y pueda enviar la notificación de finalización del temporizador
- Se experimenta con la reproducción de sonidos pero no es viable porque no permite reproducir sonidos a menos que el popup esté abierto

#### Versión 1.3
- Ahora la notificación se muestra a pesar de que el navegador esté minimizado
- Se cambia el mensaje de la notificación para que muestre el tiempo ingresado por el usuario en vez del id del temporizador
- Se arreglan bugs.

#### Versión 1.2
- Se sacan permisos innecesarios.
- Se arreglan bugs.

#### Versión 1.1
- Ahora si funciona.
- Se arreglan bugs.

#### Versión 1.0
- ¡Está vivo!, ¡está vivo!
- Funciona.

---

### Atribuciones

- Icono y logo de la extensión "[Stopwatch](https://tabler.io/icons/icon/stopwatch)", bajo [Licencia MIT](https://opensource.org/license/mit)

- Sonido "[service-bell](https://soundbible.com/2218-Service-Bell-Help.html)" by Daniel Simion, bajo [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/)
