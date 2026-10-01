import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { InvitationData } from './models/invitation-data.model';

export interface EditableInvitationSettings {
  eventDate: string;
  durationHours: number;
  ceremony: InvitationData['ceremony'];
  venueName: string;
  address: string;
  mapsUrl: string;
  whatsappPhone: string;
  galleryStyle: 'collage' | 'carousel';
}

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
  private http = inject(HttpClient);

  async getPublicSettings(): Promise<EditableInvitationSettings> {
    try {
      return await firstValueFrom(this.http.get<EditableInvitationSettings>('/.netlify/functions/evento'));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudieron cargar los datos del evento.');
    }
  }

  async saveSettings(settings: EditableInvitationSettings, password: string): Promise<void> {
    try {
      await firstValueFrom(this.http.put('/.netlify/functions/evento', settings, {
        headers: { Authorization: `Bearer ${password}` }
      }));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudieron guardar los datos del evento.');
    }
  }

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
      galleryPhotos: Array.from({ length: 15 }, (_, index) => {
        const photoNumber = index + 1;
        const thumbnailSrcSet = [160, 320, 640]
          .map((width) => `assets/fotos/miniaturas/galeria/${photoNumber}-${width}.jpg ${width}w`)
          .join(', ');

        return {
          src: `assets/fotos/galeria/${photoNumber}.jpg`,
          thumbnailSrcSet,
          alt: `Alana, recuerdo familiar ${photoNumber}`,
          caption: ''
        };
      }),
      facePhasePhotos: [
        { src: 'assets/fotos/caritas/1-removebg-preview.png', alt: 'Carita de Alana, fase 1', caption: '' },
        { src: 'assets/fotos/caritas/5-removebg-preview.png', alt: 'Carita de Alana, fase 2', caption: '' },
        { src: 'assets/fotos/caritas/10-removebg-preview.png', alt: 'Carita de Alana, fase 3', caption: '' }
      ],
      venueName: 'Salón por confirmar',
      address: 'Dirección por confirmar',
      mapsUrl: '',
      welcomeMessage: 'Acompáñanos a celebrar una tarde llena de juegos, pastel y mucho cariño.',
      parentsNames: [],
      whatsappPhone: '',
      galleryStyle: 'collage',
      childPhotoUrl: 'assets/fotos/galeria/3.jpg',
      childPhotoSrcSet: 'assets/fotos/miniaturas/galeria/3-320.jpg 320w, assets/fotos/miniaturas/galeria/3-640.jpg 640w',
      dressCode: 'Colores pastel y ropa cómoda para jugar',
      giftSuggestion: 'Un cuento infantil (opcional, tu compañía es el mejor regalo)'
    };
  }
}
