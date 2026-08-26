import { useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents } from '../store/selectors';
import { dateKeyOf, minutesOfDay, todayKey } from '../lib/dates';

/**
 * Lembretes só funcionam enquanto o app/aba está aberto — não é uma
 * notificação push de verdade (isso exigiria service worker + servidor
 * disparando o push, escopo bem maior que "lembrete simples"). Se o
 * navegador ou a aba estiverem fechados na hora, o lembrete não dispara.
 */
export function ReminderService() {
  const { state } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!state.settings.remindersEnabled) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [state.settings.remindersEnabled]);

  useEffect(() => {
    if (!state.settings.remindersEnabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const today = todayKey();
    const now = state.now;
    const windowMin = state.settings.reminderMinutes;

    for (const ev of visibleEvents) {
      if (ev.allDay || ev.done) continue;
      if (dateKeyOf(ev.startsAt) !== today) continue;
      const startMin = minutesOfDay(ev.startsAt);
      const minsUntil = startMin - now;
      if (minsUntil < 0 || minsUntil > windowMin) continue;
      if (notified.current.has(ev.id)) continue;

      notified.current.add(ev.id);
      try {
        new Notification(ev.title, {
          body: minsUntil === 0 ? 'Começando agora' : `Começa em ${minsUntil} min${ev.location ? ` · ${ev.location}` : ''}`,
          tag: `aether-reminder-${ev.id}`,
        });
      } catch {
        // navegador recusou (ex: fora de contexto seguro) — sem crash
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.now, state.settings.remindersEnabled, state.settings.reminderMinutes, visibleEvents]);

  return null;
}
