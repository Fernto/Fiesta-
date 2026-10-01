/**
 * Estructura de datos de la invitación.
 * Vive en un archivo aparte para que se pueda alimentar desde un
 * servicio, un JSON externo o un panel de administración sin tocar
 * el componente (ver InvitationService).
 */
export interface InvitationData {
  /** Nombre del niño o niña que cumple años */
  childName: string;

  /** Edad que cumple */
  age: number;

  /**
   * Fecha y hora reales del evento (objeto Date, no un string).
   * Permite calcular la cuenta regresiva y generar el archivo .ics
   * sin depender de texto formateado a mano.
   */
  eventDate: Date;

  /** Duración estimada del evento en horas, para el archivo de calendario (por defecto 3) */
  durationHours?: number;

  /** Datos de la misa de acción de gracias */
  ceremony: InvitationEvent;

  /** Fotos personales que se muestran en el carrusel */
  galleryPhotos: InvitationPhoto[];

  /** Tres fotos para la animación de fases de la festejada */
  facePhasePhotos: InvitationPhoto[];

  /** Nombre del salón, jardín o lugar donde será el festejo */
  venueName: string;

  /** Dirección completa del lugar */
  address: string;

  /** Enlace directo a Google Maps con la ubicación (para "abrir en Maps") */
  mapsUrl: string;

  /** Mensaje corto de bienvenida / frase que acompaña la portada */
  welcomeMessage: string;

  /** Nombres de los papás, para el pie de página */
  parentsNames: string[];

  /**
   * Número de WhatsApp que recibirá las confirmaciones,
   * en formato internacional y solo dígitos (ej. '5215512345678').
   */
  whatsappPhone: string;

  /** URL de una foto del festejado/a para el círculo de la portada (opcional) */
  childPhotoUrl?: string;

  /** Fuentes responsivas para la foto de portada */
  childPhotoSrcSet?: string;

  /** Sugerencia de vestimenta, ej. "Colores pastel, ropa cómoda" (opcional) */
  dressCode?: string;

  /** Sugerencia de regalo, ej. "Un libro infantil" (opcional) */
  giftSuggestion?: string;

  /** Estilo de visualización de la galería */
  galleryStyle?: 'collage' | 'carousel';
}

export interface InvitationEvent {
  time: string;
  venueName: string;
  address: string;
  mapsUrl: string;
}

export interface InvitationPhoto {
  src: string;
  thumbnailSrcSet?: string;
  alt: string;
  caption: string;
}
