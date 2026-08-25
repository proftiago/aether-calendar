import { useState } from 'react';
import { useStore } from '../store/store';
import { prioColor } from '../lib/style';

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

export function RightPanel() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<'tasks' | 'shortcuts'>('tasks');
  if (!state.shortcutsOpen || state.w < 900) return null;

  const doneCount = state.tasks.filter((t) => t.done).length;
  const totalCount = state.tasks.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

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
                onClick={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                className="rounded-[7px] px-2 py-[6px] cursor-grab select-none hover:[background:var(--surface2)] flex items-center gap-2"
                style={{ opacity: task.done ? 0.45 : 1 }}
              >
                <span className="w-1 h-3.5 rounded-[2px] shrink-0" style={{ background: prioColor(task.prio) }} />
                <span
                  className="text-[12px] font-medium truncate flex-1"
                  style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}
                >
                  {task.title}
                </span>
                <span className="text-[10px] font-mono-ae shrink-0" style={{ color: 'var(--text3)' }}>
                  {task.dur}m
                </span>
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
