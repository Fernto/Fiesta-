# Invitación de 3 años 🎈

Proyecto Angular (standalone components) con una invitación web infantil,
responsiva y en paleta pastel.

## Cómo correrlo

```bash
npm install
npm start
```

Luego abre `http://localhost:4200`.

## Datos compartidos y panel organizador

El enlace discreto en la palabra **familia** abre el panel de organización. Desde ahí se puede editar fecha y hora, datos de la misa y fiesta, enlaces de Maps y teléfono de WhatsApp. Las respuestas RSVP se guardan en Netlify Blobs, no en el navegador del invitado.

Antes del siguiente despliegue, configura en Netlify una variable de entorno llamada `ORGANIZER_PASSWORD` con una contraseña larga y única:

1. Abre la configuración del sitio en Netlify y entra a **Environment variables**.
2. Añade `ORGANIZER_PASSWORD` para Production (y Deploy Previews si las usas). No la guardes en el repositorio ni la compartas en el chat.
3. Publica la rama conectada. Netlify detectará las funciones en `netlify/functions` y las compilará junto a Angular.

El organizador entra desde **familia** y usa esa contraseña. Los registros anteriores guardados en `localStorage` no se migran; las respuestas nuevas quedarán compartidas entre dispositivos.

Para desarrollar con las funciones de Netlify disponibles, ejecuta `npx netlify-cli dev` desde la raíz del repositorio. `ng serve` por sí solo no ejecuta funciones y mostrará los valores locales predeterminados.

## Cómo personalizar los datos

Edita el objeto que devuelve `InvitationService`:

```
src/app/invitation/invitation.service.ts
```

Los valores iniciales de respaldo y las rutas de imágenes están en:

```
src/app/invitation/models/invitation-data.model.ts
```

Los valores de fecha y lugares se cargan desde la función Netlify después de iniciar la página; los cambios del organizador se guardan en Netlify Blobs.

### Campos nuevos a llenar

- `eventDate`: objeto `Date` real (antes eran dos strings sueltos de
  fecha y hora). De ahí sale la cuenta regresiva y el archivo `.ics`.
- `mapsEmbedUrl`: la URL de "Insertar un mapa" de Google Maps (botón
  Compartir > Insertar un mapa > copiar el `src` del iframe).
- `childPhotoUrl`, `dressCode`, `giftSuggestion`: opcionales — si los
  dejas vacíos, esas secciones no se muestran.

## Funcionalidad incluida

- **Cuenta regresiva** en vivo (días/horas/minutos) hasta la fecha del evento.
- **RSVP compartido**: cada respuesta se guarda en Netlify Blobs y el mensaje de WhatsApp incluye la cantidad de invitados.
- **Confirmar por WhatsApp** y **Abrir en Google Maps** son enlaces
  reales (`<a href>`), no solo `window.open`, así que funcionan aunque
  el navegador bloquee ventanas emergentes y son accesibles por teclado.
- **Mapa embebido** (`iframe`) además del botón para abrir Maps.
- **Compartir invitación**: usa la Web Share API en celulares; si el
  navegador no la soporta, copia el link al portapapeles.
- **Agregar a mi calendario**: genera y descarga un archivo `.ics`
  con los datos del evento.

## Notas técnicas

- Compatible con Angular 18 (standalone components, sin NgModules).
- Las fuentes (Baloo 2 y Quicksand) se cargan desde Google Fonts en
  `src/index.html`, junto con meta tags Open Graph para que el link se
  vea bien al compartirlo en WhatsApp o redes sociales.
- El número grande de la edad usa `-webkit-text-stroke` solo donde el
  navegador lo soporta (`@supports`); en el resto se ve sólido y
  legible igual.
