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
import { hapticTick } from '../../lib/haptics';
import { isGoogleConfigured } from '../../lib/googleApi';
import { duplicateEvent } from '../../lib/duplicateEvent';
import { EventBlock } from '../EventBlock';
import type { Event } from '../../lib/types';

const GUTTER = 60;

type DragState =
  | { type: 'move'; eventId: string; event: Event; s: number; e: number; colIndex: number; duration: number; origDateKey: string }
  | { type: 'resize'; eventId: string; event: Event; s: number; e: number; colIndex: number; origEnd: number };

export function DayWeekGrid() {
  const { state, dispatch } = useStore();
  const { pushUpdate, pushCreate, pushDelete } = useGoogleSync();
  const allEvents = useAllEvents(state);
  const rawVisibleEvents = useVisibleEvents(state, allEvents);
  const visibleEvents = useMemo(() => {
    const s = state.settings;
    return rawVisibleEvents.filter((ev) => {
      if (!s.calFilterTasks && ev.fromTaskId) return false;
      if (!s.calFilterEvents && !ev.fromTaskId) return false;
      if (!s.calFilterAllDay && ev.allDay) return false;
      if (s.calHideCompletedTasks && ev.done) return false;
      return true;
    });
  }, [rawVisibleEvents, state.settings.calFilterTasks, state.settings.calFilterEvents, state.settings.calFilterAllDay, state.settings.calHideCompletedTasks]);
  const ROW_H = state.settings.density === 'compact' ? 40 : 56;
  const PX_PER_MIN = ROW_H / 60;

  const days = useMemo(() => {
    if (state.view === 'day') return [state.cursor];
    const narrow = state.w < 720;
    if (narrow) return [0, 1, 2].map((i) => addDays(state.cursor, i));
    const start = startOfWeekKey(state.cursor, state.settings.weekStartsOn);
    const all = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return state.settings.showWeekends ? all : all.filter((d) => dowOf(d) !== 0 && dowOf(d) !== 6);
  }, [state.view, state.cursor, state.w, state.settings.weekStartsOn, state.settings.showWeekends]);

  const H0 = state.workOnly ? state.settings.workStart : 0;  const H1 = state.workOnly ? state.settings.workEnd : 24 * 60;
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
  const [selectDrag, setSelectDrag] = useState<{ colIndex: number; startMin: number; endMin: number } | null>(null);
  const [pullDist, setPullDist] = useState(0);
  const [quickMenu, setQuickMenu] = useState<{ event: Event; x: number; y: number } | null>(null);
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
    const isTouch = e.pointerType === 'touch';
    const startY = e.clientY;
    const origS = minutesOfDay(ev.startsAt);
    const origE = minutesOfDay(ev.endsAt);
    const duration = origE - origS;
    const origDateKey = dateKeyOf(ev.startsAt);
    setDrag({ type: 'move', eventId: ev.id, event: ev, s: origS, e: origE, colIndex, duration, origDateKey });

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
          // sem movimento real — é um clique/toque simples, não um arrasto.
          // Seleciona o evento diretamente aqui em vez de confiar no 'click'
          // nativo do navegador disparar depois do pointerdown: chamar
          // preventDefault() no pointerdown (necessário pra poder arrastar)
          // pode suprimir o click sintético subsequente em alguns navegadores,
          // o que deixava o evento "inclicável" via mouse.
          if (prev.s === origS && newDateKey === origDateKey) {
            dispatch({ type: 'SET_SELECTED', id: ev.id });
            return null;
          }
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
          if (isTouch) hapticTick();
        }
        return null;
      });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startResize(e: React.PointerEvent, ev: Event, colIndex: number) {
    e.preventDefault();
    const isTouch = e.pointerType === 'touch';
    const startY = e.clientY;
    const origS = minutesOfDay(ev.startsAt);
    const origE = minutesOfDay(ev.endsAt);
    setDrag({ type: 'resize', eventId: ev.id, event: ev, s: origS, e: origE, colIndex, origEnd: origE });

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
          if (prev.e === origE) return null; // sem alteração real, não faz nada
          const dateKey = dateKeyOf(ev.startsAt);
          const endsAt = toUtcIso(dateKey, prev.e);
          dispatch({ type: 'PATCH_EVENT', id: ev.id, changes: { endsAt }, toast: 'Duração ajustada' });
          pushUpdate({ ...ev, endsAt });
          if (isTouch) hapticTick();
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

  function scheduleTaskAt(taskId: string, dateKey: string, startMin: number) {
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

  function handleDrop(e: React.DragEvent, dateKey: string, startMin: number) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('application/x-aether-task');
    if (!taskId) return;
    scheduleTaskAt(taskId, dateKey, startMin);
  }

  // Drag-and-drop nativo (HTML5) só funciona com mouse — em touch (tablet/
  // celular) o navegador simplesmente ignora. A Sidebar (onde as tarefas
  // moram) detecta toque e dispara este evento customizado com a posição
  // do dedo; aqui a gente traduz pra data+horário do mesmo jeito que já
  // fazíamos com o mouse.
  useEffect(() => {
    function onTouchDrop(e: globalThis.Event) {
      const { taskId, clientX, clientY } = (e as CustomEvent).detail as { taskId: string; clientX: number; clientY: number };
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
      const colIndex = colIndexFromClientX(clientX);
      const dateKey = days[colIndex];
      if (!dateKey) return;
      const y = clientY - rect.top;
      const min = H0 + Math.round(y / PX_PER_MIN / 15) * 15;
      scheduleTaskAt(taskId, dateKey, min);
      hapticTick();
    }
    window.addEventListener('aether:touch-drop-task', onTouchDrop);
    return () => window.removeEventListener('aether:touch-drop-task', onTouchDrop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, state.tasks, H0, PX_PER_MIN]);

  // Deslizar horizontal pra trocar de dia (só na visão diária, mobile/tablet
  // — na semana teria colunas demais pra fazer sentido um swipe simples).
  // Só intercepta se o gesto for claramente mais horizontal que vertical, e
  // só decide isso depois de um pouco de movimento — senão atrapalharia a
  // rolagem vertical normal da grade, que é o gesto mais comum ali.
  useEffect(() => {
    if (state.view !== 'day' || state.w >= 900) return;
    const el = scrollRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let decided = false;
    let horizontal = false;

    function onDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return;
      if (e.clientX < 24) return; // essa faixa é reservada pro gesto de abrir a sidebar (ver App.tsx)
      if ((e.target as HTMLElement).closest('[role="button"]')) return; // não intercepta toque num evento
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      decided = false;
      horizontal = false;
    }
    function onMove(e: PointerEvent) {
      if (!tracking) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!decided && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy) * 1.3;
      }
      if (decided && horizontal && e.cancelable) e.preventDefault();
    }
    function onUp(e: PointerEvent) {
      if (!tracking) return;
      tracking = false;
      if (!decided || !horizontal) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 60) {
        dispatch({ type: 'NAV', dir: dx < 0 ? 1 : -1 });
      }
    }
    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp, { passive: true });
    el.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [state.view, state.w, dispatch]);

  // Puxar pra atualizar (pull-to-refresh): só faz sentido com o Google
  // conectado (é o que existe pra "atualizar"), e só inicia se o puxão
  // começar com a grade já no topo — senão brigaria com a rolagem normal.
  useEffect(() => {
    if (!isGoogleConfigured() || state.google !== 'on' || state.w >= 900) return;
    const el = scrollRef.current;
    if (!el) return;

    let startY = 0;
    let tracking = false;
    let decided = false;
    let pulling = false;

    function onDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return;
      if (el!.scrollTop > 4) return;
      startY = e.clientY;
      tracking = true;
      decided = false;
      pulling = false;
    }
    function onMove(e: PointerEvent) {
      if (!tracking) return;
      const dy = e.clientY - startY;
      if (!decided && Math.abs(dy) > 10) {
        decided = true;
        pulling = dy > 0 && el!.scrollTop <= 4;
      }
      if (decided && pulling) {
        if (e.cancelable) e.preventDefault();
        setPullDist(Math.min(80, dy * 0.5));
      }
    }
    function onUp() {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;
      setPullDist((d) => {
        if (d > 44) {
          window.dispatchEvent(new CustomEvent('aether:sync-now'));
          hapticTick();
        }
        return 0;
      });
    }
    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp, { passive: true });
    el.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [state.google, state.w]);

  const today = todayKey();
  const todayHabitsForStrip = state.habits.filter((h) => h.days.length === 0 || h.days.includes(new Date().getDay()));
  const now = state.now;

  const nextEvent = useMemo(() => {
    const todaysTimed = visibleEvents
      .filter((ev) => !ev.allDay && dateKeyOf(ev.startsAt) === today && minutesOfDay(ev.startsAt) > now)
      .sort((a, b) => minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt));
    return todaysTimed[0] ?? null;
  }, [visibleEvents, today, now]);

  return (
    <div className="flex-1 flex flex-col min-h-0" onClick={() => dispatch({ type: 'SET_SELECTED', id: null })}>
      {/* Área rolável — cabeçalho e grade ficam no MESMO container rolável
          (cabeçalho com sticky) pra nunca desalinhar: se ficassem em
          containers separados, a barra de rolagem vertical (que só existe
          na grade) encolhe as colunas de baixo sem encolher as de cima,
          e as linhas verticais vão desalinhando da esquerda pra direita. */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {pullDist > 0 && (
          <div
            className="absolute left-1/2 z-30 rounded-full px-3 py-1.5 text-[11px] font-medium animate-ae-in"
            style={{
              top: 8,
              transform: `translateX(-50%) scale(${Math.min(1, 0.7 + pullDist / 100)})`,
              opacity: Math.min(1, pullDist / 44),
              background: 'var(--surface)',
              color: pullDist > 44 ? 'var(--accent)' : 'var(--text3)',
              boxShadow: 'var(--shadow)',
            }}
          >
            {pullDist > 44 ? 'Solte para sincronizar' : 'Puxe para sincronizar'}
          </div>
        )}
        <div
          className="h-[2px] sticky top-0 z-30 shrink-0"
          style={{ background: 'var(--surface2)' }}
        >
          <div
            className="h-full"
            style={{ width: `${(now / 1440) * 100}%`, background: 'var(--now-line)', transition: 'width 30s linear' }}
          />
        </div>
        <div
          className="flex border-b sticky z-20"
          style={{ top: 2, borderColor: 'var(--border)', background: 'var(--bg)' }}
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
                          className="text-[11px] font-semibold rounded-full px-2.5 py-[3px] truncate cursor-pointer"
                          style={{
                            background: eventBg(cal?.color ?? 'var(--accent)', 18),
                            color: cal?.color,
                          }}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isToday && nextEvent && (
                  <div
                    className="mt-1.5 text-[10.5px] font-medium truncate rounded-[6px] px-1.5 py-[3px] w-fit max-w-full"
                    style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                    title={`Próximo: ${nextEvent.title} às ${hm(minutesOfDay(nextEvent.startsAt), state.settings.timeFormat)}`}
                  >
                    Próximo: {nextEvent.title} · {hm(minutesOfDay(nextEvent.startsAt), state.settings.timeFormat)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {state.settings.calFilterHabits && todayHabitsForStrip.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 border-b flex-wrap"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] shrink-0" style={{ color: 'var(--text3)' }}>
              Hábitos hoje
            </span>
            {todayHabitsForStrip.map((h) => {
              const done = h.doneDates.includes(today);
              return (
                <button
                  key={h.id}
                  onClick={() => dispatch({ type: 'TOGGLE_HABIT_TODAY', id: h.id })}
                  className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-medium"
                  style={
                    done
                      ? { background: 'var(--sync-ok)', color: 'white' }
                      : { background: 'var(--surface2)', color: 'var(--text2)' }
                  }
                >
                  <span>{h.icon}</span>
                  {h.title}
                </button>
              );
            })}
          </div>
        )}

        {state.workOnly && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WORK_ONLY' })}
            className="w-full text-left text-[11px] pl-[66px] py-1.5"
            style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
          >
            00:00 – {hm(H0)} oculto · clique para expandir
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
                onPointerDown={(e) => {
                  // Clicar e arrastar pra desenhar o horário direto na grade —
                  // só no mouse: em touch, o mesmo gesto já é usado pra rolar a
                  // grade verticalmente, então criar por arrasto ali causaria
                  // um evento fantasma toda vez que o usuário só quisesse rolar.
                  if (e.pointerType !== 'mouse') return;
                  if ((e.target as HTMLElement).closest('[role="button"]')) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const startMin = H0 + Math.round(((e.clientY - rect.top) / PX_PER_MIN) / 15) * 15;
                  let moved = false;
                  setSelectDrag({ colIndex, startMin, endMin: startMin + 15 });

                  function onMove(pe: PointerEvent) {
                    if (Math.abs(pe.clientY - e.clientY) > 6) moved = true;
                    const min = H0 + Math.round(((pe.clientY - rect.top) / PX_PER_MIN) / 15) * 15;
                    setSelectDrag((prev) => (prev ? { ...prev, endMin: Math.max(prev.startMin + 15, min) } : prev));
                  }
                  function onUp() {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                    setSelectDrag((prev) => {
                      if (prev && moved && prev.endMin - prev.startMin >= 15) {
                        dispatch({
                          type: 'OPEN_FORM',
                          form: emptyCreateForm(dateKey, prev.startMin, prev.endMin - prev.startMin),
                        });
                      }
                      return null;
                    });
                  }
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
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
                      borderBottom: '1px solid color-mix(in oklab, var(--border) 30%, transparent)',
                      background: h < 8 || h >= 19 ? 'color-mix(in oklab, var(--text3) 5%, transparent)' : undefined,
                    }}
                  />
                ))}

                {selectDrag && selectDrag.colIndex === colIndex && (
                  <div
                    className="absolute left-[2%] right-[2%] rounded-[7px] pointer-events-none flex items-start px-2 pt-1"
                    style={{
                      top: (selectDrag.startMin - H0) * PX_PER_MIN,
                      height: Math.max(4, (selectDrag.endMin - selectDrag.startMin) * PX_PER_MIN),
                      background: 'color-mix(in oklab, var(--accent) 22%, transparent)',
                      border: '1.5px dashed var(--accent)',
                    }}
                  >
                    <span className="text-[10px] font-mono-ae" style={{ color: 'var(--accent)' }}>
                      {hm(selectDrag.startMin)} – {hm(selectDrag.endMin)}
                    </span>
                  </div>
                )}

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

                {laidOut
                  .filter((b) => !(drag !== null && drag.eventId === b.event.id))
                  .map((b) => {
                    const cal = calendarOf(state, b.event.calId);
                    return (
                      <EventBlock
                        key={b.event.id}
                        event={b.event}
                        top={(b.s - H0) * PX_PER_MIN}
                        height={(b.e - b.s) * PX_PER_MIN - 2}
                        left={`${b.lane * (100 / b.lanes)}%`}
                        width={`${100 / b.lanes - 1.5}%`}
                        color={cal?.color ?? 'var(--accent)'}
                        calendarName={cal?.name}
                        lanes={b.lanes}
                        selected={state.selected === b.event.id}
                        dragging={false}
                        syncPending={state.pendingSyncIds.includes(b.event.id)}
                        onSelect={() => dispatch({ type: 'SET_SELECTED', id: b.event.id })}
                        onPointerDownMove={(e) => startMove(e, b.event, colIndex)}
                        onPointerDownResize={(e) => startResize(e, b.event, colIndex)}
                        onLongPress={(x, y) => setQuickMenu({ event: b.event, x, y })}
                      />
                    );
                  })}
              </div>
            );
          })}

          {/* Bloco sendo arrastado — desenhado numa camada única por cima de
              toda a grade (não dentro de uma coluna específica), pra poder
              seguir o dedo/mouse pra QUALQUER coluna, não só a original. Sem
              isso, mover pra outro dia fazia o bloco sumir no meio do
              arrasto (a coluna de origem escondia ele, mas nenhuma coluna
              nova sabia que devia desenhá-lo). */}
          {drag && (
            <EventBlock
              key={`ghost-${drag.eventId}`}
              event={drag.event}
              top={(drag.s - H0) * PX_PER_MIN}
              height={(drag.e - drag.s) * PX_PER_MIN - 2}
              left={`${GUTTER + drag.colIndex * colWidthPx()}px`}
              width={`${colWidthPx() - 3}px`}
              color={calendarOf(state, drag.event.calId)?.color ?? 'var(--accent)'}
              calendarName={calendarOf(state, drag.event.calId)?.name}
              lanes={1}
              selected={false}
              dragging
              onSelect={() => {}}
              onPointerDownMove={() => {}}
              onPointerDownResize={() => {}}
            />
          )}
        </div>
        {state.workOnly && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WORK_ONLY' })}
            className="w-full text-left text-[11px] pl-[66px] py-1.5"
            style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
          >
            {hm(H1)} – 24:00 oculto · clique para expandir
          </button>
        )}
      </div>

      {state.w >= 900 && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-2 border-t shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {state.calendars.map((cal) => (
              <span key={cal.id} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text2)' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cal.color }} />
                {cal.name}
              </span>
            ))}
          </div>
          {state.google === 'on' && (
            <span className="flex items-center gap-1.5 text-[11px] shrink-0" style={{ color: 'var(--text3)' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--sync-ok)' }} />
              Sincronizado agora há pouco
            </span>
          )}
        </div>
      )}

      {quickMenu && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setQuickMenu(null)} onPointerDown={() => setQuickMenu(null)} />
          <div
            className="fixed z-[71] rounded-[12px] border p-1.5 w-[168px] animate-ae-pop"
            style={{
              left: Math.min(quickMenu.x, window.innerWidth - 180),
              top: Math.min(quickMenu.y, window.innerHeight - 160),
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <button
              onClick={() => {
                const startMin = minutesOfDay(quickMenu.event.startsAt);
                const durationMin = minutesOfDay(quickMenu.event.endsAt) - startMin;
                dispatch({
                  type: 'OPEN_FORM',
                  form: {
                    ...emptyCreateForm(dateKeyOf(quickMenu.event.startsAt), startMin, durationMin, String(quickMenu.event.calId)),
                    mode: 'edit',
                    id: quickMenu.event.id,
                    title: quickMenu.event.title,
                    allDay: quickMenu.event.allDay,
                    location: quickMenu.event.location ?? '',
                    notes: quickMenu.event.notes ?? '',
                  },
                });
                setQuickMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 rounded-[8px] text-[13px] font-medium hover:[background:var(--surface2)]"
              style={{ color: 'var(--text)' }}
            >
              Editar
            </button>
            <button
              onClick={() => {
                const copy = duplicateEvent(quickMenu.event);
                dispatch({ type: 'ADD_EVENT', event: copy, toast: 'Evento duplicado' });
                pushCreate(copy);
                setQuickMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 rounded-[8px] text-[13px] font-medium hover:[background:var(--surface2)]"
              style={{ color: 'var(--text)' }}
            >
              Duplicar
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'REMOVE_EVENT', id: quickMenu.event.id, toast: 'Evento excluído' });
                pushDelete(quickMenu.event);
                setQuickMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 rounded-[8px] text-[13px] font-medium hover:[background:var(--surface2)]"
              style={{ color: 'var(--danger)' }}
            >
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
