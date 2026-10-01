import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AttendanceRecord {
  id: string;
  name: string;
  status: 'yes' | 'no';
  ceremony: boolean;
  party: boolean;
  adults: number;
  children: number;
  companions: string;
  message: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private http = inject(HttpClient);

  async getAll(password: string): Promise<AttendanceRecord[]> {
    try {
      return await firstValueFrom(this.http.get<AttendanceRecord[]>('/.netlify/functions/asistencias', {
        headers: { Authorization: `Bearer ${password}` }
      }));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudieron cargar las confirmaciones.');
    }
  }

  async agregar(record: Omit<AttendanceRecord, 'date' | 'id'>): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/.netlify/functions/asistencias', record));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudo guardar la confirmación.');
    }
  }

  async actualizar(record: AttendanceRecord, password: string): Promise<void> {
    try {
      await firstValueFrom(this.http.put('/.netlify/functions/asistencias', record, {
        headers: { Authorization: `Bearer ${password}` }
      }));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudo actualizar la confirmación.');
    }
  }

  async borrar(password: string, id?: string): Promise<void> {
    const params = id ? { id } : {};
    try {
      await firstValueFrom(this.http.delete('/.netlify/functions/asistencias', {
        headers: { Authorization: `Bearer ${password}` },
        params
      }));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudieron borrar las confirmaciones.');
    }
  }

  descargarCSV(records: AttendanceRecord[]): void {
    const rows = [
      ['Nombre', 'Respuesta', 'Misa', 'Fiesta', 'Adultos', 'Niños', 'Acompañantes', 'Mensaje', 'Fecha de confirmación'],
      ...records.map((record) => [
        record.name,
        record.status === 'yes' ? 'Asistirá' : 'No asistirá',
        record.ceremony ? 'Sí' : 'No',
        record.party ? 'Sí' : 'No',
        String(record.adults),
        String(record.children),
        record.companions,
        record.message,
        record.date
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const bom = '\uFEFF';
    const url = URL.createObjectURL(new Blob([bom + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'asistencias-alana.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}