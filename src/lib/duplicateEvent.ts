import type { Event } from './types';
import { addMinutes } from './dates';

/**
 * Cria uma cópia independente de um evento — não recorrente (mesmo que o
 * original seja parte de uma série, a cópia é um evento único), sem o
 * vínculo com o Google Calendar do original (uma sincronização própria é
 * criada na primeira vez que a cópia for salva, se aplicável), deslocada
 * +1h do horário original só pra não nascer exatamente empilhada em cima
 * do evento de origem — a ideia é o usuário arrastar pra o horário certo
 * logo em seguida.
 */
export function duplicateEvent(original: Event): Event {
  const shiftedStart = original.allDay ? original.startsAt : addMinutes(new Date(original.startsAt), 60).toISOString();
  const shiftedEnd = original.allDay ? original.endsAt : addMinutes(new Date(original.endsAt), 60).toISOString();
  return {
    ...original,
    id: `local-${Date.now()}`,
    title: `${original.title} (cópia)`,
    startsAt: shiftedStart,
    endsAt: shiftedEnd,
    rrule: undefined,
    seriesId: undefined,
    ex: undefined,
    googleEventId: undefined,
    fromTaskId: undefined,
    src: 'local',
  };
}
