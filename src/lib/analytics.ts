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

/** Minutos totais agendados por dia, últimos N dias (incluindo hoje) — pra sparkline. */
export function dailyTotalsSparkline(events: Event[], days = 7): number[] {
  const today = todayKey();
  const totals: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = addDays(today, -i);
    let min = 0;
    for (const ev of events) {
      if (ev.allDay) continue;
      if (dateKeyOf(ev.startsAt) !== dateKey) continue;
      min += Math.max(0, minutesOfDay(ev.endsAt) - minutesOfDay(ev.startsAt));
    }
    totals.push(min);
  }
  return totals;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export type WeeklyStats = {
  eventsCount: number;
  eventsDelta: number;
  focusMinutes: number;
  focusDeltaMinutes: number;
  tasksCompleted: number;
  tasksDelta: number;
};

/**
 * Compara a semana atual com a anterior — usado no "Resumo da semana" ao
 * lado do calendário. "Foco" reaproveita o bucket 'work' (trabalho não
 * reunião) de weeklyTimeBreakdown, que já é a aproximação mais próxima que
 * temos de tempo de foco de verdade.
 */
export function weeklyStats(events: Event[], tasks: Array<{ done: boolean; lastDoneKey?: string }>): WeeklyStats {
  const thisWeekStart = startOfWeekKey(todayKey(), 1);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = thisWeekStart;
  const nextWeekStart = addDays(thisWeekStart, 7);

  const countEventsInRange = (start: string, end: string) =>
    events.filter((ev) => !ev.allDay && dateKeyOf(ev.startsAt) >= start && dateKeyOf(ev.startsAt) < end).length;

  const thisWeekEvents = countEventsInRange(thisWeekStart, nextWeekStart);
  const lastWeekEvents = countEventsInRange(lastWeekStart, lastWeekEnd);

  const thisWeekBuckets = weeklyTimeBreakdown(events, thisWeekStart);
  const lastWeekBuckets = weeklyTimeBreakdown(events, lastWeekStart);
  const thisWeekFocus = thisWeekBuckets.find((b) => b.key === 'work')?.minutes ?? 0;
  const lastWeekFocus = lastWeekBuckets.find((b) => b.key === 'work')?.minutes ?? 0;

  const tasksDoneInRange = (start: string, end: string) =>
    tasks.filter((t) => t.done && t.lastDoneKey && t.lastDoneKey >= start && t.lastDoneKey < end).length;

  const thisWeekTasks = tasksDoneInRange(thisWeekStart, nextWeekStart);
  const lastWeekTasks = tasksDoneInRange(lastWeekStart, lastWeekEnd);

  return {
    eventsCount: thisWeekEvents,
    eventsDelta: thisWeekEvents - lastWeekEvents,
    focusMinutes: thisWeekFocus,
    focusDeltaMinutes: thisWeekFocus - lastWeekFocus,
    tasksCompleted: thisWeekTasks,
    tasksDelta: thisWeekTasks - lastWeekTasks,
  };
}
