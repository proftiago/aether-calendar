// supabase/functions/google-calendar/index.ts
//
// Proxy entre o Aether Calendar e a API do Google Calendar. O frontend
// nunca fala direto com o Google nem guarda token nenhum — ele manda um
// POST aqui (com o AETHER_API_KEY no header Authorization) e esta função
// usa o refresh_token guardado no banco pra falar com o Google.
//
// Body esperado: { action: 'list' | 'create' | 'update' | 'delete', ... }
//
// Variáveis de ambiente necessárias:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  — pra renovar o access_token
//   AETHER_API_KEY                          — chave compartilhada só sua,
//                                              o app manda ela em todo request
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY já vêm automaticamente.
//
// Limitação combinada para a v1: eventos recorrentes criados no Aether NÃO
// são empurrados pro Google (RRULE completo fica pra depois); eventos
// recorrentes que já existem no Google chegam expandidos em instâncias
// (via singleEvents=true), então aparecem certinho no Aether, só não é
// possível editar a série inteira por aqui ainda.
//
// Atualização: eventos recorrentes do Aether agora SÃO enviados pro Google
// (ver toGoogleRRule). E o 'list' agora aceita varrer mais de um calendário
// (não só 'primary') — cada calendário tem seu próprio syncToken, guardado
// no JSON da coluna sync_tokens.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function googleEventsUrl(calendarId: string) {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
}
const GOOGLE_CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
// eventos criados/editados pelo Aether sempre vão pro primary — escolher o
// calendário de destino na criação fica pra uma v2, esse recurso aqui é só
// de LEITURA de calendários extras
const GOOGLE_API = googleEventsUrl('primary');

