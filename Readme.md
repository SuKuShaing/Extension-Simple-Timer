# Extensión Simple Timer

Cinco temporizadores simples que se pueden usar para medir el tiempo de una tarea.

## [Extensión Disponible aquí](https://chromewebstore.google.com/detail/simple-timer/fepcghiedlojkgidicokpnhifnfbmabe)
Disponible en Chrome, Edge, Opera y Brave


## To Do
- [ ] Colocar en la función notify que ejecute el sonido de finalizado
- [ ] En la función notify que se envíe a eliminar el temporizador finalizado
- [ ] En la función notify que se envíe a actualizar el icono de la extensión a normal
- [ ] La función de actualizar el icono de la extensión debe verificar si hay al menos un temporizador activo

---

### Versiones

#### Version 1.4 (actual)
- Cambia el icono de la extensión cuando se active al menos un temporizador
- Se sincroniza la página de popup con el estado de los temporizadores, para que siempre se muestre el estado correcto

#### Version 1.3
- Ahora la notificación se muestra a pesar de que el navegador esté minimizado
- Se cambia el mensaje de la notificación para que muestre el tiempo ingresado por el usuario en vez del id del temporizador

#### Version 1.2
- Se sacan permisos innecesarios.