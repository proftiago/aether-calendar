import type { Event, WeatherInfo } from './types';
import { keyToDate } from './dates';

const WEATHER_OPTIONS: WeatherInfo[] = [
  { icon: '☀', label: 'Sol', temp: 29 },
  { icon: '⛅', label: 'Parcial', temp: 26 },
  { icon: '☁', label: 'Nublado', temp: 23 },
  { icon: '☂', label: 'Chuva', temp: 21 },
];

/**
 * Placeholder determinístico — em produção, trocar por uma API de clima real
 * (só para os próximos ~7 dias; além disso, esconder).
 */
export function weatherOf(dateKey: string): WeatherInfo {
  const d = keyToDate(dateKey);
  const idx = (d.getDate() * 7 + (d.getMonth() + 1)) % 4;
  return WEATHER_OPTIONS[idx];
}

const REMOTE_PATTERN = /zoom|meet|teams|hangout|online|remoto|casa/i;

/**
 * Placeholder determinístico de deslocamento — em produção, trocar pela
 * Distance Matrix / Directions API usando o local do evento anterior como origem.
 */
export function travelOf(event: Event): number | null {
  if (!event.location || REMOTE_PATTERN.test(event.location)) return null;
  return 12 + (event.title.length % 4) * 6;
}
