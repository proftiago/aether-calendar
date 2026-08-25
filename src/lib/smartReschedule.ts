import type { Event } from './types';
import { dateKeyOf, minutesOfDay, toUtcIso } from './dates';
import { freeSlots } from './freeSlots';

/**
 * Encontra blocos de tempo derivados de tarefas (fromTaskId) que hoje estão
 * sobrepostos com outro evento — o cenário clássico de "a reunião atrasou e
 * empurrou por cima do meu bloco de foco". Só mexe em blocos de tarefa,
 * nunca em compromissos "de verdade" (reuniões, aulas etc.), que ficam
 * intocados — a ideia é reorganizar o que é flexível ao redor do que não é.
 */
export function findConflictingTaskBlocks(events: Event[]): Event[] {
  const byDay = new Map<string, Event[]>();
  for (const ev of events) {
    if (ev.allDay) continue;
    const key = dateKeyOf(ev.startsAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  }

  const conflicts: Event[] = [];
  for (const dayEvents of byDay.values()) {
    for (const a of dayEvents) {
      if (!a.fromTaskId) continue;
      const aS = minutesOfDay(a.startsAt);
      const aE = minutesOfDay(a.endsAt);
      const overlapsAnother = dayEvents.some((b) => {
        if (b.id === a.id) return false;
        const bS = minutesOfDay(b.startsAt);
        const bE = minutesOfDay(b.endsAt);
        return aS < bE && bS < aE;
      });
      if (overlapsAnother) conflicts.push(a);
    }
  }
  return conflicts;
}

export type RescheduleSuggestion = {
  event: Event;
  newDateKey: string;
  newStartMin: number;
  durationMin: number;
};

/**
 * Para cada bloco em conflito, acha o próximo horário livre (dentro do
 * horário de trabalho, pulando fins de semana) considerando todos os OUTROS
 * eventos — cada sugestão já assume que as anteriores foram aplicadas, pra
 * não sugerir o mesmo horário duas vezes.
 */
export function suggestReschedules(allEvents: Event[], conflicts: Event[]): RescheduleSuggestion[] {
  const suggestions: RescheduleSuggestion[] = [];
  let working = [...allEvents];

  for (const conflict of conflicts) {
    const duration = minutesOfDay(conflict.endsAt) - minutesOfDay(conflict.startsAt);
    const others = working.filter((ev) => ev.id !== conflict.id);
    const [slot] = freeSlots(others, duration, 1);
    if (!slot) continue;

    suggestions.push({ event: conflict, newDateKey: slot.dateKey, newStartMin: slot.startMin, durationMin: duration });

    // Reflete a sugestão no working set pra próxima iteração não colidir com ela
    const newStartsAt = toUtcIso(slot.dateKey, slot.startMin);
    const newEndsAt = toUtcIso(slot.dateKey, slot.startMin + duration);
    working = working.map((ev) => (ev.id === conflict.id ? { ...ev, startsAt: newStartsAt, endsAt: newEndsAt } : ev));
  }

  return suggestions;
}
