import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, emptyCreateForm } from '../../store/store';
import { useGoogleSync } from '../../hooks/useGoogleSync';
import { useAllEvents, useVisibleEvents, calendarOf } from '../../store/selectors';
import {
  addDays,
  dateKeyOf,
  dayNum,
  dowAbbr,
  dowOf,
  hm,
  minutesOfDay,
  startOfWeekKey,
  todayKey,
  toUtcIso,
} from '../../lib/dates';
import { layout, clipToWindow } from '../../lib/layout';
import { eventBg } from '../../lib/style';
import { weatherOf } from '../../lib/estimates';
import { EventBlock } from '../EventBlock';
import type { Event } from '../../lib/types';

const ROW_H = 56;
const PX_PER_MIN = ROW_H / 60;
const GUTTER = 60;

type DragState =
  | { type: 'move'; eventId: string; s: number; e: number; colIndex: number; duration: number; origDateKey: string }
  | { type: 'resize'; eventId: string; s: number; e: number; colIndex: number; origEnd: number };

export function DayWeekGrid() {
  const { state, dispatch } = useStore();
  const { pushUpdate, pushCreate } = useGoogleSync();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);

  const days = useMemo(() => {
    if (state.view === 'day') return [state.cursor];
    const narrow = state.w < 720;
    if (narrow) return [0, 1, 2].map((i) => addDays(state.cursor, i));
    const start = startOfWeekKey(state.cursor, state.settings.weekStartsOn);
    const all = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return state.settings.showWeekends ? all : all.filter((d) => dowOf(d) !== 0 && dowOf(d) !== 6);
  }, [state.view, state.cursor, state.w, state.settings.weekStartsOn, state.settings.showWeekends]);

  const H0 = state.workOnly ? 7 * 60 : 0;
  const H1 = state.workOnly ? 19 * 60 : 24 * 60;
  const visibleHours: number[] = [];
  for (let h = H0 / 60; h < H1 / 60; h++) visibleHours.push(h);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const key of days) map.set(key, []);
    for (const ev of visibleEvents) {
      const key = dateKeyOf(ev.startsAt);
      if (map.has(key)) map.get(key)!.push(ev);
      // eventos multi-dia "dia inteiro" também aparecem nos dias seguintes
      if (ev.allDay) {
        let cursor = key;
        const endKey = dateKeyOf(new Date(new Date(ev.endsAt).getTime() - 1).toISOString());
        let guard = 0;
        while (cursor !== endKey && guard < 40) {
          cursor = addDays(cursor, 1);
          if (map.has(cursor)) map.get(cursor)!.push(ev);
          guard++;
        }
      }
    }
    return map;
  }, [visibleEvents, days]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const scrolledOnce = useRef(false);

  useEffect(() => {
    if (scrolledOnce.current) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (7 * 60 - H0) * PX_PER_MIN - 20);
      scrolledOnce.current = true;
    }
  }, [H0]);

  function colWidthPx() {
    if (!gridRef.current) return 100;
    return (gridRef.current.clientWidth - GUTTER) / days.length;
  }

  function colIndexFromClientX(clientX: number) {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left - GUTTER;
    const idx = Math.floor(x / colWidthPx());
    return Math.min(days.length - 1, Math.max(0, idx));
  }

  function startMove(e: React.PointerEvent, ev: Event, colIndex: number) {
    e.preventDefault();
    const startY = e.clientY;
    const origS = minutesOfDay(ev.startsAt);
    const origE = minutesOfDay(ev.endsAt);
    const duration = origE - origS;
    const origDateKey = dateKeyOf(ev.startsAt);
    setDrag({ type: 'move', eventId: ev.id, s: origS, e: origE, colIndex, duration, origDateKey });

    function onMove(pe: PointerEvent) {
      const dy = pe.clientY - startY;
      const deltaMin = Math.round(dy / PX_PER_MIN / 15) * 15;
      let newS = origS + deltaMin;
      newS = Math.max(0, Math.min(1440 - duration, newS));
      const newCol = colIndexFromClientX(pe.clientX);
      setDrag((prev) => (prev && prev.type === 'move' ? { ...prev, s: newS, e: newS + duration, colIndex: newCol } : prev));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag((prev) => {
        if (prev && prev.type === 'move') {
          const newDateKey = days[prev.colIndex] ?? origDateKey;
          const startsAt = toUtcIso(newDateKey, prev.s);
          const endsAt = toUtcIso(newDateKey, prev.e);
          const dateChanged = newDateKey !== origDateKey;
          dispatch({
            type: 'PATCH_EVENT',
            id: ev.id,
            changes: { startsAt, endsAt },
            toast: dateChanged ? 'Evento movido' : 'Evento reagendado',
          });
          pushUpdate({ ...ev, startsAt, endsAt });
        }
        return null;
      });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startResize(e: React.PointerEvent, ev: Event, colIndex: number) {
    e.preventDefault();
    const startY = e.clientY;
    const origS = minutesOfDay(ev.startsAt);
    const origE = minutesOfDay(ev.endsAt);
    setDrag({ type: 'resize', eventId: ev.id, s: origS, e: origE, colIndex, origEnd: origE });

    function onMove(pe: PointerEvent) {
      const dy = pe.clientY - startY;
      const deltaMin = Math.round(dy / PX_PER_MIN / 15) * 15;
      const newE = Math.max(origS + 15, Math.min(1440, origE + deltaMin));
      setDrag((prev) => (prev && prev.type === 'resize' ? { ...prev, e: newE } : prev));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag((prev) => {
        if (prev && prev.type === 'resize') {
          const dateKey = dateKeyOf(ev.startsAt);
          const endsAt = toUtcIso(dateKey, prev.e);
          dispatch({ type: 'PATCH_EVENT', id: ev.id, changes: { endsAt }, toast: 'Duração ajustada' });
          pushUpdate({ ...ev, endsAt });
        }
        return null;
      });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function openCreateAt(dateKey: string, startMin: number) {
    dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(dateKey, startMin) });
  }

  function handleDrop(e: React.DragEvent, dateKey: string, startMin: number) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('application/x-aether-task');
    if (!taskId) return;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const snapped = Math.round(startMin / 15) * 15;
    const startsAt = toUtcIso(dateKey, snapped);
    const endsAt = toUtcIso(dateKey, snapped + task.dur);
    const event: Event = {
      id: `task-${task.id}-${Date.now()}`,
      title: task.title,
      calId: task.calId,
      startsAt,
      endsAt,
      timeZone: 'America/Sao_Paulo',
      allDay: false,
      notes: `Time-block da tarefa · ${task.tag} · prioridade ${task.prio}`,
      fromTaskId: task.id,
      src: 'local',
    };
    dispatch({ type: 'SCHEDULE_TASK', taskId: task.id, event });
    pushCreate(event);
  }

  const today = todayKey();
  const now = state.now;

  return (
    <div className="flex-1 flex flex-col min-h-0" onClick={() => dispatch({ type: 'SET_SELECTED', id: null })}>
      {/* Área rolável — cabeçalho e grade ficam no MESMO container rolável
          (cabeçalho com sticky) pra nunca desalinhar: se ficassem em
          containers separados, a barra de rolagem vertical (que só existe
          na grade) encolhe as colunas de baixo sem encolher as de cima,
          e as linhas verticais vão desalinhando da esquerda pra direita. */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div
          className="flex border-b sticky top-0 z-20"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <div style={{ width: GUTTER }} className="flex items-end justify-center pb-1 shrink-0">
            <span className="text-[9px] font-mono-ae" style={{ color: 'var(--text3)' }}>
              GMT-3
            </span>
          </div>
          {days.map((dateKey) => {
            const isToday = dateKey === today;
            const allDayEvents = (eventsByDay.get(dateKey) ?? []).filter((ev) => ev.allDay);
            const w = weatherOf(dateKey);
            return (
              <div
                key={dateKey}
                className="flex-1 min-w-0 border-r px-2 pt-2 pb-1.5"
                style={{
                  borderColor: 'var(--border)',
                  background: isToday ? 'color-mix(in oklab, var(--accent) 6%, var(--bg))' : undefined,
                  boxShadow: isToday ? 'inset 0 -2px 0 0 var(--accent)' : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: 'var(--text3)' }}
                    >
                      {dowAbbr(dateKey)}
                    </span>
                    <span
                      className="text-[16px] font-semibold rounded-[8px]"
                      style={
                        isToday
                          ? { background: 'var(--accent)', color: 'var(--accentText)', padding: '0 6px' }
                          : { color: 'var(--text)' }
                      }
                    >
                      {dayNum(dateKey)}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                    {w.icon} {w.temp}°
                  </span>
                </div>
                {allDayEvents.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1.5">
                    {allDayEvents.map((ev) => {
                      const cal = calendarOf(state, ev.calId);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_SELECTED', id: ev.id });
                          }}
                          className="text-[11px] font-semibold rounded-[6px] px-[7px] py-[3px] truncate cursor-pointer"
                          style={{
                            background: eventBg(cal?.color ?? 'var(--accent)'),
                            borderLeft: `3px solid ${cal?.color}`,
                          }}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {state.workOnly && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WORK_ONLY' })}
            className="w-full text-left text-[11px] pl-[66px] py-1.5"
            style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
          >
            00:00 – 07:00 oculto · clique para expandir
          </button>
        )}
        <div ref={gridRef} className="flex relative" style={{ height: visibleHours.length * ROW_H }}>
          {/* Gutter de horas */}
          <div style={{ width: GUTTER }} className="relative shrink-0">
            {visibleHours.map((h) => (
              <div key={h} className="relative" style={{ height: ROW_H }}>
                <span
                  className="absolute font-mono-ae text-[11px]"
                  style={{ top: -7, right: 8, color: 'var(--text3)' }}
                >
                  {hm(h * 60, state.settings.timeFormat)}
                </span>
              </div>
            ))}
          </div>

          {/* Colunas */}
          {days.map((dateKey, colIndex) => {
            const isToday = dateKey === today;
            const dayEvents = (eventsByDay.get(dateKey) ?? []).filter((ev) => !ev.allDay);
            const laidOut = layout(dayEvents)
              .map((b) => clipToWindow(b, H0, H1))
              .filter((b): b is NonNullable<typeof b> => b !== null);

            return (
              <div
                key={dateKey}
                className="flex-1 min-w-0 border-r relative"
                style={{ borderColor: 'var(--border)', background: isToday ? 'color-mix(in oklab, var(--accent) 9%, transparent)' : undefined }}
                onDoubleClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const min = H0 + Math.round(y / PX_PER_MIN / 15) * 15;
                  openCreateAt(dateKey, min);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const min = H0 + Math.round(y / PX_PER_MIN / 15) * 15;
                  handleDrop(e, dateKey, min);
                }}
              >
                {visibleHours.map((h) => (
                  <div
                    key={h}
                    style={{
                      height: ROW_H,
                      borderBottom: '1px solid color-mix(in oklab, var(--border) 60%, transparent)',
                      background: h < 8 || h >= 19 ? 'color-mix(in oklab, var(--text3) 5%, transparent)' : undefined,
                    }}
                  />
                ))}

                {isToday && now >= H0 && now < H1 && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: (now - H0) * PX_PER_MIN, borderTop: '2px solid var(--now-line)', zIndex: 20 }}
                  >
                    <span
                      className="absolute -left-[3.5px] -top-[4px] w-[7px] h-[7px] rounded-full"
                      style={{ background: 'var(--now-line)' }}
                    />
                  </div>
                )}

                {laidOut.map((b) => {
                  const isDragging = drag !== null && drag.eventId === b.event.id;
                  const displayColIndex = isDragging && drag ? drag.colIndex : colIndex;
                  if (isDragging && displayColIndex !== colIndex) return null;
                  const s = isDragging && drag ? drag.s : b.s;
                  const e = isDragging && drag ? drag.e : b.e;
                  const cal = calendarOf(state, b.event.calId);
                  return (
                    <EventBlock
                      key={b.event.id}
                      event={b.event}
                      top={(s - H0) * PX_PER_MIN}
                      height={(e - s) * PX_PER_MIN - 2}
                      left={`${b.lane * (100 / b.lanes)}%`}
                      width={`${100 / b.lanes - 1.5}%`}
                      color={cal?.color ?? 'var(--accent)'}
                      calendarName={cal?.name}
                      lanes={b.lanes}
                      selected={state.selected === b.event.id}
                      dragging={isDragging}
                      onSelect={() => dispatch({ type: 'SET_SELECTED', id: b.event.id })}
                      onPointerDownMove={(e) => startMove(e, b.event, colIndex)}
                      onPointerDownResize={(e) => startResize(e, b.event, colIndex)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        {state.workOnly && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WORK_ONLY' })}
            className="w-full text-left text-[11px] pl-[66px] py-1.5"
            style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
          >
            20:00 – 24:00 oculto · clique para expandir
          </button>
        )}
      </div>
    </div>
  );
}
