import { Injectable } from '@angular/core';
import { InvitationData } from './models/invitation-data.model';

/**
 * Centraliza el origen de los datos de la invitación.
 *
 * Hoy devuelve un objeto fijo, pero al vivir en un servicio puedes
 * cambiar `getInvitation()` para que en su lugar haga una llamada HTTP
 * (por ejemplo `this.http.get<InvitationData>('/api/invitations/123')`)
 * sin tener que tocar el componente que lo consume.
 */
@Injectable({ providedIn: 'root' })
export class InvitationService {
  getInvitation(): InvitationData {
    return {
      childName: 'Alana',
      age: 3,
      eventDate: new Date('2026-11-15T16:00:00'),
      durationHours: 3,
      ceremony: {
        time: 'Horario por confirmar',
        venueName: 'Templo por confirmar',
        address: 'Dirección por confirmar',
        mapsUrl: ''
      },
      galleryPhotos: [],
      venueName: 'Salón por confirmar',
      address: 'Dirección por confirmar',
      mapsUrl: '',
      welcomeMessage: 'Acompáñanos a celebrar una tarde llena de juegos, pastel y mucho cariño.',
      parentsNames: [],
      whatsappPhone: '',
      childPhotoUrl: 'assets/crowned-kitten.jpg',
      dressCode: 'Colores pastel y ropa cómoda para jugar',
      giftSuggestion: 'Un cuento infantil (opcional, tu compañía es el mejor regalo)'
    };
  }
}
