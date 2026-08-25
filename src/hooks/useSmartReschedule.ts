import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents } from '../store/selectors';
import { findConflictingTaskBlocks, suggestReschedules } from '../lib/smartReschedule';
import { toUtcIso } from '../lib/dates';
import { useGoogleSync } from './useGoogleSync';

/**
 * "AI auto-scheduling" — versão viável pra um app pessoal sem backend de IA:
 * detecta blocos de tempo derivados de tarefas que ficaram sobrepostos com
 * outro compromisso (a reunião que atrasou por cima do bloco de foco) e
 * realoca cada um pro próximo horário livre, sem tocar nos compromissos
 * "de verdade".
 */
export function useSmartReschedule() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const { pushUpdate } = useGoogleSync();

  function resolveConflicts() {
    const conflicts = findConflictingTaskBlocks(visibleEvents);
    if (conflicts.length === 0) {
      dispatch({ type: 'TOAST', message: 'Nenhum conflito encontrado — sua agenda está tranquila' });
      return;
    }

    const suggestions = suggestReschedules(visibleEvents, conflicts);
    for (const s of suggestions) {
      const startsAt = toUtcIso(s.newDateKey, s.newStartMin);
      const endsAt = toUtcIso(s.newDateKey, s.newStartMin + s.durationMin);
      dispatch({ type: 'PATCH_EVENT', id: s.event.id, changes: { startsAt, endsAt } });
      pushUpdate({ ...s.event, startsAt, endsAt });
    }

    dispatch({
      type: 'TOAST',
      message: `${suggestions.length} ${suggestions.length === 1 ? 'tarefa reorganizada' : 'tarefas reorganizadas'} pra não conflitar mais`,
    });
  }

  return { resolveConflicts };
}
