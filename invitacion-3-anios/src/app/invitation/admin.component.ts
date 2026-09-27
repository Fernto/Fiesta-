import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceRecord, AttendanceService } from './attendance.service';
import { EditableInvitationSettings, InvitationService } from './invitation.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  records: AttendanceRecord[] = [];
  password = '';
  authenticated = false;
  loading = false;
  error = '';
  status = '';
  settings: EditableInvitationSettings = {
    eventDate: '2026-11-15T16:00',
    durationHours: 3,
    ceremony: { time: '', venueName: '', address: '', mapsUrl: '' },
    venueName: '',
    address: '',
    mapsUrl: '',
    whatsappPhone: ''
  };

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly invitationService: InvitationService
  ) {}

  get totalAttendees(): number {
    return this.records.reduce((total, record) => total + record.adults + record.children, 0);
  }

  async iniciarSesion(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const [records, settings] = await Promise.all([
        this.attendanceService.getAll(this.password),
        this.invitationService.getPublicSettings()
      ]);
      this.records = records;
      this.settings = {
        ...settings,
        eventDate: this.toLocalDateTime(settings.eventDate)
      };
      this.authenticated = true;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }

  async guardarEvento(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.status = '';
    try {
      await this.invitationService.saveSettings(this.settings, this.password);
      this.status = 'Datos del evento guardados.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo guardar el evento.';
    } finally {
      this.loading = false;
    }
  }

  async actualizarAsistencias(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.records = await this.attendanceService.getAll(this.password);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudieron cargar las confirmaciones.';
    } finally {
      this.loading = false;
    }
  }

  exportRecords(): void {
    this.attendanceService.descargarCSV(this.records);
  }

  async clearRecords(): Promise<void> {
    if (!window.confirm('¿Quieres borrar todas las confirmaciones de todos los invitados?')) return;
    this.loading = true;
    this.error = '';
    try {
      await this.attendanceService.borrar(this.password);
      this.records = [];
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudieron borrar las confirmaciones.';
    } finally {
      this.loading = false;
    }
  }

  cerrarSesion(): void {
    this.password = '';
    this.records = [];
    this.authenticated = false;
    this.status = '';
    this.error = '';
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
}