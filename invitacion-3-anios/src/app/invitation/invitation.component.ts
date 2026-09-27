import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  adultCount = 1;
  childCount = 0;
  birthdayMessage = '';
  activeFaceIndex = 0;
  activeCollageIndex = 0;
  collageColumns: InvitationPhoto[][] = [];
  lightboxPhoto: InvitationPhoto | null = null;
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
    private readonly attendanceService: AttendanceService
  ) {
    this.invitation = this.invitationService.getInvitation();
    this.collageColumns = this.crearColumnasCollage(this.invitation.galleryPhotos);
  }

  ngOnInit(): void {
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
      }, 3000);
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

  get formattedTime(): string {
    return this.timeFormatter.format(this.invitation.eventDate);
  }

  private crearColumnasCollage(photos: InvitationPhoto[]): InvitationPhoto[][] {
    if (!photos.length) return [];
    const tiles = Array.from({ length: 16 }, (_, index) => photos[index % photos.length]);
    return Array.from({ length: 4 }, (_, column) => tiles.slice(column * 4, column * 4 + 4));
  }

  abrirLightbox(photo: InvitationPhoto): void {
    this.lightboxPhoto = photo;
    this.galleryLightbox?.nativeElement.showModal();
  }

  cerrarLightbox(): void {
    this.galleryLightbox?.nativeElement.close();
  }

  @HostListener('document:keydown', ['$event'])
  cerrarLightboxConEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.galleryLightbox?.nativeElement.open) {
      event.preventDefault();
      this.cerrarLightbox();
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
    const personas = `${this.adultCount} adulto${this.adultCount === 1 ? '' : 's'} y ` +
      `${this.childCount} niño${this.childCount === 1 ? '' : 's'}`;
    const lineas = [
      `¡Hola! Confirmo mi asistencia al cumpleaños de ${this.invitation.childName}.`,
      `Nombre: ${nombre}`,
      `Asistiremos: ${personas}.`,
      `Nos vemos el ${this.formattedDate} a las ${this.formattedTime}`
    ];

    if (this.birthdayMessage.trim()) {
      lineas.push(`Mensaje para ${this.invitation.childName}: ${this.birthdayMessage.trim()}`);
    }

    return `https://wa.me/${this.invitation.whatsappPhone}?text=${encodeURIComponent(lineas.join('\n'))}`;
  }

  confirmarAsistencia(): void {
    const record: AttendanceRecord = {
      name: this.guestName.trim(),
      adults: Number(this.adultCount) || 0,
      children: Number(this.childCount) || 0,
      message: this.birthdayMessage.trim(),
      date: new Date().toISOString()
    };

    this.attendanceService.agregar(record);
    window.open(this.whatsappUrl, '_blank', 'noopener,noreferrer');
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

}
