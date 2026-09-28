import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InvitationData, InvitationPhoto } from './models/invitation-data.model';
import { InvitationService } from './invitation.service';
import { AttendanceRecord, AttendanceService } from './attendance.service';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  finished: boolean;
}

@Component({
  selector: 'app-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invitation.component.html'
})
export class InvitationComponent implements OnInit, OnDestroy {
  invitation: InvitationData;

  guestName = '';
  rsvpAttendance: 'yes' | 'no' = 'yes';
  attendingCeremony = true;
  attendingParty = true;
  adultCount = 1;
  childCount = 0;
  birthdayMessage = '';
  isSubmittingRsvp = false;
  confirmationError = '';
  confirmationStatus = '';
  showWhatsAppLink = false;
  activeFaceIndex = 0;
  activeCollageIndex = 0;
  collageColumns: InvitationPhoto[][] = [];
  lightboxPhoto: InvitationPhoto | null = null;
  lightboxPhotoIndex = 0;
  readonly collageTilts = [-4, 3, -2, 5, 2, -5, 4, -3, -6, 1, 5, -2, 3, -4, 2, -1];

  @ViewChild('galleryLightbox') private galleryLightbox?: ElementRef<HTMLDialogElement>;

  /** Estado del botón "Compartir", para dar feedback cuando se copia el link */
  shareStatus: 'idle' | 'copied' | 'unsupported' = 'idle';

  countdown: Countdown = { days: 0, hours: 0, minutes: 0, finished: false };

  private countdownTimer?: ReturnType<typeof setInterval>;
  private animationTimer?: ReturnType<typeof setInterval>;
  private readonly dateFormatter = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  private readonly timeFormatter = new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  constructor(
    private readonly invitationService: InvitationService,
    private readonly attendanceService: AttendanceService,
    private readonly sanitizer: DomSanitizer
  ) {
    this.invitation = this.invitationService.getInvitation();
    this.collageColumns = this.crearColumnasCollage(this.invitation.galleryPhotos);
  }

