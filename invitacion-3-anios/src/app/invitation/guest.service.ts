import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface GuestRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class GuestService {
  private http = inject(HttpClient);

  async getAll(password: string): Promise<GuestRecord[]> {
    try {
      return await firstValueFrom(this.http.get<GuestRecord[]>('/.netlify/functions/invitados', {
        headers: { Authorization: `Bearer ${password}` }
      }));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudieron cargar los invitados.');
    }
  }

  async getById(id: string): Promise<GuestRecord> {
    try {
      return await firstValueFrom(this.http.get<GuestRecord>(`/.netlify/functions/invitados?guest=${encodeURIComponent(id)}`));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudo cargar el invitado.');
    }
  }

  async agregar(record: Partial<GuestRecord>, password: string): Promise<GuestRecord> {
    try {
      return await firstValueFrom(this.http.post<GuestRecord>('/.netlify/functions/invitados', record, {
        headers: { Authorization: `Bearer ${password}` }
      }));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudo guardar el invitado.');
    }
  }

  async borrar(password: string, id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`/.netlify/functions/invitados?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${password}` }
      }));
    } catch (error: any) {
      throw new Error(error.error?.error ?? 'No se pudo borrar el invitado.');
    }
  }
}
