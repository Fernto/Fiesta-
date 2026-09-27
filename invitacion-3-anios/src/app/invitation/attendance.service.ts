import { Injectable } from '@angular/core';

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
  async getAll(password: string): Promise<AttendanceRecord[]> {
    const response = await fetch('/.netlify/functions/asistencias', {
      headers: { Authorization: `Bearer ${password}` },
      cache: 'no-store'
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'No se pudieron cargar las confirmaciones.');
    return body as AttendanceRecord[];
  }

  async agregar(record: Omit<AttendanceRecord, 'date' | 'id'>): Promise<void> {
    const response = await fetch('/.netlify/functions/asistencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'No se pudo guardar la confirmación.');
  }

  async actualizar(record: AttendanceRecord, password: string): Promise<void> {
    const response = await fetch('/.netlify/functions/asistencias', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`
      },
      body: JSON.stringify(record)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'No se pudo actualizar la confirmación.');
  }

  async borrar(password: string, id?: string): Promise<void> {
    const endpoint = id
      ? `/.netlify/functions/asistencias?id=${encodeURIComponent(id)}`
      : '/.netlify/functions/asistencias';
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${password}` }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'No se pudieron borrar las confirmaciones.');
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
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'asistencias-alana.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}