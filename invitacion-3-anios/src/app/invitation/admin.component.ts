import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceRecord, AttendanceService } from './attendance.service';
import { EditableInvitationSettings, InvitationService } from './invitation.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnDestroy {
  records: AttendanceRecord[] = [];
  password = '';
  authenticated = false;
  loading = false;
  error = '';
  status = '';
  newAttendanceNotice = '';
  editingRecordId: string | null = null;
  editDraft: AttendanceRecord = {
    id: '',
    name: '',
    status: 'yes',
    ceremony: true,
    party: true,
    adults: 1,
    children: 0,
    companions: '',
    message: '',
    date: ''
  };
  settings: EditableInvitationSettings = {
    eventDate: '2026-11-15T16:00',
    durationHours: 3,
    ceremony: { time: '', venueName: '', address: '', mapsUrl: '' },
    venueName: '',
    address: '',
    mapsUrl: '',
    whatsappPhone: ''
  };

  private attendancePoll?: ReturnType<typeof setInterval>;
  private knownRecordIds = new Set<string>();

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly invitationService: InvitationService
  ) {}

  get totalAttendees(): number {
    return this.records.reduce((total, record) => total + (record.status === 'yes' ? record.adults + record.children : 0), 0);
  }

  get ceremonyAttendees(): number {
    return this.records.reduce((total, record) => total + (record.status === 'yes' && record.ceremony ? record.adults + record.children : 0), 0);
  }

  get partyAttendees(): number {
    return this.records.reduce((total, record) => total + (record.status === 'yes' && record.party ? record.adults + record.children : 0), 0);
  }

  get recordsWithMessages(): AttendanceRecord[] {
    return this.records.filter((record) => record.message.trim().length > 0);
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
      this.knownRecordIds = new Set(records.map((record) => record.id));
      this.settings = {
        ...settings,
        eventDate: this.toLocalDateTime(settings.eventDate)
      };
      this.authenticated = true;
      this.detenerAvisos();
      this.attendancePoll = setInterval(() => {
        void this.consultarNuevasAsistencias().catch(() => {
          this.newAttendanceNotice = 'No se pudieron actualizar las respuestas. Revisa tu conexión.';
        });
      }, 30_000);
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
      await this.consultarNuevasAsistencias();
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
      this.knownRecordIds.clear();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudieron borrar las confirmaciones.';
    } finally {
      this.loading = false;
    }
  }

  cerrarSesion(): void {
    this.detenerAvisos();
    this.password = '';
    this.records = [];
    this.authenticated = false;
    this.status = '';
    this.error = '';
    this.newAttendanceNotice = '';
    this.editingRecordId = null;
  }

  iniciarEdicion(record: AttendanceRecord): void {
    this.editingRecordId = record.id;
    this.editDraft = { ...record };
    this.error = '';
    this.newAttendanceNotice = '';
  }

  cancelarEdicion(): void {
    this.editingRecordId = null;
  }

  async guardarEdicion(): Promise<void> {
    if (this.editDraft.status === 'yes' && !this.editDraft.ceremony && !this.editDraft.party) {
      this.error = 'Selecciona al menos uno de los eventos.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.attendanceService.actualizar(this.editDraft, this.password);
      this.records = this.records.map((record) => record.id === this.editDraft.id ? { ...this.editDraft } : record);
      this.editingRecordId = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo actualizar la confirmación.';
    } finally {
      this.loading = false;
    }
  }

  async eliminarRegistro(record: AttendanceRecord): Promise<void> {
    if (!window.confirm(`¿Borrar la confirmación de ${record.name}?`)) return;
    this.loading = true;
    this.error = '';
    try {
      await this.attendanceService.borrar(this.password, record.id);
      this.records = this.records.filter((item) => item.id !== record.id);
      this.knownRecordIds.delete(record.id);
      if (this.editingRecordId === record.id) this.editingRecordId = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo borrar la confirmación.';
    } finally {
      this.loading = false;
    }
  }

  get notificationPermission(): NotificationPermission | 'unsupported' {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  }

  async activarNotificaciones(): Promise<void> {
    if (typeof Notification === 'undefined') return;
    try {
      await Notification.requestPermission();
    } catch {
      this.error = 'El navegador no permitió activar los avisos.';
    }
  }

  ngOnDestroy(): void {
    this.detenerAvisos();
  }

  private async consultarNuevasAsistencias(): Promise<void> {
    const latestRecords = await this.attendanceService.getAll(this.password);
    const newRecords = latestRecords.filter((record) => !this.knownRecordIds.has(record.id));
    this.knownRecordIds = new Set(latestRecords.map((record) => record.id));
    this.records = latestRecords;

    if (!newRecords.length) return;
    this.newAttendanceNotice = newRecords.length === 1
      ? `Nueva respuesta de ${newRecords[0].name}.`
      : `Llegaron ${newRecords.length} respuestas nuevas.`;

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Nueva confirmación para Alana', { body: this.newAttendanceNotice });
    }
  }

  private detenerAvisos(): void {
    if (this.attendancePoll) clearInterval(this.attendancePoll);
    this.attendancePoll = undefined;
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
}