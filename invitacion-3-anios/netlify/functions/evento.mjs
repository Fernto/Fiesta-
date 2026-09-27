import { timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const settingsStore = getStore({ name: 'alana-evento', consistency: 'strong' });
const settingsKey = 'datos';

const defaultSettings = {
  eventDate: '2026-11-15T16:00',
  durationHours: 3,
  ceremony: {
    time: 'Horario por confirmar',
    venueName: 'Templo por confirmar',
    address: 'Dirección por confirmar',
    mapsUrl: ''
  },
  venueName: 'Salón por confirmar',
  address: 'Dirección por confirmar',
  mapsUrl: '',
  whatsappPhone: ''
};

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

function text(value, limit = 180) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function validMapsUrl(value) {
  const candidate = text(value, 500);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

async function readSettings() {
  const stored = await settingsStore.get(settingsKey);
  return stored ? JSON.parse(stored) : defaultSettings;
}

export default async function handler(request) {
  if (request.method === 'GET') {
    try {
      return json(await readSettings());
    } catch {
      return json({ error: 'No se pudieron cargar los datos del evento.' }, 500);
    }
  }

  if (request.method !== 'PUT') return json({ error: 'Método no permitido.' }, 405);
  if (!process.env.ORGANIZER_PASSWORD) {
    return json({ error: 'Falta configurar ORGANIZER_PASSWORD en Netlify.' }, 503);
  }
  if (!authorized(request)) return json({ error: 'Contraseña incorrecta.' }, 401);

  try {
    const body = await request.json();
    const eventDate = text(body.eventDate, 40);
    if (!eventDate || Number.isNaN(new Date(eventDate).getTime())) {
      return json({ error: 'La fecha y hora no son válidas.' }, 400);
    }

    const settings = {
      eventDate,
      durationHours: 3,
      ceremony: {
        time: text(body.ceremony?.time, 80),
        venueName: text(body.ceremony?.venueName),
        address: text(body.ceremony?.address),
        mapsUrl: validMapsUrl(body.ceremony?.mapsUrl)
      },
      venueName: text(body.venueName),
      address: text(body.address),
      mapsUrl: validMapsUrl(body.mapsUrl),
      whatsappPhone: text(body.whatsappPhone, 20).replace(/\D/g, '').slice(0, 15)
    };

    await settingsStore.setJSON(settingsKey, settings);
    return json(settings);
  } catch {
    return json({ error: 'No se pudieron guardar los datos del evento.' }, 500);
  }
}