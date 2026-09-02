import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../store/selectors';
import { dateKeyOf, minutesOfDay, todayKey } from '../lib/dates';

const START_HOUR = 7;
const END_HOUR = 23;
const ROW_H = 44;

/**
 * Coluna estreita com uma mini-agenda em grade de horas (estilo relógio,
 * 7h-23h) — o que o print original mostra do lado esquerdo da página Hoje,
 * em vez da lista de cartões que usávamos antes. Só leitura (clicar num
 * evento leva pra página Calendário com ele selecionado), sem
 * drag-and-drop — isso já existe na grade de verdade.
 */
export function TodayHourGrid() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();

  if (state.w < 760) return null;

  const todaysTimed = visibleEvents.filter((ev) => !ev.allDay && dateKeyOf(ev.startsAt) === today);
  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const totalHeight = hours.length * ROW_H;

  return (
    <div className="w-[240px] shrink-0 border-r overflow-y-auto p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="text-[13px] font-semibold capitalize mb-0.5" style={{ color: 'var(--text)' }}>
        {dateLabel.split(',')[0] || dateLabel}
      </div>
      <div className="text-[11px] mb-4" style={{ color: 'var(--text3)' }}>
        {dateLabel}
      </div>

      <div className="relative" style={{ height: totalHeight }}>
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t text-[10px] font-mono-ae pt-0.5"
            style={{ top: i * ROW_H, borderColor: 'var(--border)', color: 'var(--text3)' }}
          >
            {String(h).padStart(2, '0')}:00
          </div>
        ))}

        {todaysTimed.map((ev) => {
          const cal = calendarOf(state, ev.calId);
          const startMin = minutesOfDay(ev.startsAt);
          const endMin = Math.max(startMin + 15, minutesOfDay(ev.endsAt));
          const top = ((startMin - START_HOUR * 60) / 60) * ROW_H;
          const height = ((endMin - startMin) / 60) * ROW_H;
          if (top + height < 0 || top > totalHeight) return null;
          return (
            <button
              key={ev.id}
              onClick={() => {
                dispatch({ type: 'SET_PAGE', page: 'calendario' });
                dispatch({ type: 'SET_SELECTED', id: ev.id });
              }}
              className="absolute left-[46px] right-0 rounded-[6px] px-1.5 py-[3px] text-left overflow-hidden"
              style={{
                top: Math.max(0, top),
                height: Math.max(18, height - 2),
                background: cal?.color ?? 'var(--accent)',
              }}
            >
              <span className="text-[10.5px] font-semibold text-white truncate block leading-tight">{ev.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
