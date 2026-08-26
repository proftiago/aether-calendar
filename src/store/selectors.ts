import { useMemo } from 'react';
import type { AppState } from './store';
import type { Event } from '../lib/types';
import { expandAll } from '../lib/recurrence';
import { addDays, dateKeyOf, todayKey } from '../lib/dates';

/** Expande séries recorrentes na janela [hoje-45d, hoje+120d], memoizado. */
export function useAllEvents(state: AppState): Event[] {
  return useMemo(() => {
    const today = todayKey();
    const windowStart = addDays(today, -45);
    const windowEnd = addDays(today, 120);
    const startIso = new Date(`${windowStart}T00:00:00`).toISOString();
    const endIso = new Date(`${windowEnd}T23:59:59`).toISOString();
    return expandAll(state.events, startIso, endIso);
  }, [state.events]);
}

/** Filtra por calendário visível e pela busca (título + local), case-insensitive. */
export function useVisibleEvents(state: AppState, allEvents: Event[]): Event[] {
  return useMemo(() => {
    const visibleCalIds = new Set(state.calendars.filter((c) => c.visible).map((c) => c.id));
    const q = state.search.trim().toLowerCase();
    return allEvents.filter((ev) => {
      if (!visibleCalIds.has(ev.calId)) return false;
      if (!q) return true;
      const hay = `${ev.title} ${ev.location ?? ''} ${ev.notes ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allEvents, state.calendars, state.search]);
}

export function useEventsByDay(visibleEvents: Event[]): Map<string, Event[]> {
  return useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of visibleEvents) {
      if (ev.allDay) {
        // eventos de dia inteiro (possivelmente multi-dia) — indexa em cada dia
        const startKey = dateKeyOf(ev.startsAt);
        const endKey = dateKeyOf(new Date(new Date(ev.endsAt).getTime() - 1).toISOString());
        let cursor = startKey;
        let guard = 0;
        while (guard < 60) {
          if (!map.has(cursor)) map.set(cursor, []);
          map.get(cursor)!.push(ev);
          if (cursor === endKey) break;
          cursor = addDays(cursor, 1);
          guard++;
        }
        continue;
      }
      const key = dateKeyOf(ev.startsAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [visibleEvents]);
}

export function calendarOf(state: AppState, calId: string) {
  return state.calendars.find((c) => c.id === calId);
}
