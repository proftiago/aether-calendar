import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X, Repeat, ChevronDown, Star, Sun, Calendar as CalendarIcon } from 'lucide-react';
import { useStore } from '../store/store';
import { useAllEvents, calendarOf } from '../store/selectors';
import { todayKey } from '../lib/dates';
import { prioColor, tagColor } from '../lib/style';
import { weeklyStats, formatMinutes } from '../lib/analytics';
import { Checkbox } from './Checkbox';
import { DatePicker } from './DatePicker';
import { Dropdown } from './Dropdown';
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

/**
 * Imagem de arrasto customizada — o navegador tem uma prévia padrão pra
 * drag nativo (dataTransfer), mas em layouts flex complexos como o nosso
 * ela às vezes falha silenciosamente (fica em branco ou nem aparece).
 * Cria um elemento simples só com o título, gruda no dataTransfer, e some
 * logo em seguida (o navegador já tirou o "retrato" na hora do dragstart).
 */
function setCustomDragImage(e: React.DragEvent, title: string) {
  const ghost = document.createElement('div');
  ghost.textContent = title;
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '-1000px',
    left: '-1000px',
    padding: '6px 12px',
    borderRadius: '9px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(ghost);
  // força o navegador a calcular o layout do elemento agora, de forma
  // sincrona - sem isso, no momento exato do setDragImage o elemento podia
  // ainda nao ter sido "desenhado" de verdade (layout so acontece no
  // proximo ciclo de repintura por padrao), resultando numa imagem vazia/
  // invisivel - bem provavelmente a causa real do sumico relatado
  void ghost.offsetWidth;
  e.dataTransfer.setDragImage(ghost, 16, 16);
  setTimeout(() => ghost.remove(), 0);
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
  const [taskCalId, setTaskCalId] = useState(() => state.calendars[0]?.id ?? 'work');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurDows, setRecurDows] = useState<number[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [tab, setTab] = useState<'hoje' | 'proximas' | 'projetos'>('projetos');
  const [prioFilter, setPrioFilter] = useState<TaskPriority | 'todas'>('todas');
  const [sortBy, setSortBy] = useState<'prio' | 'dueDate' | 'title'>('prio');
  const [groupBy, setGroupBy] = useState<'calendar' | 'date' | 'priority' | 'none'>('date');

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

  type Group = { key: string; label: string; color: string; tasks: Task[] };
  const groups: Group[] = useMemo(() => {
    if (!full || groupBy === 'calendar') {
      return state.calendars
        .map((cal) => ({
          key: cal.id,
          label: cal.name,
          color: cal.color,
          tasks: sortTasks(
            visibleTasks.filter((t) => t.calId === cal.id),
            full ? sortBy : 'prio',
          ),
        }))
        .filter((g) => g.tasks.length > 0);
    }
    if (groupBy === 'date') {
      const hoje = visibleTasks.filter((t) => !!t.dueDate && t.dueDate! <= today);
      const proximas = visibleTasks.filter((t) => !!t.dueDate && t.dueDate! > today);
      const semData = visibleTasks.filter((t) => !t.dueDate);
      return [
        { key: 'hoje', label: 'Hoje', color: 'var(--gold)', tasks: sortTasks(hoje, sortBy) },
        { key: 'proximas', label: 'Próximas', color: 'var(--accent)', tasks: sortTasks(proximas, sortBy) },
        { key: 'sem-data', label: 'Sem data', color: 'var(--text3)', tasks: sortTasks(semData, sortBy) },
      ].filter((g) => g.tasks.length > 0);
    }
    if (groupBy === 'priority') {
      return PRIOS.map((p) => ({
        key: p,
        label: p.charAt(0).toUpperCase() + p.slice(1),
        color: prioColor(p),
        tasks: sortTasks(
          visibleTasks.filter((t) => t.prio === p),
          sortBy,
        ),
      })).filter((g) => g.tasks.length > 0);
    }
    // 'none': um grupo só, sem cabeçalho de verdade
    return [{ key: 'all', label: 'Todas', color: 'var(--accent)', tasks: sortTasks(visibleTasks, sortBy) }];
  }, [full, groupBy, state.calendars, visibleTasks, sortBy, today]);

  return (
    <div className="flex flex-col">
      {!full && (
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
      )}

      {!full && (
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
      )}

      {adding && full && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={resetTaskForm} />
      )}
      {adding && (
        <div
          className={full ? 'fixed inset-y-0 left-0 z-50 w-[340px] overflow-y-auto p-5 flex flex-col gap-3 border-r animate-ae-in' : 'rounded-[9px] p-2.5 mb-3 flex flex-col gap-2'}
          style={full ? { background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' } : { background: 'var(--surface2)' }}
        >
          {full && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                Nova tarefa
              </span>
              <button onClick={resetTaskForm} className="w-7 h-7 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]" aria-label="Fechar">
                <X size={15} style={{ color: 'var(--text3)' }} />
              </button>
            </div>
          )}
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
          <div className="flex gap-1.5 flex-wrap">
            {state.calendars.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTaskCalId(String(c.id))}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold border"
                style={
                  taskCalId === c.id
                    ? { background: 'color-mix(in oklab, ' + c.color + ' 16%, var(--surface))', borderColor: c.color, color: c.color }
                    : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text2)' }
                }
              >
                <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>

          <div>
            <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text3)' }}>
              Vencimento (opcional)
            </div>
            <DatePicker value={dueDate || undefined} onChange={(d) => setDueDate(d ?? '')} />
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
        <>
          <div className="mb-2.5">
            <div className="flex items-center p-[2px] rounded-[8px] w-fit" style={{ background: 'var(--surface2)' }}>
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
          </div>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <Dropdown
              value={prioFilter}
              onChange={setPrioFilter}
              options={[
                { value: 'todas', label: 'Todas as prioridades' },
                ...PRIOS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
              ]}
            />
            <div className="flex items-center gap-1.5">
              <Dropdown
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'date', label: 'Grupo: data' },
                  { value: 'calendar', label: 'Grupo: calendário' },
                  { value: 'priority', label: 'Grupo: prioridade' },
                  { value: 'none', label: 'Grupo: nenhum' },
                ]}
              />
              <Dropdown
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'prio', label: 'Ordenar: prioridade' },
                  { value: 'dueDate', label: 'Ordenar: vencimento' },
                  { value: 'title', label: 'Ordenar: título' },
                ]}
              />
            </div>
          </div>
        </>
      )}

      {!full && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
            arraste p/ agendar
          </span>
        </div>
      )}
      {visibleTasks.length === 0 && (
        <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text3)' }}>
          Nenhuma tarefa pendente
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {groups.map((group) => {
          const collapsed = collapsedGroups.includes(group.key);
          return (
            <div key={group.key}>
              {groupBy !== 'none' && (
                <button
                  onClick={() =>
                    setCollapsedGroups((prev) => (collapsed ? prev.filter((id) => id !== group.key) : [...prev, group.key]))
                  }
                  className="w-full flex items-center gap-2 mb-1 rounded-[6px] px-1 py-[3px] hover:[background:var(--surface2)]"
                >
                  {groupBy === 'date' ? (
                    group.key === 'hoje' ? (
                      <Sun size={13} className="shrink-0" style={{ color: group.color }} />
                    ) : (
                      <CalendarIcon size={13} className="shrink-0" style={{ color: group.color }} />
                    )
                  ) : (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                  )}
                  <span className="text-[12px] font-semibold flex-1 text-left truncate" style={{ color: 'var(--text)' }}>
                    {group.label}
                  </span>
                  <span className="text-[10px] font-mono-ae shrink-0" style={{ color: 'var(--text3)' }}>
                    {group.tasks.length}
                  </span>
                  <ChevronDown
                    size={12}
                    className="shrink-0 transition-transform"
                    style={{ color: 'var(--text3)', transform: collapsed ? 'rotate(-90deg)' : undefined }}
                  />
                </button>
              )}
              {!collapsed && (
                <div className="flex flex-col gap-0.5">
                  {group.tasks.map((task) => {
                    const cal = calendarOf(state, task.calId);
                    if (full) {
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-aether-task', task.id);
                            e.dataTransfer.effectAllowed = 'copyMove';
                            setCustomDragImage(e, task.title);
                          }}
                          onPointerDown={(e) => {
                            if (e.pointerType === 'touch') startTouchDrag(e, task.id, task.title);
                          }}
                          onClick={() => onSelectTask?.(task.id)}
                          className="rounded-[9px] px-2.5 py-2.5 cursor-grab select-none hover:[background:var(--surface2)] flex items-center gap-3 group"
                          style={{ opacity: task.done ? 0.5 : 1, touchAction: 'none' }}
                        >
                          <Checkbox
                            checked={task.done}
                            onChange={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                            size={18}
                            accentColor={cal?.color ?? 'var(--accent)'}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {!!task.recurring && <Repeat size={10} className="shrink-0" style={{ color: 'var(--text3)' }} />}
                              <span
                                className="text-[13.5px] font-medium truncate"
                                style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}
                              >
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: cal?.color }} />
                              <span className="text-[11.5px] truncate" style={{ color: 'var(--text3)' }}>
                                {cal?.name}
                              </span>
                            </div>
                          </div>

                          {state.w >= 480 && (
                            <span
                              className="text-[11px] font-semibold rounded-[7px] px-2.5 py-1 shrink-0"
                              style={{
                                background: 'color-mix(in oklab, ' + prioColor(task.prio) + ' 16%, var(--surface2))',
                                color: prioColor(task.prio),
                              }}
                            >
                              {task.prio.charAt(0).toUpperCase() + task.prio.slice(1)}
                            </span>
                          )}

                          <span
                            className="text-[12px] font-mono-ae shrink-0 w-[52px] text-right"
                            style={{ color: task.dueDate && task.dueDate < todayKey() && !task.done ? 'var(--danger)' : 'var(--text3)' }}
                          >
                            {task.dueDate ? task.dueDate.slice(5) : '—'}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'TOGGLE_TASK_IMPORTANT', id: task.id });
                            }}
                            className="w-6 h-6 rounded-[6px] grid place-items-center shrink-0"
                            aria-label="Importante"
                          >
                            <Star size={15} fill={task.important ? 'var(--gold)' : 'none'} style={{ color: 'var(--gold)' }} />
                          </button>
                        </div>
                      );
                    }
                    return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-aether-task', task.id);
                        e.dataTransfer.effectAllowed = 'copyMove';
                        setCustomDragImage(e, task.title);
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
                          borderColor: task.done ? (cal?.color ?? 'var(--accent)') : 'var(--text3)',
                          background: task.done ? (cal?.color ?? 'var(--accent)') : 'transparent',
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
                          style={{ background: 'color-mix(in oklab, ' + tagColor(task.tag) + ' 18%, var(--surface2))', color: tagColor(task.tag) }}
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
                    );
                  })}
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
          <StatBlock label="Eventos" value={stats.eventsCount} delta={stats.eventsDelta} unit="" color="oklch(0.6 0.14 220)" />
          <StatBlock label="Foco" value={formatMinutes(stats.focusMinutes)} delta={stats.focusDeltaMinutes} unit="min" color="oklch(0.58 0.18 300)" />
          <StatBlock label="Tarefas" value={stats.tasksCompleted} delta={stats.tasksDelta} unit="" color="var(--gold)" />
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

function StatBlock({ label, value, delta, unit, color }: { label: string; value: number | string; delta: number; unit: string; color?: string }) {
  const sign = delta > 0 ? '+' : '';
  return (
    <div className="rounded-[9px] p-2" style={{ background: color ? `color-mix(in oklab, ${color} 14%, var(--surface2))` : 'var(--surface2)' }}>
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
