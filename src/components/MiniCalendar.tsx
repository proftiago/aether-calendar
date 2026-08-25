import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store/store';
import { addDays, addMonthsKey, dayNum, isSameMonth, keyToDate, startOfMonthGridKey, todayKey, weekNumberOf } from '../lib/dates';

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

  function goMonth(dir: 1 | -1) {
    dispatch({ type: 'SET_CURSOR', cursor: addMonthsKey(state.cursor, dir) });
  }

  function pick(dateKey: string) {
    dispatch({ type: 'SET_CURSOR', cursor: dateKey });
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[12px] font-bold capitalize" style={{ color: 'var(--text)' }}>
          {monthLabel}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => goMonth(-1)} className="w-5 h-5 rounded-[5px] grid place-items-center" aria-label="Mês anterior">
            <ChevronLeft size={12} style={{ color: 'var(--text3)' }} />
          </button>
          <button onClick={() => goMonth(1)} className="w-5 h-5 rounded-[5px] grid place-items-center" aria-label="Próximo mês">
            <ChevronRight size={12} style={{ color: 'var(--text3)' }} />
          </button>
        </div>
      </div>

      <div className="grid text-center" style={{ gridTemplateColumns: state.settings.showWeekNumbers ? '20px repeat(7, 1fr)' : 'repeat(7, 1fr)' }}>
        {state.settings.showWeekNumbers && <span />}
        {labels.map((l, i) => (
          <span key={i} className="text-[9.5px] font-semibold pb-1" style={{ color: 'var(--text3)' }}>
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
              return (
                <button
                  key={dateKey}
                  onClick={() => pick(dateKey)}
                  className="text-[10.5px] rounded-full w-6 h-6 mx-auto my-[1px] grid place-items-center"
                  style={{
                    opacity: inMonth ? 1 : 0.32,
                    background: isSelected ? 'var(--accent)' : isToday ? 'var(--surface2)' : 'transparent',
                    color: isSelected ? 'var(--accentText)' : isToday ? 'var(--accent)' : 'var(--text)',
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}
                >
                  {dayNum(dateKey)}
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
