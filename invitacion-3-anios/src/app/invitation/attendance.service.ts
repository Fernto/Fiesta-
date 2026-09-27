import { Injectable } from '@angular/core';

export interface AttendanceRecord {
  name: string;
  adults: number;
  children: number;
  message: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly storageKey = 'alana-asistencias';

  getAll(): AttendanceRecord[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const records: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(records) ? records as AttendanceRecord[] : [];
    } catch {
      return [];
    }
  }

  agregar(record: AttendanceRecord): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.getAll(), record]));
    } catch {
      // La confirmación por WhatsApp sigue disponible si el navegador bloquea el almacenamiento.
    }
  }

  borrar(): void {
    localStorage.removeItem(this.storageKey);
  }

  descargarCSV(records: AttendanceRecord[]): void {
    const rows = [
      ['Nombre', 'Adultos', 'Niños', 'Mensaje', 'Fecha de confirmación'],
      ...records.map((record) => [record.name, String(record.adults), String(record.children), record.message, record.date])
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