// CORS: esta função é chamada via fetch() direto do navegador (o app roda
// num domínio, a função em outro), então precisa responder ao preflight
// OPTIONS e mandar os headers de CORS em toda resposta — sem isso o
// navegador bloqueia a resposta antes mesmo dela chegar no app.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('AETHER_API_KEY');
  const auth = req.headers.get('Authorization');
  if (!apiKey || auth !== `Bearer ${apiKey}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const accessToken = await getValidAccessToken(supabase);
  if (!accessToken) {
    return json({ error: 'google_not_connected' }, 409);
  }

  try {
    switch (body.action) {
      case 'list-calendars':
        return json(await listCalendars(accessToken));
      case 'list':
        return json(
          await listEvents(accessToken, supabase, body as { timeMin?: string; timeMax?: string; forceFull?: boolean; calendarIds?: string[] }),
        );
      case 'create':
        return json(await createEvent(accessToken, body.event as Record<string, unknown>));
      case 'update':
        return json(await updateEvent(accessToken, body.googleEventId as string, body.event as Record<string, unknown>));
      case 'delete':
        return json(await deleteEvent(accessToken, body.googleEventId as string));
      default:
        return json({ error: 'unknown action' }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});

// --- token ---------------------------------------------------------------

async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabase.from('google_tokens').select('*').eq('id', 'default').maybeSingle();
  if (error || !data) return null;

  const expiry = new Date(data.expiry as string).getTime();
  const stillValid = expiry - Date.now() > 60_000; // margem de 1 min
  if (stillValid) return data.access_token as string;

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: data.refresh_token as string,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    console.error('Falha ao renovar token:', await res.text());
    return null;
  }
  const refreshed = await res.json();
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from('google_tokens')
    .update({ access_token: refreshed.access_token, expiry: newExpiry, updated_at: new Date().toISOString() })
    .eq('id', 'default');
  return refreshed.access_token as string;
}

// --- Google Calendar calls -------------------------------------------------

async function listCalendars(accessToken: string) {
  const res = await fetch(`${GOOGLE_CALENDAR_LIST_URL}?minAccessRole=reader&maxResults=250`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google calendarList falhou: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const calendars = (data.items ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    name: c.summary,
    color: c.backgroundColor,
    primary: !!c.primary,
  }));
  return { calendars };
}

async function listEvents(
  accessToken: string,
  supabase: ReturnType<typeof createClient>,
  opts: { timeMin?: string; timeMax?: string; forceFull?: boolean; calendarIds?: string[] },
) {
  const calendarIds = opts.calendarIds && opts.calendarIds.length > 0 ? opts.calendarIds : ['primary'];

  const { data: tokenRow } = await supabase.from('google_tokens').select('sync_tokens').eq('id', 'default').maybeSingle();
  const syncTokens = (tokenRow?.sync_tokens as Record<string, string>) ?? {};
  const newSyncTokens: Record<string, string> = { ...syncTokens };

  const allEvents: Record<string, unknown>[] = [];
  const allDeletedIds: string[] = [];

  for (const calendarId of calendarIds) {
    const baseParams = new URLSearchParams({ singleEvents: 'true', maxResults: '2500' });
    const savedToken = syncTokens[calendarId];

    if (savedToken && !opts.forceFull) {
      baseParams.set('syncToken', savedToken);
    } else {
      baseParams.set('orderBy', 'startTime');
      baseParams.set('timeMin', opts.timeMin ?? new Date(Date.now() - 45 * 86400_000).toISOString());
      baseParams.set('timeMax', opts.timeMax ?? new Date(Date.now() + 120 * 86400_000).toISOString());
    }

    let res = await fetch(`${googleEventsUrl(calendarId)}?${baseParams.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 410) {
      // syncToken expirado — refaz do zero pra esse calendário específico
      baseParams.delete('syncToken');
      baseParams.set('orderBy', 'startTime');
      baseParams.set('timeMin', opts.timeMin ?? new Date(Date.now() - 45 * 86400_000).toISOString());
      baseParams.set('timeMax', opts.timeMax ?? new Date(Date.now() + 120 * 86400_000).toISOString());
      res = await fetch(`${googleEventsUrl(calendarId)}?${baseParams.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    }

    if (!res.ok) {
      // um calendário com problema (ex: foi removido do compartilhamento)
      // não deve derrubar a sincronização dos outros — loga e segue
      console.error(`Google events.list falhou pra ${calendarId}: ${res.status} ${await res.text()}`);
      continue;
    }

    // Google pagina a resposta em blocos de até maxResults (2500) — uma
    // agenda com muitos eventos (aulas recorrentes, por exemplo) facilmente
    // passa disso numa janela de ~165 dias. Sem seguir nextPageToken, o
    // resto ficava cortado silenciosamente — bug real que explicava
    // "só mostra até essa semana" mesmo com a janela de datas correta.
    let data = await res.json();
    let pageCount = 1;
    while (true) {
      if (data.nextSyncToken) newSyncTokens[calendarId] = data.nextSyncToken;

      const items = data.items ?? [];
      for (const it of items) {
        if (it.status === 'cancelled') {
          allDeletedIds.push(it.id);
        } else {
          allEvents.push(mapGoogleEventToAether(it, calendarId));
        }
      }

      if (!data.nextPageToken || pageCount >= 20) break; // teto de segurança: 20 páginas = 5000 eventos
      pageCount++;
      const pageParams = new URLSearchParams(baseParams);
      // pageToken já carrega o contexto da consulta original — combinar
      // com syncToken/timeMin/timeMax na mesma chamada não é válido pra
      // API do Google, então removo antes de paginar
      pageParams.delete('syncToken');
      pageParams.delete('timeMin');
      pageParams.delete('timeMax');
      pageParams.delete('orderBy');
      pageParams.set('pageToken', data.nextPageToken);
      const pageRes = await fetch(`${googleEventsUrl(calendarId)}?${pageParams.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!pageRes.ok) {
        console.error(`Google events.list (página ${pageCount}) falhou pra ${calendarId}: ${pageRes.status} ${await pageRes.text()}`);
        break;
      }
      data = await pageRes.json();
    }
  }

  await supabase.from('google_tokens').update({ sync_tokens: newSyncTokens }).eq('id', 'default');

  return { events: allEvents, deletedIds: allDeletedIds };
}

