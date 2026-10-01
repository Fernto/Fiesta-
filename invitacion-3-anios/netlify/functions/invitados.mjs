import { timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

function getGuestsStore() {
  return getStore({ name: 'alana-invitados', consistency: 'strong' });
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function authorized(request) {
  const expected = process.env.ORGANIZER_PASSWORD;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export default async function handler(request) {
  const store = getGuestsStore();

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const guestId = url.searchParams.get('guest');
    if (guestId) {
      const guest = await store.get(guestId, { type: 'json' });
      return json(guest || { error: 'Invitado no encontrado' }, guest ? 200 : 404);
    }
    
    if (!authorized(request)) return json({ error: 'Contraseña incorrecta.' }, 401);
    try {
      const { blobs } = await store.list();
      const guests = await Promise.all(
        blobs.map(async (blob) => store.get(blob.key, { type: 'json' }))
      );
      // Sort by date descending
      guests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return json(guests);
    } catch {
      return json({ error: 'No se pudieron cargar los invitados.' }, 500);
    }
  }

  if (!process.env.ORGANIZER_PASSWORD) {
    return json({ error: 'Falta configurar ORGANIZER_PASSWORD en Netlify.' }, 503);
  }
  if (!authorized(request)) return json({ error: 'Contraseña incorrecta.' }, 401);

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const guest = {
        id,
        name: body.name?.trim() || 'Invitado',
        phone: body.phone?.replace(/\D/g, '') || '',
        email: body.email?.trim() || '',
        date: new Date().toISOString()
      };
      await store.setJSON(id, guest);
      return json(guest, 201);
    } catch {
      return json({ error: 'No se pudo guardar el invitado.' }, 500);
    }
  }

  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Se requiere el id del invitado.' }, 400);
    try {
      await store.delete(id);
      return json({ success: true });
    } catch {
      return json({ error: 'No se pudo borrar el invitado.' }, 500);
    }
  }

  return json({ error: 'Método no permitido.' }, 405);
}
