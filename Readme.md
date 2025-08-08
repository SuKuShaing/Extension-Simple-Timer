# Extensión Simple Timer

Cinco temporizadores simples que se pueden usar para medir el tiempo de tus tarea.

[Extensión Disponible aquí](https://chromewebstore.google.com/detail/simple-timer/fepcghiedlojkgidicokpnhifnfbmabe),
Disponible en Chrome, Edge, Opera y Brave


## Bug al pausar
- Al momento de pausar el temporizador aparece el logo de la extensión por un momento, como un parpadeo y aparece por encima del temporizador y pasa siempre que se pausé un temporizador
- teniendo dos temporizadores pausados, al momento de resetear un temporizador aparece el logo de la extensión por un momento, como un parpadeo y aparece por encima de los temporizadores y pasa siempre que se resetee un temporizador
- El error ocurre al tener los demás temporizadores pausados y al momento de pausar otro temporizador y no quedar ninguno corriendo, ahí ocurre el parpadeo, sí hay al menos un temporizador corriendo, no ocurre el parpadeo
- Al momento de tener pausados los demás temporizadores y darle a reset a uno de ellos, ocurre el parpadeo, reset a otro teniendo todos pausados y vuelve a ocurrir el parpadeo, el tema es cuando están todos pausados, mientras haya uno corriendo, no ocurre el parpadeo





## Bug en el cual se salió el color del icono del temporizador
- al tener 5 temporizadores y sonar la primera notificación, el icono de la extensión se puso en modo normal, sin embargo los temporizadores seguían activos, al abrir el popup se volvió a colocar le icono en modo activo
- al tener 5 temporizadores y sonaron las primeras 4 notificaciones y el icono de la extensión se puso en modo normal, al abrir el popup se volvió a colocar le icono en modo activo
- al tener 5 temporizadores, del primero al segundo de 10 min, el icono todo bien, después que terminó ese fallo el color del icono se puso en modo normal, al terminar el de 20 min el icono sigue sin color o en modo normal, al terminar el temporizador de 40 minutos, volvió el color al icono, como debía ser puesto que aún estaba funcionando el siguiente temporizador, al terminar el de 60 minutos, el icono se puso en modo normal




## ~~Bug de desactivación~~ van 2 éxitos, al 3ro borro este bug
Hay un bug, al colocar más de 2, los temporizadores restantes desaparecen

#### Experimentos de cantidad
- Experimento uno: 4 temporizadores, tiempo más largo de 20 minutos, solo se activaron 3 y pasado los 15 minutos se canceló el último temporizador
- Experimento dos: 5 temporizadores, tiempo más largo de 20 minutos, se activaron solo 1 y pasado los 11 minutos se cancelaron el resto de los temporizadores
- Experimento tres: 3 temporizadores, tiempo más largo de 30 minutos, de los cuales se activaron 2, el primero y el último, el segundo no se activó
- Experimento cuatro: 5 temporizadores, tiempo más largo de 30 minutos, solo el primero se activó, al minuto 15 fuí a revisar y todos se habían reiniciado
- Experimento cinco: 2 temporizadores, tiempo más largo de 20 minutos, solo el primero se activó, fuí a revisar y el otro se había desactivado



## To Do
- [ ] Que se puedan ingresar segundos en el input
- [ ] Al darle Enter en el input se debe iniciar el temporizador
- [ ] Colocar Iconos más bonitos en los botones
- [x] Bug al pausar
- [ ] Resolver el bug de desactivación de los temporizadores cuando habían varios a la vez
- [x] Modificar el CSS para que se vea mejor tiempo y dentro de la barra
- [x] Colocar en la función notify que ejecute el sonido de finalizado -> <P style="opacity: 0.6;">_MV3 no permite reproducir sonidos desde el service worker (background.js), solo desde el popup.js y cuando el popup.html esté abierto_</P>
- [x] En la función notify que se envíe a eliminar el temporizador finalizado
- [x] En la función notify que se envíe a actualizar el icono de la extensión a normal
- [x] La función de actualizar el icono de la extensión debe verificar si hay al menos un temporizador activo

---

### Versiones

#### Versión 1.6 (En desarrollo)
- Se añade un icono de pausa y reset más bonito
- Se arregla el bug del parpadeo al pausar y resetear los temporizadores

#### Versión 1.5 (Disponible en Chrome Web Store)
- Se resuelve el bug de desactivación de los temporizadores, cuando habían más de 2 temporizadores activos
- Se añade el icono de la extensión a la parte vacía del popup
- Se mejora la visualización del tiempo en la barra de tiempo

#### Versión 1.4
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