  ngOnInit(): void {
    void this.cargarConfiguracionPublica();
    this.actualizarCountdown();
    // Se actualiza cada minuto; para una cuenta regresiva de segundos bastaría
    // bajar el intervalo, pero por minuto es suficiente para este caso de uso.
    this.countdownTimer = setInterval(() => this.actualizarCountdown(), 60_000);
    if (this.collageColumns.length || this.invitation.facePhasePhotos.length > 1) {
      this.animationTimer = setInterval(() => {
        if (this.collageColumns.length) {
          this.activeCollageIndex = (this.activeCollageIndex + 1) % 16;
        }
        if (this.invitation.facePhasePhotos.length > 1) {
          this.activeFaceIndex = (this.activeFaceIndex + 1) % this.invitation.facePhasePhotos.length;
        }
      }, 2000);
    }
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
    }
  }

  get formattedDate(): string {
    return this.dateFormatter.format(this.invitation.eventDate);
  }

  get formattedShortDate(): string {
    const dateParts = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).formatToParts(this.invitation.eventDate);
    const parts = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
    return `${parts['day']} · ${parts['month'].toLocaleUpperCase('es-MX')} · ${parts['year']}`;
  }

  get formattedTime(): string {
    return this.timeFormatter.format(this.invitation.eventDate);
  }

  get formattedCeremonyTime(): string {
    const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(this.invitation.ceremony.time.trim());
    if (!match) return this.invitation.ceremony.time;

    const date = new Date();
    let hours = Number(match[1]);
    if (match[3] && hours <= 12) {
      hours = (hours % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    }
    date.setHours(hours, Number(match[2]), 0, 0);
    return this.timeFormatter.format(date);
  }

  get partyMapEmbedUrl(): SafeResourceUrl | null {
    const url = this.createMapEmbedUrl(this.invitation.venueName, this.invitation.address);
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  get ceremonyMapEmbedUrl(): SafeResourceUrl | null {
    const url = this.createMapEmbedUrl(this.invitation.ceremony.venueName, this.invitation.ceremony.address);
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  private crearColumnasCollage(photos: InvitationPhoto[]): InvitationPhoto[][] {
    if (!photos.length) return [];
    const tiles = Array.from({ length: 16 }, (_, index) => photos[index % photos.length]);
    return Array.from({ length: 4 }, (_, column) => tiles.slice(column * 4, column * 4 + 4));
  }

  abrirLightbox(photo: InvitationPhoto): void {
    const index = this.invitation.galleryPhotos.findIndex((item) => item.src === photo.src);
    this.lightboxPhotoIndex = index >= 0 ? index : 0;
    this.lightboxPhoto = this.invitation.galleryPhotos[this.lightboxPhotoIndex] ?? photo;
    this.galleryLightbox?.nativeElement.showModal();
  }

  cambiarFotoLightbox(direction: number): void {
    const total = this.invitation.galleryPhotos.length;
    if (total < 2) return;
    this.lightboxPhotoIndex = (this.lightboxPhotoIndex + direction + total) % total;
    this.lightboxPhoto = this.invitation.galleryPhotos[this.lightboxPhotoIndex];
  }

  cerrarLightbox(): void {
    this.galleryLightbox?.nativeElement.close();
  }

  @HostListener('document:keydown', ['$event'])
  cerrarLightboxConEscape(event: KeyboardEvent): void {
    if (!this.galleryLightbox?.nativeElement.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrarLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.cambiarFotoLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.cambiarFotoLightbox(1);
    }
  }

  cerrarLightboxSiFondo(event: MouseEvent): void {
    if (event.target === this.galleryLightbox?.nativeElement) {
      this.cerrarLightbox();
    }
  }

  /**
   * Link de WhatsApp con mensaje prellenado, recalculado como getter para
   * que siempre refleje el número de invitados actual en el input del RSVP.
   * Se usa como href real (no solo window.open) para que funcione aunque
   * el navegador bloquee ventanas emergentes, y sea accesible por teclado.
   */
  get whatsappUrl(): string {
    const nombre = this.guestName.trim() || 'Invitado';
    const lineas = [
      `¡Hola! ${this.rsvpAttendance === 'yes' ? 'Confirmo mi asistencia' : 'No podré asistir'} al cumpleaños de ${this.invitation.childName}.`,
      `Nombre: ${nombre}`
    ];

    if (this.rsvpAttendance === 'yes') {
      const personas = `${this.adultCount} adulto${this.adultCount === 1 ? '' : 's'} y ` +
        `${this.childCount} niño${this.childCount === 1 ? '' : 's'}`;
      const eventos = [
        this.attendingCeremony ? 'misa' : '',
        this.attendingParty ? 'fiesta' : ''
      ].filter(Boolean).join(' y ');
      lineas.push(`Asistiremos: ${personas}.`, `Eventos: ${eventos}.`);
    }

    lineas.push(`El evento es el ${this.formattedDate} a las ${this.formattedTime}.`);
    if (this.birthdayMessage.trim()) {
      lineas.push(`Mensaje para ${this.invitation.childName}: ${this.birthdayMessage.trim()}`);
    }

    return `https://wa.me/${this.invitation.whatsappPhone}?text=${encodeURIComponent(lineas.join('\n'))}`;
  }

  async confirmarAsistencia(): Promise<void> {
    if (this.isSubmittingRsvp) return;
    if (this.rsvpAttendance === 'yes' && !this.attendingCeremony && !this.attendingParty) {
      this.confirmationError = 'Selecciona si asistirás a la misa, a la fiesta o a ambas.';
      return;
    }
    this.isSubmittingRsvp = true;
    this.confirmationError = '';
    this.confirmationStatus = '';
    this.showWhatsAppLink = false;

    const record: Omit<AttendanceRecord, 'date' | 'id'> = {
      name: this.guestName.trim(),
      status: this.rsvpAttendance,
      ceremony: this.rsvpAttendance === 'yes' && this.attendingCeremony,
      party: this.rsvpAttendance === 'yes' && this.attendingParty,
      adults: this.rsvpAttendance === 'yes' ? Number(this.adultCount) || 0 : 0,
      children: this.rsvpAttendance === 'yes' ? Number(this.childCount) || 0 : 0,
      companions: '',
      message: this.birthdayMessage.trim()
    };

    try {
      await this.attendanceService.agregar(record);
      const link = document.createElement('a');
      link.href = this.whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.confirmationStatus = 'Asistencia guardada. Abre WhatsApp para enviar tu mensaje.';
      this.showWhatsAppLink = true;
    } catch (error) {
      this.confirmationError = error instanceof Error ? error.message : 'No se pudo guardar la confirmación.';
    } finally {
      this.isSubmittingRsvp = false;
    }
  }

  private async cargarConfiguracionPublica(): Promise<void> {
    try {
      const settings = await this.invitationService.getPublicSettings();
      this.invitation = {
        ...this.invitation,
        ...settings,
        eventDate: new Date(settings.eventDate)
      };
      this.actualizarCountdown();
    } catch {
      // Sin Netlify Dev en local se conservan los valores iniciales de la invitación.
    }
  }

  /**
   * Comparte el link de la invitación usando la Web Share API si el
   * dispositivo la soporta (típico en celulares); si no, cae en copiar
   * el link al portapapeles como respaldo.
   */
  async compartirInvitacion(): Promise<void> {
    const datosCompartidos = {
      title: `¡Cumplo ${this.invitation.age} años!`,
      text: this.invitation.welcomeMessage,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(datosCompartidos);
      } catch {
        // El usuario cerró el diálogo de compartir; no es un error real.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      this.shareStatus = 'copied';
      setTimeout(() => (this.shareStatus = 'idle'), 2500);
    } catch {
      this.shareStatus = 'unsupported';
    }
  }

  /** Genera y descarga un archivo .ics para agregar el evento al calendario */
  descargarICS(): void {
    const inicio = this.invitation.eventDate;
    const fin = new Date(
      inicio.getTime() + (this.invitation.durationHours ?? 3) * 60 * 60 * 1000
    );
    const formatearFechaICS = (fecha: Date): string =>
      fecha.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const contenidoICS = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatearFechaICS(inicio)}`,
      `DTEND:${formatearFechaICS(fin)}`,
      `SUMMARY:Cumpleaños de ${this.invitation.childName}`,
      `LOCATION:${this.invitation.venueName}, ${this.invitation.address}`,
      `DESCRIPTION:${this.invitation.welcomeMessage}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([contenidoICS], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cumpleanos-${this.invitation.childName}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private actualizarCountdown(): void {
    const diferenciaMs = this.invitation.eventDate.getTime() - Date.now();

    if (diferenciaMs <= 0) {
      this.countdown = { days: 0, hours: 0, minutes: 0, finished: true };
      return;
    }

    const minutosTotales = Math.floor(diferenciaMs / 60_000);
    this.countdown = {
      days: Math.floor(minutosTotales / (60 * 24)),
      hours: Math.floor((minutosTotales % (60 * 24)) / 60),
      minutes: minutosTotales % 60,
      finished: false
    };
  }

  private createMapEmbedUrl(venue: string, address: string): string {
    const query = [venue, address]
      .filter((value) => value.trim() && !/^direcci[oó]n(?: por confirmar)?$/i.test(value.trim()))
      .join(', ');
    if (!query) return '';
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }

}
