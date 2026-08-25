import { RRule, Weekday } from 'rrule';
import type { Event } from './types';
import { APP_TIMEZONE, dateKeyOf } from './dates';

const DOW_MAP: Weekday[] = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

/**
 * Expande uma série recorrente em instâncias concretas dentro de uma janela.
 * Cada instância recebe id sintético "<seriesId>@YYYY-MM-DD" (mesmo esquema
 * do protótipo original) e respeita ex[] (exceções materializadas).
 *
 * Produção: represente exceções como `recurringEventId` + `originalStartTime`,
 * como o Google faz — o campo `ex[]` aqui é o equivalente simplificado usado
 * internamente antes de sincronizar.
 */
export function expandSeries(event: Event, windowStartIso: string, windowEndIso: string, tz = APP_TIMEZONE): Event[] {
  if (!event.rrule) return [event];

  const durationMs = new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime();
  const dtstart = new Date(event.startsAt);

  const rule = new RRule({
    freq: RRule.WEEKLY,
    byweekday: event.rrule.dows.map((d) => DOW_MAP[d]),
    dtstart,
    until: event.rrule.until ? new Date(event.rrule.until) : undefined,
  });

  const occurrences = rule.between(new Date(windowStartIso), new Date(windowEndIso), true);
  const exSet = new Set(event.ex ?? []);

  return occurrences
    .map((occStart) => {
      const dateKey = dateKeyOf(occStart.toISOString(), tz);
      if (exSet.has(dateKey)) return null;
      const startsAt = occStart.toISOString();
      const endsAt = new Date(occStart.getTime() + durationMs).toISOString();
      const instance: Event = {
        ...event,
        id: `${event.id}@${dateKey}`,
        seriesId: event.id,
        startsAt,
        endsAt,
        rrule: undefined,
        ex: undefined,
      };
      return instance;
    })
    .filter((e): e is Event => e !== null);
}

export function expandAll(events: Event[], windowStartIso: string, windowEndIso: string, tz = APP_TIMEZONE): Event[] {
  const out: Event[] = [];
  for (const ev of events) {
    if (ev.rrule) {
      out.push(...expandSeries(ev, windowStartIso, windowEndIso, tz));
    } else {
      // filtro simples de janela para eventos não recorrentes
      const s = new Date(ev.startsAt).getTime();
      if (s >= new Date(windowStartIso).getTime() && s <= new Date(windowEndIso).getTime()) {
        out.push(ev);
      }
    }
  }
  return out;
}

export function weekdayLabelsPtBR(dows: number[]): string {
  const abbr = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  return dows
    .slice()
    .sort((a, b) => a - b)
    .map((d) => abbr[d])
    .join(', ');
}
