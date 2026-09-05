import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, emptyCreateForm } from '../../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../../store/selectors';
import { addDays, dateKeyOf, dayNum, hm, minutesOfDay, startOfWeekKey, todayKey } from '../../lib/dates';

const DOW_LABELS_MON = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const DOW_LABELS_SUN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/**
 * Visão de calendário simplificada pro celular — em vez de espremer a
 * grade de horas (que fica apertada demais numa tela estreita mesmo já
 * reduzida a 3 dias), mostra uma faixa de dias da semana pra escolher, e
 * a agenda do dia escolhido como uma lista de cartões (baseado no
 * arquivo de referência MobileTabletApp.tsx). Reaproveita o Drawer já
 * existente pra abrir os detalhes de um evento (com toda a lógica de
 * série recorrente que ele já tem), e o formulário normal pra criar.
 */
export function MobileDayAgenda() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();
  const weekStartsOn = state.settings.weekStartsOn;
  const weekStart = startOfWeekKey(state.cursor, weekStartsOn);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const labels = weekStartsOn === 0 ? DOW_LABELS_SUN : DOW_LABELS_MON;

  const dayEvents = visibleEvents
    .filter((ev) => dateKeyOf(ev.startsAt) === state.cursor)
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt);
    });

  const dateLabel = new Date(`${state.cursor}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  function goDay(delta: number) {
    dispatch({ type: 'SET_CURSOR', cursor: addDays(state.cursor, delta) });
  }

  function createEvent() {
    dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(state.cursor, undefined, undefined, state.calendars[0]?.id) });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goDay(-7)} className="w-9 h-9 rounded-[10px] border grid place-items-center" style={{ borderColor: 'var(--border)' }}>
          <ChevronLeft size={15} style={{ color: 'var(--text2)' }} />
        </button>
        <span className="text-[13px] font-medium capitalize" style={{ color: 'var(--text)' }}>
          {new Date(`${weekStart}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} –{' '}
          {new Date(`${addDays(weekStart, 6)}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
        </span>
        <button onClick={() => goDay(7)} className="w-9 h-9 rounded-[10px] border grid place-items-center" style={{ borderColor: 'var(--border)' }}>
          <ChevronRight size={15} style={{ color: 'var(--text2)' }} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-[16px] border p-2 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {days.map((dateKey, i) => {
          const isSelected = dateKey === state.cursor;
          const isToday = dateKey === today;
          return (
            <button
              key={dateKey}
              onClick={() => dispatch({ type: 'SET_CURSOR', cursor: dateKey })}
              className="rounded-[10px] py-2 text-center"
              style={{ background: isSelected ? 'var(--gold)' : 'transparent' }}
            >
              <span className="block text-[10px]" style={{ color: isSelected ? 'var(--goldText)' : 'var(--text3)' }}>
                {labels[i]}
              </span>
              <span
                className="mt-1 block text-[13px] font-semibold"
                style={{ color: isSelected ? 'var(--goldText)' : isToday ? 'var(--accent)' : 'var(--text)' }}
              >
                {dayNum(dateKey)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text3)' }}>
            {new Date(`${state.cursor}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })}
          </p>
          <h2 className="text-[20px] font-semibold capitalize" style={{ color: 'var(--text)' }}>
            {dateLabel.split(',')[1]?.trim() ?? dateLabel}
          </h2>
        </div>
        <button
          onClick={createEvent}
          className="w-10 h-10 rounded-full grid place-items-center shrink-0"
          style={{ background: 'var(--gold)', color: 'var(--goldText)' }}
          aria-label="Novo evento"
        >
          <Plus size={18} />
        </button>
      </div>

      {dayEvents.length === 0 && (
        <p className="text-[13px] text-center py-10" style={{ color: 'var(--text3)' }}>
          Nada agendado por hoje.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {dayEvents.map((ev) => {
          const cal = calendarOf(state, ev.calId);
          return (
            <div key={ev.id} className="flex gap-3">
              <span className="w-11 pt-3 text-[11px] shrink-0" style={{ color: 'var(--text3)' }}>
                {ev.allDay ? 'dia todo' : hm(minutesOfDay(ev.startsAt), state.settings.timeFormat)}
              </span>
              <button
                onClick={() => dispatch({ type: 'SET_SELECTED', id: ev.id })}
                className="flex-1 text-left rounded-[14px] border p-3"
                style={{ borderColor: cal?.color ?? 'var(--border)', background: 'color-mix(in oklab, ' + (cal?.color ?? 'var(--accent)') + ' 8%, var(--surface))' }}
              >
                <p className="text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                  {ev.title}
                </p>
                {!ev.allDay && (
                  <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text3)' }}>
                    {hm(minutesOfDay(ev.startsAt), state.settings.timeFormat)} – {hm(minutesOfDay(ev.endsAt), state.settings.timeFormat)}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
