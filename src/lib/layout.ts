import type { Event, LaidOutBlock } from './types';
import { minutesOfDay } from './dates';

type Interval = { event: Event; s: number; e: number };

/**
 * Algoritmo de sobreposição (clusters + lanes), reimplementado igual ao
 * comportamento visual do protótipo: eventos ordenados por início; novo
 * cluster quando o início do evento é >= fim do cluster corrente; dentro do
 * cluster, cada evento recebe a primeira lane cujo fim <= início do evento,
 * criando nova lane se nenhuma servir. Todos os eventos do cluster
 * compartilham a contagem final de lanes.
 */
export function layout(dayEvents: Event[], tz?: string): LaidOutBlock[] {
  const intervals: Interval[] = dayEvents
    .filter((ev) => !ev.allDay)
    .map((ev) => ({
      event: ev,
      s: minutesOfDay(ev.startsAt, tz),
      e: Math.max(minutesOfDay(ev.startsAt, tz) + 1, minutesOfDay(ev.endsAt, tz) || 24 * 60),
    }))
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const blocks: LaidOutBlock[] = [];
  let cluster: Interval[] = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: { interval: Interval; lane: number }[] = [];
    for (const iv of cluster) {
      let laneIdx = laneEnds.findIndex((end) => end <= iv.s);
      if (laneIdx === -1) {
        laneIdx = laneEnds.length;
        laneEnds.push(iv.e);
      } else {
        laneEnds[laneIdx] = iv.e;
      }
      assigned.push({ interval: iv, lane: laneIdx });
    }
    const lanes = laneEnds.length;
    for (const { interval, lane } of assigned) {
      blocks.push({ event: interval.event, s: interval.s, e: interval.e, lane, lanes });
    }
    cluster = [];
  };

  for (const iv of intervals) {
    if (cluster.length === 0) {
      cluster.push(iv);
      clusterEnd = iv.e;
      continue;
    }
    if (iv.s >= clusterEnd) {
      flushCluster();
      cluster.push(iv);
      clusterEnd = iv.e;
    } else {
      cluster.push(iv);
      clusterEnd = Math.max(clusterEnd, iv.e);
    }
  }
  flushCluster();

  return blocks;
}

export function clipToWindow(block: LaidOutBlock, h0: number, h1: number): LaidOutBlock | null {
  if (block.e <= h0 || block.s >= h1) return null;
  return { ...block, s: Math.max(block.s, h0), e: Math.min(block.e, h1) };
}
