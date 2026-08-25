import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../store/selectors';
import { dateKeyOf, hm, minutesOfDay, todayKey } from '../lib/dates';
import type { Event } from '../lib/types';

export function FocusModeView() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = todayKey();
  const now = state.now;

  const todaysTimed = visibleEvents
    .filter((ev) => !ev.allDay && dateKeyOf(ev.startsAt) === today)
    .sort((a, b) => minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt));

  const current = todaysTimed.find((ev) => minutesOfDay(ev.startsAt) <= now && now < minutesOfDay(ev.endsAt));
  const next = todaysTimed.find((ev) => minutesOfDay(ev.startsAt) > now);

  function exit() {
    dispatch({ type: 'SET_FOCUS_MODE', on: false });
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative" style={{ background: 'var(--bg)' }}>
      <button
        onClick={exit}
        className="absolute top-5 right-5 flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[13px] font-semibold"
        style={{ background: 'var(--surface2)', color: 'var(--text)' }}
      >
        <X size={14} />
        Sair do Focus Mode
      </button>

      <div className="flex items-center gap-2 mb-8" style={{ color: 'var(--gold)' }}>
        <Sparkles size={18} />
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em]">Focus Mode</span>
      </div>

      {current ? (
        <FocusCard label="Agora" event={current} calendarName={calendarOf(state, current.calId)?.name} accent="var(--gold)" now={now} />
      ) : (
        <div className="text-center mb-2">
          <div className="text-[15px]" style={{ color: 'var(--text2)' }}>
            Nenhum compromisso agora — hora de foco livre.
          </div>
        </div>
      )}

      {next && (
        <div className="mt-8 w-full max-w-[420px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--text3)' }}>
            A seguir
          </div>
          <FocusCard label={null} event={next} calendarName={calendarOf(state, next.calId)?.name} accent="var(--accent)" now={now} compact />
        </div>
      )}

      {!current && !next && (
        <div className="text-[13px] mt-2" style={{ color: 'var(--text3)' }}>
          Sem mais nada agendado por hoje.
        </div>
      )}
    </div>
  );
}

function FocusCard({
  label,
  event,
  calendarName,
  accent,
  now,
  compact,
}: {
  label: string | null;
  event: Event;
  calendarName?: string;
  accent: string;
  now: number;
  compact?: boolean;
}) {
  const s = minutesOfDay(event.startsAt);
  const e = minutesOfDay(event.endsAt);
  const remaining = s <= now ? e - now : s - now;

  return (
    <div
      className="w-full max-w-[420px] rounded-[16px] p-6"
      style={{ background: 'var(--surface)', borderLeft: `4px solid ${accent}`, boxShadow: 'var(--shadow)' }}
    >
      {label && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>
          {label}
        </div>
      )}
      <div className={compact ? 'text-[16px] font-semibold mb-1' : 'text-[22px] font-semibold mb-1.5'} style={{ color: 'var(--text)' }}>
        {event.title}
      </div>
      <div className="text-[13px] font-mono-ae mb-1" style={{ color: 'var(--text2)' }}>
        {hm(s)} – {hm(e)} {calendarName ? `· ${calendarName}` : ''}
      </div>
      {!compact && remaining > 0 && (
        <div className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
          {s <= now ? `Termina em ${remaining} min` : `Começa em ${remaining} min`}
        </div>
      )}
    </div>
  );
}