async function createEvent(accessToken: string, event: Record<string, unknown>) {
  const res = await fetch(GOOGLE_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mapAetherEventToGoogle(event)),
  });
  if (!res.ok) throw new Error(`Google events.insert falhou: ${res.status} ${await res.text()}`);
  const created = await res.json();
  return { googleEventId: created.id };
}

async function updateEvent(accessToken: string, googleEventId: string, event: Record<string, unknown>) {
  const res = await fetch(`${GOOGLE_API}/${googleEventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mapAetherEventToGoogle(event)),
  });
  if (!res.ok) throw new Error(`Google events.patch falhou: ${res.status} ${await res.text()}`);
  return { ok: true };
}

async function deleteEvent(accessToken: string, googleEventId: string) {
  const res = await fetch(`${GOOGLE_API}/${googleEventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Google events.delete falhou: ${res.status} ${await res.text()}`);
  }
  return { ok: true };
}

// --- mapeamento de formato ---------------------------------------------

function mapGoogleEventToAether(ev: Record<string, any>, calendarId = 'primary') {
  const allDay = !!ev.start?.date;
  return {
    googleEventId: ev.id,
    googleCalendarId: calendarId,
    // presente só em instâncias expandidas de uma série (singleEvents=true
    // devolve cada ocorrência separada, apontando pro evento "mestre" que
    // carrega o RRULE de verdade) — o frontend usa isso pra não duplicar
    // visualmente séries que ele mesmo criou e já expande localmente
    recurringEventId: ev.recurringEventId || undefined,
    title: ev.summary ?? '(sem título)',
    calId: 'personal',
    startsAt: allDay ? new Date(`${ev.start.date}T00:00:00Z`).toISOString() : ev.start.dateTime,
    endsAt: allDay ? new Date(`${ev.end.date}T00:00:00Z`).toISOString() : ev.end.dateTime,
    timeZone: ev.start?.timeZone ?? 'America/Sao_Paulo',
    allDay,
    location: ev.location || undefined,
    meet: ev.hangoutLink || ev.conferenceData?.entryPoints?.[0]?.uri || undefined,
    notes: ev.description || undefined,
    src: 'google',
  };
}

function mapAetherEventToGoogle(event: Record<string, unknown>) {
  const allDay = !!event.allDay;
  const body: Record<string, unknown> = {
    summary: event.title,
    location: event.location || undefined,
    description: event.notes || undefined,
  };
  if (allDay) {
    body.start = { date: String(event.startsAt).slice(0, 10) };
    body.end = { date: String(event.endsAt).slice(0, 10) };
  } else {
    body.start = { dateTime: event.startsAt, timeZone: event.timeZone ?? 'America/Sao_Paulo' };
    body.end = { dateTime: event.endsAt, timeZone: event.timeZone ?? 'America/Sao_Paulo' };
  }
  const rrule = toGoogleRRule(event.rrule as { freq: 'weekly'; dows: number[]; until?: string } | undefined);
  if (rrule) body.recurrence = [rrule];
  return body;
}

const GOOGLE_DOW = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Converte o RRule simplificado do Aether ({freq:'weekly', dows:[0-6], until?})
 * pro formato RRULE de string que o Google Calendar espera. Só suporta
 * semanal (é tudo que o Aether cria hoje) — se algum dia o Aether ganhar
 * outras frequências, isso precisa crescer junto.
 */
function toGoogleRRule(rrule: { freq: 'weekly'; dows: number[]; until?: string } | undefined): string | null {
  if (!rrule || !rrule.dows || rrule.dows.length === 0) return null;
  const byDay = rrule.dows.map((d) => GOOGLE_DOW[d]).join(',');
  let rule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`;
  if (rrule.until) {
    const untilDate = new Date(rrule.until);
    const yyyy = untilDate.getUTCFullYear();
    const mm = String(untilDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(untilDate.getUTCDate()).padStart(2, '0');
    rule += `;UNTIL=${yyyy}${mm}${dd}T235959Z`;
  }
  return rule;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
