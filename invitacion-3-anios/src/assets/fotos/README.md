# Fotos de la invitacion

Coloca aqui las imagenes y agrega sus rutas en `src/app/invitation/invitation.service.ts`.

- Foto principal: `src/assets/fotos/foto-principal.jpg` (actualiza `childPhotoUrl`).
- Carrusel: las fotos `1.jpg` a `15.jpg` en `src/assets/fotos/galeria/` ya están conectadas a `galleryPhotos`.
- Tres fases animadas: se usan `1-removebg-preview.png`, `5-removebg-preview.png` y `10-removebg-preview.png` de `src/assets/fotos/caritas/`, en ese orden.

Para cambiar las fases, edita `facePhasePhotos` en `invitation.service.ts`:

```ts
facePhasePhotos: [
  { src: 'assets/fotos/caritas/1-removebg-preview.png', alt: 'Carita de Alana, fase 1', caption: '' },
  { src: 'assets/fotos/caritas/5-removebg-preview.png', alt: 'Carita de Alana, fase 2', caption: '' },
  { src: 'assets/fotos/caritas/10-removebg-preview.png', alt: 'Carita de Alana, fase 3', caption: '' }
],
```

Las fotos de las tres fases se muestran alternándose en el mismo marco. El panel de organización está en `/#/organizacion` y no aparece enlazado desde la invitación. Las confirmaciones se almacenan localmente en el navegador que las registra; para reunirlas desde varios dispositivos y restringir el acceso de forma segura se necesita autenticación y almacenamiento del lado del servidor.