import { useState } from 'react';
import { X, Check, Plus, Star, Trash2 } from 'lucide-react';
import { useStore } from '../store/store';
import { calendarOf } from '../store/selectors';
import { prioColor } from '../lib/style';
import type { NoteChecklistItem, TaskPriority } from '../lib/types';

const PRIOS: TaskPriority[] = ['alta', 'média', 'baixa'];

/**
 * Painel de detalhe de uma tarefa — título, calendário/prioridade,
 * "Importante", subtarefas (checklist) e notas livres. Usado só na página
 * Tarefas (a versão compacta do painel, na página Calendário, não abre
 * isso — lá é só arrastar rápido).
 */
export function TaskDetailPanel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [newSubtask, setNewSubtask] = useState('');
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const cal = calendarOf(state, task.calId);
  const subtasks = task.subtasks ?? [];
  const doneCount = subtasks.filter((s) => s.done).length;
  const progressPct = subtasks.length === 0 ? 0 : Math.round((doneCount / subtasks.length) * 100);

  function addSubtask() {
    if (!newSubtask.trim()) return;
    const item: NoteChecklistItem = { id: `sub-${Date.now()}`, text: newSubtask.trim(), done: false };
    dispatch({ type: 'ADD_TASK_SUBTASK', taskId, item });
    setNewSubtask('');
  }

  return (
    <aside
      className="w-[300px] shrink-0 border-l overflow-y-auto p-5 flex flex-col gap-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
          className="w-6 h-6 rounded-full border grid place-items-center shrink-0"
          style={{
            borderColor: task.done ? (cal?.color ?? 'var(--accent)') : 'var(--text3)',
            background: task.done ? cal?.color : 'transparent',
          }}
        >
          {task.done && <Check size={13} strokeWidth={3.5} color="white" />}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_TASK_IMPORTANT', id: task.id })}
            className="w-7 h-7 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
            aria-label="Importante"
          >
            <Star size={15} fill={task.important ? 'var(--gold)' : 'none'} style={{ color: 'var(--gold)' }} />
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]" aria-label="Fechar">
            <X size={15} style={{ color: 'var(--text3)' }} />
          </button>
        </div>
      </div>

      <div className="text-[17px] font-semibold" style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}>
        {task.title}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className="text-[11px] font-semibold rounded-full px-2.5 py-1"
          style={{ background: 'color-mix(in oklab, ' + (cal?.color ?? 'var(--accent)') + ' 16%, var(--surface2))', color: cal?.color }}
        >
          {cal?.name}
        </span>
        <div className="flex gap-1">
          {PRIOS.map((p) => (
            <button
              key={p}
              onClick={() => dispatch({ type: 'UPDATE_TASK_PRIORITY', id: task.id, prio: p })}
              className="text-[11px] font-semibold rounded-full px-2.5 py-1"
              style={
                task.prio === p
                  ? { background: prioColor(p), color: 'var(--bg)' }
                  : { background: 'var(--surface2)', color: 'var(--text3)' }
              }
            >
              {p}
            </button>
          ))}
        </div>
        {task.dueDate && (
          <span className="text-[11px] font-mono-ae rounded-full px-2.5 py-1" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>
            vence {task.dueDate}
          </span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
              Subtarefas
            </span>
            <span className="text-[10px] font-mono-ae" style={{ color: 'var(--text3)' }}>
              {doneCount}/{subtasks.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-2.5" style={{ background: 'var(--surface2)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'var(--gold)' }} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {subtasks.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TASK_SUBTASK', taskId: task.id, itemId: item.id })}
              className="w-4 h-4 rounded-[4px] border grid place-items-center shrink-0"
              style={{ borderColor: item.done ? 'var(--accent)' : 'var(--text3)', background: item.done ? 'var(--accent)' : 'transparent' }}
            >
              {item.done && <Check size={10} strokeWidth={3.5} color="white" />}
            </button>
            <span
              className="text-[12.5px] flex-1"
              style={{ color: 'var(--text)', textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.55 : 1 }}
            >
              {item.text}
            </span>
            <button
              onClick={() => dispatch({ type: 'REMOVE_TASK_SUBTASK', taskId: task.id, itemId: item.id })}
              className="w-4 h-4 rounded-[4px] grid place-items-center opacity-0 group-hover:opacity-100 shrink-0"
              style={{ color: 'var(--text3)' }}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-1">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
            placeholder="Adicionar subtarefa…"
            className="flex-1 rounded-[7px] px-2 py-[6px] text-[12px] outline-none min-w-0"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}
          />
          <button onClick={addSubtask} className="w-7 h-7 rounded-[7px] grid place-items-center shrink-0" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
          Notas
        </span>
        <textarea
          value={task.notes ?? ''}
          onChange={(e) => dispatch({ type: 'UPDATE_TASK_NOTES', id: task.id, notes: e.target.value })}
          placeholder="Escreva algo…"
          rows={4}
          className="w-full mt-1.5 text-[13px] leading-[1.6] outline-none bg-transparent resize-none rounded-[8px] p-2"
          style={{ color: 'var(--text)', background: 'var(--surface2)' }}
        />
      </div>

      <button
        onClick={() => {
          dispatch({ type: 'REMOVE_TASK', id: task.id });
          onClose();
        }}
        className="mt-auto flex items-center gap-1.5 text-[13px] font-medium rounded-[8px] px-2 py-2"
        style={{ color: 'var(--danger)' }}
      >
        <Trash2 size={14} />
        Excluir tarefa
      </button>
    </aside>
  );
}
