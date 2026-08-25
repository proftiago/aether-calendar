// Fala com o backend (Supabase Edge Functions) que guarda o token do
// Google com segurança. O app nunca vê o access_token nem o client_secret
// — só manda a AETHER_API_KEY (uma chave compartilhada, não o token real)
// pra provar que é o Aether autorizado chamando.

import { inferCalendar } from './nlParse';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
const API_KEY = import.meta.env.VITE_AETHER_API_KEY as string | undefined;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function isGoogleConfigured(): boolean {
  return !!FUNCTIONS_URL && !!API_KEY && !!GOOGLE_CLIENT_ID;
}

/** Monta a URL de consentimento do Google — client_id não é secreto, então isso pode rodar 100% no navegador. */
export function buildGoogleAuthUrl(): string {
  const redirectUri = `${FUNCTIONS_URL}/google-oauth-callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function callFn<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!FUNCTIONS_URL || !API_KEY) throw new Error('Google Calendar não configurado neste ambiente.');
  const res = await fetch(`${FUNCTIONS_URL}/google-calendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ action, ...body }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Falha na sincronização (${res.status}): ${detail}`);
  }
  return res.json();
}

export type GoogleListResult = {
  events: Array<Record<string, unknown>>;
  deletedIds: string[];
};

export function listGoogleEvents(forceFull = false): Promise<GoogleListResult> {
  return callFn<GoogleListResult>('list', forceFull ? { forceFull: true } : {});
}

/** Converte o registro cru devolvido pela Edge Function num Event completo do Aether. */
export function rawToAetherEvent(raw: Record<string, unknown>): import('./types').Event {
  const title = String(raw.title ?? '(sem título)');
  const location = raw.location ? String(raw.location) : undefined;
  return {
    id: `google-${raw.googleEventId}`,
    title,
    calId: inferCalendar(title, location),
    startsAt: String(raw.startsAt),
    endsAt: String(raw.endsAt),
    timeZone: String(raw.timeZone ?? 'America/Sao_Paulo'),
    allDay: !!raw.allDay,
    location,
    meet: raw.meet ? String(raw.meet) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    src: 'google',
    googleEventId: String(raw.googleEventId),
  };
}

export function createGoogleEvent(event: Record<string, unknown>): Promise<{ googleEventId: string }> {
  return callFn('create', { event });
}

export function updateGoogleEvent(googleEventId: string, event: Record<string, unknown>): Promise<{ ok: true }> {
  return callFn('update', { googleEventId, event });
}

export function deleteGoogleEvent(googleEventId: string): Promise<{ ok: true }> {
  return callFn('delete', { googleEventId });
}
