import type { Event } from './types';
import { freeSlots } from './freeSlots';
import { addDays, dateKeyOf, dowOf, minutesOfDay, todayKey } from './dates';

export type Suggestion = {
  dateKey: string;
  startMin: number;
  durationMin: number;
  score: number;
  reason: string;
};

/**
 * Assistente de sugestão de horário — heurística local, sem chamada a
 * nenhuma API externa (não expõe nenhuma chave em um app estático publicado
 * no Netlify). Usa os mesmos dados que "Encontrar horário livre" já usa,
 * mas ranqueia por: fragmentação do dia (evita deixar buracos pequenos
 * demais pra reaproveitar), preferência de período do dia por tipo de
 * atividade, e proximidade com o prazo quando a origem é uma tarefa com
 * prioridade alta.
 *
 * Para conectar um LLM de verdade no lugar (ex: Claude via uma Edge
 * Function do Supabase, nunca com a chave no cliente), troque a chamada a
 * `suggestBestTimes` por um fetch pro seu backend e mantenha o mesmo
 * formato de retorno — a UI (AIAssistant.tsx) não precisa mudar.
 */
export function suggestBestTimes(
  visibleEvents: Event[],
  durationMin: number,
  opts?: { priority?: 'alta' | 'média' | 'baixa'; preferMorning?: boolean; workStart?: number; workEnd?: number; workDays?: number[] },
): Suggestion[] {
  const candidateSlots = freeSlots(visibleEvents, durationMin, 10, opts?.workStart, opts?.workEnd, opts?.workDays);
  const byDay = groupByDay(visibleEvents);
  const today = todayKey();

  const scored: Suggestion[] = candidateSlots.map((slot) => {
    let score = 100;
    const reasons: string[] = [];

    // 1) Proximidade — sugestões mais cedo pontuam mais (evita procrastinar),
    //    especialmente para tarefas de prioridade alta.
    const daysOut = Math.max(0, dowDistance(today, slot.dateKey));
    const urgencyWeight = opts?.priority === 'alta' ? 6 : opts?.priority === 'baixa' ? 1.5 : 3;
    score -= daysOut * urgencyWeight;
    if (daysOut === 0) reasons.push('ainda hoje');
    else if (daysOut === 1) reasons.push('já amanhã');

    // 2) Fragmentação — verifica o tamanho do buraco livre em que o slot
    //    cai; prefere encaixar exatamente ou deixar um resto grande (>=30min)
    //    a deixar um resto pequeno e inútil.
    const dayEvents = (byDay.get(slot.dateKey) ?? []).slice().sort((a, b) => minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt));
    const gapInfo = gapAround(dayEvents, slot.startMin, durationMin);
    if (gapInfo.leftoverAfter > 0 && gapInfo.leftoverAfter < 20) {
      score -= 8; // deixa um resto pequeno demais pra ser útil
    } else if (gapInfo.leftoverAfter === 0) {
      score += 5;
      reasons.push('preenche o horário livre certinho');
    } else if (gapInfo.leftoverAfter >= 30) {
      score += 2;
    }

    // 3) Período do dia — manhã pontua um pouco mais para foco (heurística
    //    simples, sem pretensão de ciência exata).
    if (opts?.preferMorning !== false) {
      if (slot.startMin < 12 * 60) {
        score += 4;
        reasons.push('período da manhã');
      } else if (slot.startMin >= 17 * 60) {
        score -= 3;
      }
    }

    // 4) Evita ficar colado em outro evento sem folga nenhuma antes/depois
    //    (heurística de "respiro" entre compromissos).
    if (gapInfo.bufferBefore >= 15) score += 1;

    const dowLabel = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][dowOf(slot.dateKey)];
    const reason = reasons.length > 0 ? reasons.join(' · ') : `livre na ${dowLabel}`;

    return { dateKey: slot.dateKey, startMin: slot.startMin, durationMin, score, reason };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

function groupByDay(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();
  for (const ev of events) {
    if (ev.allDay) continue;
    const key = dateKeyOf(ev.startsAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}

function gapAround(dayEventsSorted: Event[], startMin: number, durationMin: number) {
  const endMin = startMin + durationMin;
  let prevEnd = 0;
  let nextStart = 24 * 60;
  for (const ev of dayEventsSorted) {
    const s = minutesOfDay(ev.startsAt);
    const e = minutesOfDay(ev.endsAt);
    if (e <= startMin && e > prevEnd) prevEnd = e;
    if (s >= endMin && s < nextStart) nextStart = s;
  }
  return {
    bufferBefore: startMin - prevEnd,
    leftoverAfter: nextStart - endMin,
  };
}

function dowDistance(fromKey: string, toKey: string): number {
  let cursor = fromKey;
  for (let i = 0; i < 20; i++) {
    if (cursor === toKey) return i;
    cursor = addDays(cursor, 1);
  }
  return 20;
}
