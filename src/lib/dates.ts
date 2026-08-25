import {
  addDays as fnsAddDays,
  addMonths as fnsAddMonths,
  addMinutes,
  startOfWeek as fnsStartOfWeek,
  startOfMonth,
  differenceInCalendarDays,
  isSameDay as fnsIsSameDay,
  format as fnsFormat,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Timezone canônico do usuário. Em produção isto viria das preferências da
 * conta; por padrão usamos o fuso do usuário (São Paulo/Rio), seguindo a
 * recomendação do handoff de tratar tudo como UTC + timeZone desde o início.
 */
export const APP_TIMEZONE = 'America/Sao_Paulo';

/** Data local 'YYYY-MM-DD' de um instante UTC (ISO), no fuso do app. */
export function dateKeyOf(isoUtc: string, tz = APP_TIMEZONE): string {
  return formatInTimeZone(new Date(isoUtc), tz, 'yyyy-MM-dd');
}

/** Minutos desde 00:00 locais de um instante UTC (ISO), no fuso do app. */
export function minutesOfDay(isoUtc: string, tz = APP_TIMEZONE): number {
  const zoned = toZonedTime(new Date(isoUtc), tz);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** Constrói um ISO UTC a partir de data local 'YYYY-MM-DD' + minutos desde 00:00. */
export function toUtcIso(dateKey: string, minutesFromMidnight: number, tz = APP_TIMEZONE): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  // reconstituímos os componentes e pedimos ao date-fns-tz para tratá-los
  // como horário de parede no fuso do app (não no fuso da máquina).
  const wallClock = new Date(y, m - 1, d, Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return fromZonedTime(wallClock, tz).toISOString();
}

export function todayKey(tz = APP_TIMEZONE): string {
  return formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
}

export function nowMinutesOfDay(tz = APP_TIMEZONE): number {
  const zoned = toZonedTime(new Date(), tz);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

export function keyToDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateToKey(date: Date): string {
  return fnsFormat(date, 'yyyy-MM-dd');
}

export function addDays(dateKey: string, n: number): string {
  return dateToKey(fnsAddDays(keyToDate(dateKey), n));
}

export function addMonthsKey(dateKey: string, n: number): string {
  return dateToKey(fnsAddMonths(keyToDate(dateKey), n));
}

export function startOfWeekKey(dateKey: string, weekStartsOn: 0 | 1 = 1): string {
  return dateToKey(fnsStartOfWeek(keyToDate(dateKey), { weekStartsOn }));
}

/** Número ISO-ish da semana (segunda como início), pra exibir tipo "Semana 35" como o Notion Calendar. */
export function weekNumberOf(dateKey: string): number {
  const d = keyToDate(dateKey);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - new Date(firstThursday.getFullYear(), firstThursday.getMonth(), firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7)).getTime();
  return 1 + Math.round(diff / (7 * 86400000));
}

export function startOfMonthGridKey(dateKey: string, weekStartsOn: 0 | 1 = 0): string {
  // domingo (ou segunda) da semana que contém o dia 1 do mês (grade de 42 células)
  const first = startOfMonth(keyToDate(dateKey));
  return dateToKey(fnsStartOfWeek(first, { weekStartsOn }));
}

export function isSameDayKey(a: string, b: string): boolean {
  return a === b;
}

export function isSameMonth(dateKey: string, refKey: string): boolean {
  const [y1, m1] = dateKey.split('-');
  const [y2, m2] = refKey.split('-');
  return y1 === y2 && m1 === m2;
}

export function dowOf(dateKey: string): number {
  return keyToDate(dateKey).getDay();
}

export function dayNum(dateKey: string): number {
  return keyToDate(dateKey).getDate();
}

const DOW_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export function dowAbbr(dateKey: string): string {
  return DOW_ABBR[dowOf(dateKey)];
}

export function formatDayLabel(dateKey: string): string {
  return fnsFormat(keyToDate(dateKey), "EEE · d 'de' MMM", { locale: ptBR });
}

export function formatPeriodLabel(view: 'day' | 'week' | 'month' | 'agenda', cursorKey: string, weekStartsOn: 0 | 1 = 1): string {
  if (view === 'day') {
    return fnsFormat(keyToDate(cursorKey), "EEE, d 'de' MMMM", { locale: ptBR });
  }
  if (view === 'week') {
    const start = startOfWeekKey(cursorKey, weekStartsOn);
    const end = addDays(start, 6);
    const sameMonth = isSameMonth(start, end);
    const startFmt = fnsFormat(keyToDate(start), 'd', { locale: ptBR });
    const endFmt = sameMonth
      ? fnsFormat(keyToDate(end), "d 'de' MMMM", { locale: ptBR })
      : fnsFormat(keyToDate(end), "d 'de' MMMM", { locale: ptBR });
    return `${startFmt} – ${endFmt}`;
  }
  if (view === 'month') {
    return fnsFormat(keyToDate(cursorKey), "MMMM 'de' yyyy", { locale: ptBR });
  }
  return 'próximos 28 dias';
}

export function hm(minutes: number, format: '12h' | '24h' = '24h'): string {
  const h = Math.floor(((minutes % 1440) + 1440) % 1440 / 60);
  const m = ((minutes % 60) + 60) % 60;
  if (format === '12h') {
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return fnsIsSameDay(a, b);
}

export function daysBetween(aKey: string, bKey: string): number {
  return differenceInCalendarDays(keyToDate(bKey), keyToDate(aKey));
}

export { addMinutes };
