import type { Event } from './types';
import { addDays, dateKeyOf, dowOf, minutesOfDay, nowMinutesOfDay, todayKey } from './dates';

export type FreeSlot = { dateKey: string; startMin: number };

/**
 * freeSlots(events, minutes, count, workStart, workEnd, workDays): varre os
 * próximos 14 dias, considerando só os dias em workDays (0=dom...6=sáb) e a
 * janela workStart–workEnd (minutos desde 00:00); no dia de hoje começa em
 * max(workStart, agora arredondado para os próximos 30 min); percorre os
 * eventos do dia em ordem e coleta as lacunas >= minutes. Considera apenas
 * eventos de calendários visíveis (o filtro já deve ter sido aplicado em
 * `events`). workStart/workEnd/workDays têm padrão pra manter compatibilidade
 * de quem já chamava sem esses argumentos.
 */
export function freeSlots(
  events: Event[],
  minutes: number,
  count: number,
  workStart = 9 * 60,
  workEnd = 19 * 60,
  workDays: number[] = [1, 2, 3, 4, 5],
): FreeSlot[] {
  const today = todayKey();
  const nowRounded = Math.ceil(nowMinutesOfDay() / 30) * 30;
  const results: FreeSlot[] = [];

  const byDay = new Map<string, Event[]>();
  for (const ev of events) {
    if (ev.allDay) continue;
    const key = dateKeyOf(ev.startsAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  }
  for (const [, list] of byDay) {
    list.sort((a, b) => minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt));
  }

  for (let i = 0; i < 14 && results.length < count; i++) {
    const dateKey = addDays(today, i);
    const dow = dowOf(dateKey);
    if (!workDays.includes(dow)) continue;

    const dayStart = dateKey === today ? Math.max(workStart, nowRounded) : workStart;
    if (dayStart >= workEnd) continue;

    const dayEvents = byDay.get(dateKey) ?? [];
    let cursor = dayStart;
    for (const ev of dayEvents) {
      const s = minutesOfDay(ev.startsAt);
      const e = minutesOfDay(ev.endsAt);
      if (s > cursor && s - cursor >= minutes) {
        results.push({ dateKey, startMin: cursor });
        if (results.length >= count) break;
      }
      cursor = Math.max(cursor, e);
    }
    if (results.length >= count) break;
    if (workEnd - cursor >= minutes) {
      results.push({ dateKey, startMin: cursor });
    }
  }

  return results.slice(0, count);
}
