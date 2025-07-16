# Extensión Simple Timer

Cinco temporizadores simples que se pueden usar para medir el tiempo de tus tarea.

[Extensión Disponible aquí](https://chromewebstore.google.com/detail/simple-timer/fepcghiedlojkgidicokpnhifnfbmabe), 
Disponible en Chrome, Edge, Opera y Brave


## To Do
- [x] Colocar en la función notify que ejecute el sonido de finalizado -> <P style="opacity: 0.5;">_MV3 no permite reproducir sonidos desde el service worker (background.js), solo desde el popup.js y cuando el popup esté abierto_</P>
- [ ] En la función notify que se envíe a eliminar el temporizador finalizado
- [ ] En la función notify que se envíe a actualizar el icono de la extensión a normal
- [ ] La función de actualizar el icono de la extensión debe verificar si hay al menos un temporizador activo

---

### Versiones

#### Version 1.4 (En desarrollo)
- Cambia el icono de la extensión cuando se active al menos un temporizador
- Se sincroniza la página de popup con el estado de los temporizadores, para que siempre se muestre el estado y el tiempo correcto de los temporizadores

#### Version 1.3 (Disponible en Chrome Web Store)
- Ahora la notificación se muestra a pesar de que el navegador esté minimizado
- Se cambia el mensaje de la notificación para que muestre el tiempo ingresado por el usuario en vez del id del temporizador
- Se arreglan bugs.

#### Version 1.2
- Se sacan permisos innecesarios.
- Se arreglan bugs.

#### Version 1.1
- Ahora si funciona.
- Se arreglan bugs.

#### Version 1.0
- ¡Está vivo!, ¡está vivo!
- Funciona.

---

### Atribuciones

- Icono "[Stopwatch](https://tabler.io/icons/icon/stopwatch)", bajo [Licencia MIT](https://opensource.org/license/mit)

- Sonido "[service-bell](https://soundbible.com/2218-Service-Bell-Help.html)" by Daniel Simion, bajo [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/)
