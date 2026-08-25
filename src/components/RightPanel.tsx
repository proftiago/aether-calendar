import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useStore } from '../store/store';
import { prioColor } from '../lib/style';
import type { Task, TaskPriority } from '../lib/types';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', '/'], label: 'Menu de comando' },
  { keys: ['T'], label: 'Ir para hoje' },
  { keys: ['C'], label: 'Criar evento' },
  { keys: ['G'], label: 'Ir para busca' },
  { keys: ['1'], label: 'Ver: Dia' },
  { keys: ['2'], label: 'Ver: Semana' },
  { keys: ['3'], label: 'Ver: Mês' },
  { keys: ['4'], label: 'Ver: Agenda' },
  { keys: ['←', '→'], label: 'Navegar' },
  { keys: ['Esc'], label: 'Fechar' },
];

const PRIOS: TaskPriority[] = ['alta', 'média', 'baixa'];

export function RightPanel() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<'tasks' | 'shortcuts'>('tasks');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [prio, setPrio] = useState<TaskPriority>('média');
  const [dur, setDur] = useState(30);
  const [tag, setTag] = useState('');
  const [calId, setCalId] = useState('work');

  useEffect(() => {
    function onRequestAdd() {
      dispatch({ type: 'SET_SHORTCUTS_OPEN', open: true });
      setTab('tasks');
      setAdding(true);
    }
    window.addEventListener('aether:add-task', onRequestAdd);
    return () => window.removeEventListener('aether:add-task', onRequestAdd);
  }, [dispatch]);

  if (!state.shortcutsOpen || state.w < 900) return null;


  const doneCount = state.tasks.filter((t) => t.done).length;
  const totalCount = state.tasks.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  function resetForm() {
    setTitle('');
    setPrio('média');
    setDur(30);
    setTag('');
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
      calId,
      done: false,
    };
    dispatch({ type: 'ADD_TASK', task });
    resetForm();
  }

  return (
    <aside
      className="w-[240px] shrink-0 border-l p-4 hidden lg:flex flex-col overflow-y-auto"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-1 mb-4 p-[2px] rounded-[9px]" style={{ background: 'var(--surface2)' }}>
        <button
          onClick={() => setTab('tasks')}
          className="flex-1 h-7 rounded-[7px] text-[12px] font-medium"
          style={tab === 'tasks' ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--text3)' }}
        >
          Tarefas
        </button>
        <button
          onClick={() => setTab('shortcuts')}
          className="flex-1 h-7 rounded-[7px] text-[12px] font-medium"
          style={tab === 'shortcuts' ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--text3)' }}
        >
          Atalhos
        </button>
      </div>

      {tab === 'tasks' ? (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
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
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
              Tarefas
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitTask();
                  if (e.key === 'Escape') resetForm();
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
                value={calId}
                onChange={(e) => setCalId(e.target.value)}
                className="rounded-[7px] px-2 py-[6px] text-[12px] outline-none"
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              >
                {state.calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <button
                  onClick={resetForm}
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

          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
              arraste p/ agendar
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {state.tasks.length === 0 && (
              <p className="text-[12px] py-4 text-center" style={{ color: 'var(--text3)' }}>
                Nenhuma tarefa pendente
              </p>
            )}
            {state.tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-aether-task', task.id);
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                className="rounded-[7px] px-2 py-[6px] cursor-grab select-none hover:[background:var(--surface2)] flex items-center gap-2 group"
                style={{ opacity: task.done ? 0.45 : 1 }}
              >
                <span className="w-1 h-3.5 rounded-[2px] shrink-0" style={{ background: prioColor(task.prio) }} />
                <span
                  onClick={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                  className="text-[12px] font-medium truncate flex-1"
                  style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}
                >
                  {task.title}
                </span>
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

          <button
            onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'analytics' })}
            className="mt-4 text-[12px] font-medium text-left rounded-[7px] px-2 py-2 hover:[background:var(--surface2)]"
            style={{ color: 'var(--gold)' }}
          >
            Ver Analytics completo →
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-[13px]">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-[12px]" style={{ color: 'var(--text2)' }}>
                {s.label}
              </span>
              <span className="flex gap-1 shrink-0">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="text-[10px] font-mono-ae font-semibold rounded-[5px] px-[6px] py-[1px] border"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
