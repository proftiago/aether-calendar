import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../store/selectors';
import { addDays, addMonthsKey, dateKeyOf, dayNum, isSameMonth, keyToDate, startOfMonthGridKey, todayKey, weekNumberOf } from '../lib/dates';

const DOW_LABELS_SUN = ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa'];
const DOW_LABELS_MON = ['Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa', 'Do'];

export function MiniCalendar() {
  const { state, dispatch } = useStore();
  const weekStartsOn = state.settings.weekStartsOn;
  const today = todayKey();
  const gridStart = startOfMonthGridKey(state.cursor, weekStartsOn);
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)));
  }
  const labels = weekStartsOn === 0 ? DOW_LABELS_SUN : DOW_LABELS_MON;
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(keyToDate(state.cursor));

  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  // cor do primeiro evento do dia (por horário) — indicador simples, não
  // tenta mostrar todas as cores quando o dia tem eventos de calendários
  // diferentes, só sinaliza "tem algo aqui"
  const dotColorByDay = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...visibleEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    for (const ev of sorted) {
      const key = dateKeyOf(ev.startsAt);
      if (map.has(key)) continue;
      const cal = calendarOf(state, ev.calId);
      map.set(key, cal?.color ?? 'var(--accent)');
    }
    return map;
  }, [visibleEvents, state]);

  function goMonth(dir: 1 | -1) {
    dispatch({ type: 'SET_CURSOR', cursor: addMonthsKey(state.cursor, dir) });
  }

  function pick(dateKey: string) {
    dispatch({ type: 'SET_CURSOR', cursor: dateKey });
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <span className="text-[13px] font-semibold capitalize" style={{ color: 'var(--text)' }}>
          {monthLabel}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => goMonth(-1)} className="w-6 h-6 rounded-[6px] grid place-items-center hover:[background:var(--surface2)]" aria-label="Mês anterior">
            <ChevronLeft size={12} style={{ color: 'var(--text3)' }} />
          </button>
          <button onClick={() => goMonth(1)} className="w-6 h-6 rounded-[6px] grid place-items-center hover:[background:var(--surface2)]" aria-label="Próximo mês">
            <ChevronRight size={12} style={{ color: 'var(--text3)' }} />
          </button>
        </div>
      </div>

      <div className="grid text-center" style={{ gridTemplateColumns: state.settings.showWeekNumbers ? '22px repeat(7, 1fr)' : 'repeat(7, 1fr)' }}>
        {state.settings.showWeekNumbers && <span />}
        {labels.map((l, i) => (
          <span key={i} className="text-[10px] font-semibold pb-1.5" style={{ color: 'var(--text3)' }}>
            {l}
          </span>
        ))}

        {weeks.map((week, wi) => (
          <RowFragment key={wi}>
            {state.settings.showWeekNumbers && (
              <span className="text-[9px] font-mono-ae pr-0.5" style={{ color: 'var(--text3)' }}>
                {weekNumberOf(week[0])}
              </span>
            )}
            {week.map((dateKey) => {
              const inMonth = isSameMonth(dateKey, state.cursor);
              const isToday = dateKey === today;
              const isSelected = dateKey === state.cursor;
              const dotColor = dotColorByDay.get(dateKey);
              return (
                <button
                  key={dateKey}
                  onClick={() => pick(dateKey)}
                  className="relative text-[12px] rounded-full w-7 h-7 mx-auto my-[2px] grid place-items-center"
                  style={{
                    opacity: inMonth ? 1 : 0.32,
                    background: isSelected ? 'var(--accent)' : isToday ? 'var(--surface2)' : 'transparent',
                    color: isSelected ? 'var(--accentText)' : isToday ? 'var(--accent)' : 'var(--text)',
                    fontWeight: isToday || isSelected ? 600 : 400,
                  }}
                >
                  {dayNum(dateKey)}
                  {dotColor && (
                    <span
                      className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[3.5px] h-[3.5px] rounded-full"
                      style={{ background: isSelected ? 'var(--accentText)' : dotColor }}
                    />
                  )}
                </button>
              );
            })}
          </RowFragment>
        ))}
      </div>
    </div>
  );
}

function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
