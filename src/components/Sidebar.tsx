import { useEffect, useState } from 'react';
import { Check, Plus, X, Repeat, ChevronDown } from 'lucide-react';
import { useStore } from '../store/store';
import { hm, todayKey } from '../lib/dates';
import { prioColor } from '../lib/style';
import { MiniCalendar } from './MiniCalendar';
import type { Task, TaskPriority } from '../lib/types';

const DOW_SHORT_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const PRIOS: TaskPriority[] = ['alta', 'média', 'baixa'];

function workDaysLabel(days: number[]): string {
  if (days.length === 0) return 'nenhum dia';
  if (days.length === 7) return 'todos os dias';
  const sorted = [...days].sort();
  // caso comum: intervalo contínuo (ex: seg a sex) — mostra como faixa
  const isRange = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isRange && sorted.length > 1) {
    return `${DOW_SHORT_PT[sorted[0]]} a ${DOW_SHORT_PT[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => DOW_SHORT_PT[d]).join(', ');
}

const CALENDAR_COLOR_PRESETS = [
  '#0284c7', // azul
  '#0891b2', // ciano
  '#0d9488', // teal
  '#16a34a', // verde
  '#65a30d', // lima
  '#ca8a04', // âmbar
  '#ea580c', // laranja
  '#dc2626', // vermelho
  '#e11d48', // rosa-vermelho
  '#db2777', // rosa
  '#c026d3', // magenta
  '#9333ea', // roxo
  '#7c3aed', // violeta
  '#4f46e5', // índigo
];

const CALENDAR_ICON_PRESETS = ['💼', '🏠', '👨‍👩‍👧', '❤️', '🎓', '✈️', '🏋️', '🎯', '📚', '🎉', '💰', '🐾'];

function startTouchDrag(e: React.PointerEvent, taskId: string, title: string) {
  const ghost = document.createElement('div');
  ghost.textContent = title;
  Object.assign(ghost.style, {
    position: 'fixed',
    zIndex: '200',
    pointerEvents: 'none',
    left: `${e.clientX + 14}px`,
    top: `${e.clientY + 14}px`,
    padding: '6px 10px',
    borderRadius: '8px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text)',
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(ghost);

  function onMove(ev: PointerEvent) {
    ghost.style.left = `${ev.clientX + 14}px`;
    ghost.style.top = `${ev.clientY + 14}px`;
  }
  function onUp(ev: PointerEvent) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    ghost.remove();
    window.dispatchEvent(
      new CustomEvent('aether:touch-drop-task', {
        detail: { taskId, clientX: ev.clientX, clientY: ev.clientY },
      }),
    );
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

export function Sidebar({ eventCountByCal }: { eventCountByCal: Record<string, number> }) {
  const { state, dispatch } = useStore();
  const [addingSet, setAddingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [workHoursOpen, setWorkHoursOpen] = useState(false);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [prio, setPrio] = useState<TaskPriority>('média');
  const [dur, setDur] = useState(30);
  const [tag, setTag] = useState('');
  const [taskCalId, setTaskCalId] = useState('work');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurDows, setRecurDows] = useState<number[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const overlayMode = state.w < 980;

  useEffect(() => {
    function onRequestAdd() {
      dispatch({ type: 'SET_SIDEBAR', open: true });
      setAdding(true);
    }
    window.addEventListener('aether:add-task', onRequestAdd);
    return () => window.removeEventListener('aether:add-task', onRequestAdd);
  }, [dispatch]);

  useEffect(() => {
    function onOpenTasks() {
      dispatch({ type: 'SET_SIDEBAR', open: true });
    }
    window.addEventListener('aether:open-tasks', onOpenTasks);
    return () => window.removeEventListener('aether:open-tasks', onOpenTasks);
  }, [dispatch]);

  function confirmAddSet() {
    if (newSetName.trim()) {
      dispatch({ type: 'ADD_CALENDAR_SET', name: newSetName });
    }
    setNewSetName('');
    setAddingSet(false);
  }

  function resetTaskForm() {
    setTitle('');
    setPrio('média');
    setDur(30);
    setTag('');
    setDueDate('');
    setRecurring(false);
    setRecurDows([]);
    setAdding(false);
  }

  function submitTask() {
    if (!title.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      prio,
      dur: Math.max(5, dur || 30),
      tag: tag.trim() || 'Geral',
      calId: taskCalId,
      done: false,
      dueDate: dueDate || undefined,
      recurring: recurring && recurDows.length > 0 ? recurDows : undefined,
    };
    dispatch({ type: 'ADD_TASK', task });
    resetTaskForm();
  }

  const visibleTasks = state.tasks.filter((t) => !t.archived);
  const doneCount = visibleTasks.filter((t) => t.done).length;
  const totalCount = visibleTasks.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return (
    <>
      {overlayMode && state.sidebarOpen && (
        <div
          className="fixed inset-0 z-20"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => dispatch({ type: 'SET_SIDEBAR', open: false })}
        />
      )}
      <aside
        className={`dark w-[268px] shrink-0 overflow-y-auto flex flex-col p-4 border-r ${
          overlayMode ? 'fixed inset-y-0 left-0 z-30 transition-transform' : 'relative'
        }`}
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: overlayMode ? 'var(--shadow)' : undefined,
          transform: overlayMode ? (state.sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
          display: overlayMode && !state.sidebarOpen ? 'none' : 'flex',
        }}
      >
        <MiniCalendar />

        <SectionDivider />

        <section>
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
                Progresso do dia
              </span>
              <span className="text-[11px] font-mono-ae" style={{ color: 'var(--text2)' }}>
                {doneCount}/{totalCount}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'var(--gold)' }} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <SectionTitle>Tarefas</SectionTitle>
            <button
              onClick={() => setAdding((v) => !v)}
              className="w-5 h-5 rounded-[5px] grid place-items-center hover:[background:var(--surface2)]"
              style={{ color: adding ? 'var(--accent)' : 'var(--text3)' }}
              aria-label="Nova tarefa"
            >
              <Plus size={13} />
            </button>
          </div>

          {adding && (
            <div className="rounded-[9px] p-2.5 mb-3 flex flex-col gap-2" style={{ background: 'var(--surface2)' }}>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitTask();
                  if (e.key === 'Escape') resetTaskForm();
                }}
                placeholder="Nome da tarefa"
                className="rounded-[7px] px-2 py-[6px] text-[12.5px] outline-none"
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              />
              <div className="flex gap-1.5">
                {PRIOS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrio(p)}
                    className="flex-1 text-[10.5px] font-semibold uppercase rounded-[6px] py-1"
                    style={
                      prio === p
                        ? { background: prioColor(p), color: 'var(--bg)' }
                        : { background: 'var(--surface)', color: 'var(--text3)' }
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={dur}
                  onChange={(e) => setDur(parseInt(e.target.value, 10))}
                  className="w-16 rounded-[7px] px-2 py-[6px] text-[12px] outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--text)' }}
                />
                <span className="text-[11px] self-center" style={{ color: 'var(--text3)' }}>
                  min
                </span>
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Tag"
                  className="flex-1 rounded-[7px] px-2 py-[6px] text-[12px] outline-none min-w-0"
                  style={{ background: 'var(--surface)', color: 'var(--text)' }}
                />
              </div>
              <select
                value={taskCalId}
                onChange={(e) => setTaskCalId(e.target.value)}
                className="rounded-[7px] px-2 py-[6px] text-[12px] outline-none"
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              >
                {state.calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div>
                <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                  Vencimento (opcional)
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-[7px] px-2 py-[6px] text-[12px] outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--text)' }}
                />
              </div>

              <button
                onClick={() => setRecurring((v) => !v)}
                className="flex items-center gap-2 text-[12px] w-fit"
                style={{ color: 'var(--text)' }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-[4px] grid place-items-center border"
                  style={{ background: recurring ? 'var(--accent)' : 'transparent', borderColor: recurring ? 'var(--accent)' : 'var(--border)' }}
                >
                  {recurring && <Check size={9} strokeWidth={3.5} color="white" />}
                </span>
                Repete toda semana
              </button>

              {recurring && (
                <div className="flex gap-1">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, dow) => {
                    const active = recurDows.includes(dow);
                    return (
                      <button
                        key={dow}
                        onClick={() =>
                          setRecurDows((prev) => (active ? prev.filter((d) => d !== dow) : [...prev, dow].sort()))
                        }
                        className="w-6 h-6 rounded-full text-[10px] font-semibold shrink-0"
                        style={
                          active
                            ? { background: 'var(--accent)', color: 'var(--accentText)' }
                            : { background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-1.5">
                <button
                  onClick={resetTaskForm}
                  className="flex-1 rounded-[7px] py-[6px] text-[12px] font-medium"
                  style={{ background: 'var(--surface)', color: 'var(--text2)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={submitTask}
                  className="flex-1 rounded-[7px] py-[6px] text-[12px] font-semibold"
                  style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
              arraste p/ agendar
            </span>
          </div>
          {visibleTasks.length === 0 && (
            <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text3)' }}>
              Nenhuma tarefa pendente
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            {state.calendars.map((cal) => {
              const tasksForCal = visibleTasks.filter((t) => t.calId === cal.id);
              if (tasksForCal.length === 0) return null;
              const collapsed = collapsedGroups.includes(cal.id);
              return (
                <div key={cal.id}>
                  <button
                    onClick={() =>
                      setCollapsedGroups((prev) => (collapsed ? prev.filter((id) => id !== cal.id) : [...prev, cal.id]))
                    }
                    className="w-full flex items-center gap-2 mb-1 rounded-[6px] px-1 py-[3px] hover:[background:var(--surface2)]"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cal.color }} />
                    <span className="text-[12px] font-semibold flex-1 text-left truncate" style={{ color: 'var(--text)' }}>
                      {cal.name}
                    </span>
                    <span className="text-[10px] font-mono-ae shrink-0" style={{ color: 'var(--text3)' }}>
                      {tasksForCal.length}
                    </span>
                    <ChevronDown
                      size={12}
                      className="shrink-0 transition-transform"
                      style={{ color: 'var(--text3)', transform: collapsed ? 'rotate(-90deg)' : undefined }}
                    />
                  </button>
                  {!collapsed && (
                    <div className="flex flex-col gap-0.5">
                      {tasksForCal.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-aether-task', task.id);
                            e.dataTransfer.effectAllowed = 'copyMove';
                          }}
                          onPointerDown={(e) => {
                            if (e.pointerType === 'touch') startTouchDrag(e, task.id, task.title);
                          }}
                          className="rounded-[7px] pl-1.5 pr-2 py-[6px] cursor-grab select-none hover:[background:var(--surface2)] hover:scale-[1.015] flex items-center gap-2 group transition-transform"
                          style={{ opacity: task.done ? 0.45 : 1, touchAction: 'none' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'TOGGLE_TASK', id: task.id });
                            }}
                            className="w-[15px] h-[15px] rounded-full border grid place-items-center shrink-0"
                            style={{
                              borderColor: task.done ? cal.color : 'var(--text3)',
                              background: task.done ? cal.color : 'transparent',
                            }}
                            aria-label={task.done ? 'Marcar como pendente' : 'Marcar como concluída'}
                          >
                            {task.done && <Check size={9} strokeWidth={3.5} color="white" />}
                          </button>
                          {!!task.recurring && <Repeat size={9} className="shrink-0" style={{ color: 'var(--text3)' }} />}
                          <span
                            className="text-[12px] font-medium truncate flex-1"
                            style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}
                          >
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <span
                              className="text-[10px] font-mono-ae shrink-0"
                              style={{ color: task.dueDate < todayKey() && !task.done ? 'var(--danger)' : 'var(--text3)' }}
                              title={`Vence ${task.dueDate}`}
                            >
                              {task.dueDate.slice(5)}
                            </span>
                          )}
                          <span className="text-[10px] font-mono-ae shrink-0" style={{ color: 'var(--text3)' }}>
                            {task.dur}m
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'REMOVE_TASK', id: task.id });
                            }}
                            className="w-4 h-4 rounded-[4px] grid place-items-center shrink-0 opacity-0 group-hover:opacity-100"
                            style={{ color: 'var(--text3)' }}
                            aria-label="Excluir tarefa"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'analytics' })}
            className="mt-2 text-[12px] font-medium text-left rounded-[7px] px-2 py-1.5 hover:[background:var(--surface2)]"
            style={{ color: 'var(--gold)' }}
          >
            Ver Analytics completo →
          </button>
        </section>

        <SectionDivider />

        <section>
          <SectionTitle>Calendar sets</SectionTitle>
          <div className="mt-2 flex flex-col gap-0.5">
            {state.calendarSets.map((s) => {
              const active = state.set === s.id;
              return (
                <div key={s.id} className="relative group">
                  <button
                    onClick={() => dispatch({ type: 'SET_CAL_SET', set: s.id })}
                    className="w-full text-left rounded-[7px] pl-2.5 pr-2.5 py-[6px] text-[13px] font-medium"
                    style={
                      active
                        ? { background: 'var(--accent)', color: 'var(--accentText)' }
                        : { color: 'var(--text2)' }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = 'var(--surface2)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {s.name}
                  </button>
                  {!s.builtin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'REMOVE_CALENDAR_SET', id: s.id });
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-1.5 w-5 h-5 rounded-[5px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: active ? 'var(--accentText)' : 'var(--text3)' }}
                      aria-label={`Excluir set ${s.name}`}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              );
            })}
            {addingSet ? (
              <input
                autoFocus
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAddSet();
                  if (e.key === 'Escape') {
                    setAddingSet(false);
                    setNewSetName('');
                  }
                }}
                onBlur={confirmAddSet}
                placeholder="Nome do set"
                className="rounded-[7px] px-2.5 py-[6px] text-[13px] outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              />
            ) : (
              <button
                onClick={() => setAddingSet(true)}
                className="text-left rounded-[7px] px-2.5 py-[6px] text-[12px] font-medium flex items-center gap-1.5"
                style={{ color: 'var(--text3)' }}
                title="Salvar seleção atual de calendários como um novo set"
              >
                <Plus size={12} />
                Novo set
              </button>
            )}
          </div>
        </section>

        <SectionDivider />

        <section>
          <SectionTitle>Calendários</SectionTitle>
          <div className="mt-2 flex flex-col">
            {state.calendars.map((c) => (
              <div key={c.id} className="relative flex items-center gap-2.5 rounded-[7px] px-1.5 py-[7px] hover:[background:var(--surface2)]">
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_CAL', id: c.id })}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  style={{ opacity: c.visible ? 1 : 0.5 }}
                >
                  <span
                    className="w-4 h-4 rounded-[5px] grid place-items-center shrink-0"
                    style={{
                      border: `1.5px solid ${c.color}`,
                      background: c.visible ? c.color : 'transparent',
                    }}
                  >
                    {c.visible && <Check size={12} strokeWidth={3.5} color="white" />}
                  </span>
                  <span className="text-[13px] font-medium flex-1 truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                    {c.icon && <span aria-hidden="true">{c.icon}</span>}
                    {c.name}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerFor(colorPickerFor === c.id ? null : c.id);
                  }}
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ background: c.color, boxShadow: '0 0 0 2px var(--surface)' }}
                  aria-label={`Personalizar ${c.name}`}
                  title="Cor e ícone"
                />
                <span className="text-[11px] font-mono-ae shrink-0" style={{ color: 'var(--text3)' }}>
                  {eventCountByCal[c.id] ?? 0}
                </span>

                {colorPickerFor === c.id && (
                  <div
                    className="absolute right-0 top-full mt-1 z-30 rounded-[10px] border p-2.5 w-[192px]"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text3)' }}>
                      Cor
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {CALENDAR_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          onClick={() => dispatch({ type: 'UPDATE_CALENDAR_COLOR', id: c.id, color })}
                          className="w-6 h-6 rounded-full grid place-items-center"
                          style={{ background: color }}
                          aria-label={color}
                        >
                          {c.color === color && <Check size={12} strokeWidth={3.5} color="white" />}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text3)' }}>
                      Ícone
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_CALENDAR_ICON', id: c.id, icon: undefined })}
                        className="w-6 h-6 rounded-[6px] grid place-items-center text-[11px]"
                        style={{ background: !c.icon ? 'var(--surface2)' : 'transparent', color: 'var(--text3)' }}
                        aria-label="Nenhum ícone"
                        title="Nenhum"
                      >
                        <X size={12} />
                      </button>
                      {CALENDAR_ICON_PRESETS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => dispatch({ type: 'UPDATE_CALENDAR_ICON', id: c.id, icon })}
                          className="w-6 h-6 rounded-[6px] grid place-items-center text-[13px]"
                          style={{ background: c.icon === icon ? 'var(--surface2)' : 'transparent' }}
                          aria-label={icon}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-auto pt-4 relative">
          <SectionDivider />
          <button
            onClick={() => setWorkHoursOpen((v) => !v)}
            className="w-full text-left rounded-[7px] -mx-1.5 px-1.5 py-1 hover:[background:var(--surface2)]"
          >
            <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text2)' }}>
              Horário de trabalho
            </div>
            <div className="text-[11px] font-mono-ae mb-2" style={{ color: 'var(--text3)' }}>
              {hm(state.settings.workStart)} – {hm(state.settings.workEnd)} · {workDaysLabel(state.settings.workDays)}
            </div>
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WORK_ONLY' })}
            className="w-full rounded-[7px] px-2.5 py-[7px] text-[12px] font-medium"
            style={
              state.workOnly
                ? { background: 'var(--accent)', color: 'var(--accentText)' }
                : { background: 'var(--surface2)', color: 'var(--text2)' }
            }
          >
            {state.workOnly ? 'Mostrar 24 horas' : 'Colapsar fora do horário'}
          </button>

          {workHoursOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 z-30 w-full rounded-[12px] border p-3"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="time"
                  value={hm(state.settings.workStart)}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    if (!isNaN(h)) dispatch({ type: 'UPDATE_SETTINGS', changes: { workStart: h * 60 + m } });
                  }}
                  className="flex-1 min-w-0 text-[12px] rounded-[7px] px-2 py-1.5 outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                />
                <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                  até
                </span>
                <input
                  type="time"
                  value={hm(state.settings.workEnd)}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    if (!isNaN(h)) dispatch({ type: 'UPDATE_SETTINGS', changes: { workEnd: h * 60 + m } });
                  }}
                  className="flex-1 min-w-0 text-[12px] rounded-[7px] px-2 py-1.5 outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                />
              </div>
              <div className="flex gap-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, dow) => {
                  const active = state.settings.workDays.includes(dow);
                  return (
                    <button
                      key={dow}
                      onClick={() => {
                        const next = active
                          ? state.settings.workDays.filter((d) => d !== dow)
                          : [...state.settings.workDays, dow].sort();
                        dispatch({ type: 'UPDATE_SETTINGS', changes: { workDays: next } });
                      }}
                      className="flex-1 h-7 rounded-[6px] text-[10px] font-semibold"
                      style={
                        active
                          ? { background: 'var(--accent)', color: 'var(--accentText)' }
                          : { background: 'var(--surface2)', color: 'var(--text3)' }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setWorkHoursOpen(false)}
                className="w-full mt-3 text-[12px] font-medium rounded-[7px] py-1.5"
                style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
              >
                Pronto
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SectionDivider() {
  return <div className="h-px my-4" style={{ background: 'var(--border)', opacity: 0.6 }} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
      {children}
    </div>
  );
}
