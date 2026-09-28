import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

function getAttendanceStore() {
  return getStore({ name: 'alana-asistencias', consistency: 'strong' });
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

async function readRecords() {
  const store = getAttendanceStore();
  const { blobs } = await store.list();
  const records = await Promise.all(blobs.map(async ({ key }) => {
    const value = await store.get(key, { type: 'json' });
    return value ? {
      ...value,
      id: key,
      status: value.status === 'no' ? 'no' : 'yes',
      ceremony: typeof value.ceremony === 'boolean' ? value.ceremony : true,
      party: typeof value.party === 'boolean' ? value.party : true,
      companions: typeof value.companions === 'string' ? value.companions : ''
    } : null;
  }));
  return records.filter(Boolean).sort((first, second) => second.date.localeCompare(first.date));
}

function normalizeRecord(body) {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const status = body.status === 'no' ? 'no' : body.status === 'yes' ? 'yes' : null;
  const adults = Number(body.adults);
  const children = Number(body.children);
  const ceremony = body.ceremony === true;
  const party = body.party === true;
  const companions = typeof body.companions === 'string' ? body.companions.trim().slice(0, 500) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 240) : '';

  if (!name || !status) return null;
  if (status === 'no') {
    return { name, status, ceremony: false, party: false, adults: 0, children: 0, companions: '', message };
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > 20 ||
      !Number.isInteger(children) || children < 0 || children > 20 || !(ceremony || party)) {
    return null;
  }
  return { name, status, ceremony, party, adults, children, companions, message };
}

export default async function handler(request) {
  if (request.method === 'POST') {
    try {
      const record = normalizeRecord(await request.json());
      if (!record) return json({ error: 'Revisa tu respuesta, eventos y cantidad de invitados.' }, 400);
      const id = randomUUID();
      await getAttendanceStore().setJSON(id, { ...record, date: new Date().toISOString() });
      return json({ saved: true }, 201);
    } catch {
      return json({ error: 'No se pudo guardar la confirmación. Inténtalo de nuevo.' }, 500);
    }
  }

  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return json({ error: 'Método no permitido.' }, 405);
  if (!process.env.ORGANIZER_PASSWORD) {
    return json({ error: 'Falta configurar ORGANIZER_PASSWORD en Netlify.' }, 503);
  }
  if (!authorized(request)) return json({ error: 'Contraseña incorrecta.' }, 401);

  try {
    if (request.method === 'GET') return json(await readRecords());

    if (request.method === 'PUT') {
      const body = await request.json();
      const id = typeof body.id === 'string' ? body.id : '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'La confirmación seleccionada no es válida.' }, 400);
      const store = getAttendanceStore();
      const previous = await store.get(id, { type: 'json' });
      if (!previous) return json({ error: 'No se encontró esa confirmación.' }, 404);
      const record = normalizeRecord(body);
      if (!record) return json({ error: 'Revisa la respuesta, los eventos y la cantidad de invitados.' }, 400);
      await store.setJSON(id, { ...record, date: previous.date });
      return json({ ...record, id, date: previous.date });
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.has('id')) {
      const id = requestUrl.searchParams.get('id') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'La confirmación seleccionada no es válida.' }, 400);
      await attendanceStore.delete(id);
      return json({ deleted: 1 });
    }
    const store = getAttendanceStore();
    const { blobs } = await store.list();
    await Promise.all(blobs.map(({ key }) => store.delete(key)));
    return json({ deleted: blobs.length });
  } catch {
    return json({ error: 'No se pudieron procesar las confirmaciones.' }, 500);
  }
}