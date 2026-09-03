import { useMemo } from 'react';
import { useStore, emptyCreateForm } from '../../store/store';
import { useGoogleSync } from '../../hooks/useGoogleSync';
import { useAllEvents, useVisibleEvents, calendarOf } from '../../store/selectors';
import { addDays, dateKeyOf, dayNum, dowOf, isSameMonth, minutesOfDay, startOfMonthGridKey, todayKey, toUtcIso, hm } from '../../lib/dates';
import { eventBg } from '../../lib/style';
import type { Event } from '../../lib/types';

const DOW_LABELS_SUN = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DOW_LABELS_MON = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function MonthView() {
  const { state, dispatch } = useStore();
  const { pushUpdate } = useGoogleSync();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();
  const { showWeekends, weekStartsOn, timeFormat } = state.settings;

  const gridStart = startOfMonthGridKey(state.cursor, weekStartsOn);
  const allCells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const cells = showWeekends ? allCells : allCells.filter((d) => dowOf(d) !== 0 && dowOf(d) !== 6);
  const dowLabels = weekStartsOn === 0 ? DOW_LABELS_SUN : DOW_LABELS_MON;
  const visibleDowLabels = showWeekends ? dowLabels : dowLabels.filter((_, i) => (weekStartsOn === 0 ? i !== 0 && i !== 6 : i !== 5 && i !== 6));
  const colsClass = showWeekends ? 'grid-cols-7' : 'grid-cols-5';

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of visibleEvents) {
      const key = dateKeyOf(ev.startsAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
      if (ev.allDay) {
        let cursor = key;
        const endKey = dateKeyOf(new Date(new Date(ev.endsAt).getTime() - 1).toISOString());
        let guard = 0;
        while (cursor !== endKey && guard < 40) {
          cursor = addDays(cursor, 1);
          if (!map.has(cursor)) map.set(cursor, []);
          map.get(cursor)!.push(ev);
          guard++;
        }
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt);
      });
    }
    return map;
  }, [visibleEvents]);

  function moveEventToDay(eventId: string, newDateKey: string) {
    const ev = allEvents.find((e) => e.id === eventId);
    if (!ev) return;
    const s = ev.allDay ? 0 : minutesOfDay(ev.startsAt);
    const dur = ev.allDay ? 1440 : minutesOfDay(ev.endsAt) - minutesOfDay(ev.startsAt);
    const startsAt = toUtcIso(newDateKey, s);
    const endsAt = toUtcIso(newDateKey, s + dur);
    dispatch({ type: 'PATCH_EVENT', id: eventId, changes: { startsAt, endsAt }, toast: 'Evento movido' });
    pushUpdate({ ...ev, startsAt, endsAt });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className={`grid ${colsClass} border-b shrink-0`} style={{ borderColor: 'var(--border)' }}>
        {visibleDowLabels.map((d) => (
          <div
            key={d}
            className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1.5"
            style={{ color: 'var(--text3)' }}
          >
            {d}
          </div>
        ))}
      </div>
      <div className={`flex-1 grid ${colsClass} min-h-0`} style={{ gridAutoRows: '1fr' }}>
        {cells.map((dateKey) => {
          const inMonth = isSameMonth(dateKey, state.cursor);
          const isToday = dateKey === today;
          const dayEvents = eventsByDay.get(dateKey) ?? [];
          const shown = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - shown.length;

          return (
            <div
              key={dateKey}
              className="border-r border-b p-[5px] flex flex-col gap-[3px] overflow-hidden min-w-0"
              style={{ borderColor: 'var(--border)', opacity: inMonth ? 1 : 0.42 }}
              onDoubleClick={() => dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(dateKey, undefined, undefined, state.calendars[0]?.id) })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const evId = e.dataTransfer.getData('application/x-aether-event');
                if (evId) moveEventToDay(evId, dateKey);
              }}
            >
              <span
                className="text-[13px] font-semibold w-fit rounded-[6px] px-1"
                style={isToday ? { background: 'var(--accent)', color: 'var(--accentText)' } : { color: 'var(--text)' }}
              >
                {dayNum(dateKey)}
              </span>
              <div className="flex flex-col gap-[3px] min-h-0 overflow-hidden">
                {shown.map((ev) => {
                  const cal = calendarOf(state, ev.calId);
                  return (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-aether-event', ev.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'SET_SELECTED', id: ev.id });
                      }}
                      className="text-[11px] rounded-full px-2 py-[3px] flex items-center gap-1.5 cursor-pointer min-w-0"
                      style={{ background: eventBg(cal?.color ?? 'var(--accent)', 22) }}
                    >
                      <span className="font-mono-ae text-[10px] shrink-0" style={{ color: cal?.color }}>
                        {ev.allDay ? 'dia' : hm(minutesOfDay(ev.startsAt), timeFormat)}
                      </span>
                      <span className="font-semibold truncate min-w-0 flex-1" style={{ color: 'var(--text)' }}>
                        {ev.title}
                      </span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_CURSOR', cursor: dateKey });
                      dispatch({ type: 'SET_VIEW', view: 'day' });
                    }}
                    className="text-[11px] font-semibold text-left"
                    style={{ color: 'var(--text3)' }}
                  >
                    +{overflow} eventos
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
