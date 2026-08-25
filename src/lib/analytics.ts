import type { Event } from './types';
import { addDays, dateKeyOf, minutesOfDay, startOfWeekKey, todayKey } from './dates';

export type AnalyticsBucket = {
  key: 'meetings' | 'work' | 'personal' | 'family';
  label: string;
  minutes: number;
  pct: number;
  color: string;
};

const MEETING_KEYWORDS = ['reunião', 'reuniao', 'call', 'daily', 'standup', 'entrevista', 'apresentação', 'apresentacao'];

function isMeeting(ev: Event): boolean {
  if (ev.meet) return true;
  const lower = ev.title.toLowerCase();
  return MEETING_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Resumo de tempo da semana atual (segunda a domingo, a partir de hoje se
 * quiser outra semana, ajuste weekStartKey). Só considera eventos com
 * horário (ignora dia-inteiro, que não representa tempo "gasto").
 */
export function weeklyTimeBreakdown(events: Event[], weekStartKey = startOfWeekKey(todayKey(), 1)): AnalyticsBucket[] {
  const weekEnd = addDays(weekStartKey, 7);
  let meetingsMin = 0;
  let workMin = 0;
  let personalMin = 0;
  let familyMin = 0;

  for (const ev of events) {
    if (ev.allDay) continue;
    const dateKey = dateKeyOf(ev.startsAt);
    if (dateKey < weekStartKey || dateKey >= weekEnd) continue;
    const dur = Math.max(0, minutesOfDay(ev.endsAt) - minutesOfDay(ev.startsAt));
    if (dur === 0) continue;

    if (isMeeting(ev)) {
      meetingsMin += dur;
    } else if (ev.calId === 'work') {
      workMin += dur;
    } else if (ev.calId === 'family') {
      familyMin += dur;
    } else {
      personalMin += dur;
    }
  }

  const total = meetingsMin + workMin + personalMin + familyMin;
  const pct = (m: number) => (total === 0 ? 0 : Math.round((m / total) * 100));

  return [
    { key: 'meetings', label: 'Reuniões', minutes: meetingsMin, pct: pct(meetingsMin), color: 'var(--gold)' },
    { key: 'work', label: 'Trabalho focado', minutes: workMin, pct: pct(workMin), color: 'var(--cal-work)' },
    { key: 'personal', label: 'Pessoal', minutes: personalMin, pct: pct(personalMin), color: 'var(--cal-personal)' },
    { key: 'family', label: 'Família', minutes: familyMin, pct: pct(familyMin), color: 'var(--cal-family)' },
  ];
}

/** Heatmap simples: minutos ocupados por hora do dia (0-23), somando a semana toda — mostra os horários de pico. */
export function focusHeatmap(events: Event[], weekStartKey = startOfWeekKey(todayKey(), 1)): number[] {
  const weekEnd = addDays(weekStartKey, 7);
  const byHour = new Array(24).fill(0);
  for (const ev of events) {
    if (ev.allDay) continue;
    const dateKey = dateKeyOf(ev.startsAt);
    if (dateKey < weekStartKey || dateKey >= weekEnd) continue;
    const s = minutesOfDay(ev.startsAt);
    const e = Math.max(s + 1, minutesOfDay(ev.endsAt));
    for (let m = s; m < e; m += 15) {
      const h = Math.floor((m % 1440) / 60);
      byHour[h] += 15;
    }
  }
  return byHour;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
