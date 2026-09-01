import { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../store/selectors';
import { dateKeyOf, hm, minutesOfDay, todayKey } from '../lib/dates';

/**
 * Sino de notificação — mostra os próximos eventos de hoje que ainda vão
 * começar (dados reais, não decoração). Não é uma "central de
 * notificações" com histórico — o Aether não tem esse sistema por baixo,
 * então não finjo um: isso aqui é só "o que vem por aí hoje".
 */
export function NotificationBell() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();
  const now = state.now;

  const upcoming = useMemo(
    () =>
      visibleEvents
        .filter((ev) => !ev.allDay && !ev.done && dateKeyOf(ev.startsAt) === today && minutesOfDay(ev.startsAt) >= now)
        .sort((a, b) => minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt))
        .slice(0, 6),
    [visibleEvents, today, now],
  );

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 rounded-[7px] grid place-items-center hover:[background:var(--surface2)] relative"
        aria-label="Próximos eventos de hoje"
      >
        <Bell size={15} style={{ color: 'var(--text2)' }} />
        {upcoming.length > 0 && (
          <span
            className="absolute top-1 right-1 w-[7px] h-[7px] rounded-full"
            style={{ background: 'var(--gold)', boxShadow: '0 0 0 1.5px var(--surface)' }}
          />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute top-9 right-0 z-40 w-[240px] rounded-[12px] border p-1.5 animate-ae-pop"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
              Depois de agora, hoje
            </div>
            {upcoming.length === 0 ? (
              <p className="px-2 py-3 text-[12px] text-center" style={{ color: 'var(--text3)' }}>
                Nada mais agendado por hoje.
              </p>
            ) : (
              upcoming.map((ev) => {
                const cal = calendarOf(state, ev.calId);
                return (
                  <button
                    key={ev.id}
                    onClick={() => {
                      dispatch({ type: 'SET_PAGE', page: 'calendario' });
                      dispatch({ type: 'SET_SELECTED', id: ev.id });
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:[background:var(--surface2)]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cal?.color }} />
                    <span className="text-[11px] font-mono-ae shrink-0" style={{ color: 'var(--text3)' }}>
                      {hm(minutesOfDay(ev.startsAt), state.settings.timeFormat)}
                    </span>
                    <span className="text-[12.5px] font-medium truncate" style={{ color: 'var(--text)' }}>
                      {ev.title}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
