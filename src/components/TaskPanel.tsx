import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X, Repeat, ChevronDown } from 'lucide-react';
import { useStore } from '../store/store';
import { useAllEvents } from '../store/selectors';
import { todayKey } from '../lib/dates';
import { prioColor } from '../lib/style';
import { weeklyStats, formatMinutes } from '../lib/analytics';
import type { Task, TaskPriority } from '../lib/types';

const PRIOS: TaskPriority[] = ['alta', 'média', 'baixa'];
const PRIO_RANK: Record<TaskPriority, number> = { alta: 0, média: 1, baixa: 2 };

function sortTasks(list: Task[], sortBy: 'prio' | 'dueDate' | 'title'): Task[] {
  const sorted = [...list];
  if (sortBy === 'prio') sorted.sort((a, b) => PRIO_RANK[a.prio] - PRIO_RANK[b.prio]);
  else if (sortBy === 'dueDate') sorted.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  else sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  return sorted;
}

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

/**
 * Painel de tarefas — usado em dois lugares: encaixado ao lado da grade na
 * página Calendário (compacto, pra arrastar rápido), e como conteúdo
 * principal da página Tarefas (com mais espaço). O mesmo componente serve
 * pros dois contextos; `showAddButton`/`title` ajustam a moldura.
 */
export function TaskPanel({
  title = 'Tarefas',
  onSelectTask,
  full,
}: {
  title?: string;
  onSelectTask?: (id: string) => void;
  full?: boolean;
}) {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const [adding, setAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [prio, setPrio] = useState<TaskPriority>('média');
  const [dur, setDur] = useState(30);
  const [tag, setTag] = useState('');
  const [taskCalId, setTaskCalId] = useState('work');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurDows, setRecurDows] = useState<number[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [tab, setTab] = useState<'hoje' | 'proximas' | 'projetos'>('projetos');
  const [prioFilter, setPrioFilter] = useState<TaskPriority | 'todas'>('todas');
  const [sortBy, setSortBy] = useState<'prio' | 'dueDate' | 'title'>('prio');

  useEffect(() => {
    function onRequestAdd() {
      setAdding(true);
    }
    window.addEventListener('aether:add-task', onRequestAdd);
    return () => window.removeEventListener('aether:add-task', onRequestAdd);
  }, []);

  function resetTaskForm() {
    setTaskTitle('');
    setPrio('média');
    setDur(30);
    setTag('');
    setDueDate('');
    setRecurring(false);
    setRecurDows([]);
    setAdding(false);
  }

  function submitTask() {
    if (!taskTitle.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
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

  const visibleTasksAll = state.tasks.filter((t) => !t.archived);
  const today = todayKey();
  const visibleTasks = useMemo(() => {
    let list = visibleTasksAll;
    if (full) {
      if (tab === 'hoje') list = list.filter((t) => !t.dueDate || t.dueDate <= today);
      else if (tab === 'proximas') list = list.filter((t) => !!t.dueDate && t.dueDate > today);
      if (prioFilter !== 'todas') list = list.filter((t) => t.prio === prioFilter);
    }
    return list;
  }, [visibleTasksAll, full, tab, prioFilter, today]);
  const doneCount = visibleTasksAll.filter((t) => t.done).length;
  const totalCount = visibleTasksAll.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  const stats = useMemo(() => weeklyStats(allEvents, state.tasks), [allEvents, state.tasks]);

  return (
    <div className="flex flex-col">
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
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
          {title}
        </span>
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
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
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

      {full && (
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center p-[2px] rounded-[8px]" style={{ background: 'var(--surface2)' }}>
            {(['hoje', 'proximas', 'projetos'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="h-7 px-3 rounded-[6px] text-[12px] font-medium"
                style={tab === t ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--text3)' }}
              >
                {t === 'hoje' ? 'Hoje' : t === 'proximas' ? 'Próximas' : 'Projetos'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={prioFilter}
              onChange={(e) => setPrioFilter(e.target.value as TaskPriority | 'todas')}
              className="text-[12px] rounded-[7px] px-2 py-1.5 outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
            >
              <option value="todas">Todas as prioridades</option>
              {PRIOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'prio' | 'dueDate' | 'title')}
              className="text-[12px] rounded-[7px] px-2 py-1.5 outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
            >
              <option value="prio">Ordenar: prioridade</option>
              <option value="dueDate">Ordenar: vencimento</option>
              <option value="title">Ordenar: título</option>
            </select>
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
          const tasksForCal = sortTasks(
            visibleTasks.filter((t) => t.calId === cal.id),
            full ? sortBy : 'prio',
          );
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
                      onClick={() => onSelectTask?.(task.id)}
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
                      {!!task.important && <span className="text-[10px] shrink-0">⭐</span>}
                      {!!task.recurring && <Repeat size={9} className="shrink-0" style={{ color: 'var(--text3)' }} />}
                      <span
                        className="text-[12px] font-medium truncate flex-1"
                        style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}
                      >
                        {task.title}
                      </span>
                      {task.tag && task.tag !== 'Geral' && (
                        <span
                          className="text-[9.5px] font-semibold rounded-full px-2 py-[1px] shrink-0"
                          style={{ background: 'color-mix(in oklab, ' + cal.color + ' 18%, var(--surface2))', color: cal.color }}
                        >
                          {task.tag}
                        </span>
                      )}
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

      <div className="mt-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
          Resumo da semana
        </span>
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <StatBlock label="Eventos" value={stats.eventsCount} delta={stats.eventsDelta} unit="" />
          <StatBlock label="Foco" value={formatMinutes(stats.focusMinutes)} delta={stats.focusDeltaMinutes} unit="min" />
          <StatBlock label="Tarefas" value={stats.tasksCompleted} delta={stats.tasksDelta} unit="" />
        </div>
      </div>

      <button
        onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'analytics' })}
        className="mt-3 text-[12px] font-medium text-left rounded-[7px] px-2 py-1.5 hover:[background:var(--surface2)]"
        style={{ color: 'var(--gold)' }}
      >
        Ver Analytics completo →
      </button>
    </div>
  );
}

function StatBlock({ label, value, delta, unit }: { label: string; value: number | string; delta: number; unit: string }) {
  const sign = delta > 0 ? '+' : '';
  return (
    <div className="rounded-[9px] p-2" style={{ background: 'var(--surface2)' }}>
      <div className="text-[9.5px] mb-0.5" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
      <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      {delta !== 0 && (
        <div className="text-[9px] font-mono-ae" style={{ color: delta > 0 ? 'var(--sync-ok)' : 'var(--text3)' }}>
          {sign}
          {delta}
          {unit} vs. sem. passada
        </div>
      )}
    </div>
  );
}
