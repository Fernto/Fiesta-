import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const attendanceStore = getStore({ name: 'alana-asistencias', consistency: 'strong' });

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

async function readRecords() {
  const { blobs } = await attendanceStore.list();
  const records = await Promise.all(blobs.map(async ({ key }) => {
    const value = await attendanceStore.get(key);
    return value ? JSON.parse(value) : null;
  }));
  return records.filter(Boolean).sort((first, second) => second.date.localeCompare(first.date));
}

export default async function handler(request) {
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
      const adults = Number(body.adults);
      const children = Number(body.children);
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 240) : '';

      if (!name || !Number.isInteger(adults) || adults < 1 || adults > 20 ||
          !Number.isInteger(children) || children < 0 || children > 20) {
        return json({ error: 'Revisa tu nombre y la cantidad de adultos y niños.' }, 400);
      }

      const record = { name, adults, children, message, date: new Date().toISOString() };
      await attendanceStore.setJSON(randomUUID(), record);
      return json({ saved: true });
    } catch {
      return json({ error: 'No se pudo guardar la confirmación. Inténtalo de nuevo.' }, 500);
    }
  }

  if (!['GET', 'DELETE'].includes(request.method)) return json({ error: 'Método no permitido.' }, 405);
  if (!process.env.ORGANIZER_PASSWORD) {
    return json({ error: 'Falta configurar ORGANIZER_PASSWORD en Netlify.' }, 503);
  }
  if (!authorized(request)) return json({ error: 'Contraseña incorrecta.' }, 401);

  try {
    if (request.method === 'GET') return json(await readRecords());

    const { blobs } = await attendanceStore.list();
    await Promise.all(blobs.map(({ key }) => attendanceStore.delete(key)));
    return json({ deleted: blobs.length });
  } catch {
    return json({ error: 'No se pudieron procesar las confirmaciones.' }, 500);
  }
}