# Invitación de 3 años 🎈

Proyecto Angular (standalone components) con una invitación web infantil,
responsiva y en paleta pastel.

## Cómo correrlo

```bash
npm install
npm start
```

Luego abre `http://localhost:4200`.

## Cómo personalizar los datos

Edita el objeto que devuelve `InvitationService`:

```
src/app/invitation/invitation.service.ts
```

Todos los campos están tipados en:

```
src/app/invitation/models/invitation-data.model.ts
```

Para producción, lo más limpio es que `getInvitation()` haga una llamada
HTTP (`this.http.get<InvitationData>(...)`) en vez de devolver un objeto
fijo — el componente no necesita cambiar nada.

### Campos nuevos a llenar

- `eventDate`: objeto `Date` real (antes eran dos strings sueltos de
  fecha y hora). De ahí sale la cuenta regresiva y el archivo `.ics`.
- `mapsEmbedUrl`: la URL de "Insertar un mapa" de Google Maps (botón
  Compartir > Insertar un mapa > copiar el `src` del iframe).
- `childPhotoUrl`, `dressCode`, `giftSuggestion`: opcionales — si los
  dejas vacíos, esas secciones no se muestran.

## Funcionalidad incluida

- **Cuenta regresiva** en vivo (días/horas/minutos) hasta la fecha del evento.
- **RSVP con número de invitados**: el mensaje de WhatsApp incluye
  cuántas personas confirman.
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
