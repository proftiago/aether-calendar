import { useState } from 'react';
import { X, Check, Plus, Star, Trash2, Link as LinkIcon, Calendar as CalendarIcon, Clock, Flag } from 'lucide-react';
import { useStore } from '../store/store';
import { calendarOf } from '../store/selectors';
import { prioColor } from '../lib/style';
import type { NoteChecklistItem } from '../lib/types';


/**
 * Painel de detalhe de uma tarefa — título, calendário/prioridade,
 * "Importante", subtarefas (checklist) e notas livres. Usado só na página
 * Tarefas (a versão compacta do painel, na página Calendário, não abre
 * isso — lá é só arrastar rápido).
 */
export function TaskDetailPanel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [newSubtask, setNewSubtask] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
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

  function addLink() {
    const url = newLinkUrl.trim();
    if (!url) return;
    const normalized = /^https?:\/\//.test(url) ? url : `https://${url}`;
    let label = normalized;
    try {
      label = new URL(normalized).hostname.replace(/^www\./, '');
    } catch {
      // url mal formada mesmo depois de normalizar — guarda como está,
      // o link só não vai abrir se a pessoa clicar
    }
    dispatch({ type: 'ADD_TASK_LINK', taskId, link: { id: `link-${Date.now()}`, url: normalized, label } });
    setNewLinkUrl('');
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

      <div className="flex flex-wrap gap-1.5 mb-1">
        <span
          className="text-[11px] font-semibold rounded-full px-2.5 py-1"
          style={{ background: 'color-mix(in oklab, ' + (cal?.color ?? 'var(--accent)') + ' 16%, var(--surface2))', color: cal?.color }}
        >
          {cal?.name}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 py-4 border-y" style={{ borderColor: 'var(--border)' }}>
        <div>
          <CalendarIcon size={14} className="mb-2" style={{ color: 'var(--text3)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text2)' }}>
            {task.dueDate ? task.dueDate : 'Sem data'}
          </span>
        </div>
        <div>
          <Clock size={14} className="mb-2" style={{ color: 'var(--text3)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text2)' }}>
            {task.dur >= 60 ? `${Math.floor(task.dur / 60)}h${task.dur % 60 ? ` ${task.dur % 60}min` : ''}` : `${task.dur}min`}
          </span>
        </div>
        <button
          onClick={() => {
            const next = task.prio === 'alta' ? 'média' : task.prio === 'média' ? 'baixa' : 'alta';
            dispatch({ type: 'UPDATE_TASK_PRIORITY', id: task.id, prio: next });
          }}
          className="text-left"
        >
          <Flag size={14} className="mb-2" style={{ color: prioColor(task.prio) }} />
          <span className="text-[12px] block" style={{ color: prioColor(task.prio) }}>
            {task.prio.charAt(0).toUpperCase() + task.prio.slice(1)}
          </span>
        </button>
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
            <label
              className="relative text-[10.5px] font-mono-ae shrink-0 rounded-[5px] px-1.5 py-[2px] cursor-pointer"
              style={{ color: item.dueDate ? 'var(--accent)' : 'var(--text3)', background: item.dueDate ? 'color-mix(in oklab, var(--accent) 12%, var(--surface2))' : 'transparent' }}
              title="Prazo da subtarefa"
            >
              {item.dueDate ? item.dueDate.slice(5) : '+ prazo'}
              <input
                type="date"
                value={item.dueDate ?? ''}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_TASK_SUBTASK_DATE', taskId: task.id, itemId: item.id, dueDate: e.target.value || undefined })
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
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

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
          Links
        </span>
        <div className="flex flex-col gap-1 mt-1.5">
          {(task.links ?? []).map((link) => (
            <div key={link.id} className="flex items-center gap-2 group">
              <LinkIcon size={12} className="shrink-0" style={{ color: 'var(--text3)' }} />
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[12.5px] flex-1 truncate underline"
                style={{ color: 'var(--accent)' }}
              >
                {link.label || link.url}
              </a>
              <button
                onClick={() => dispatch({ type: 'REMOVE_TASK_LINK', taskId: task.id, linkId: link.id })}
                className="w-4 h-4 rounded-[4px] grid place-items-center opacity-0 group-hover:opacity-100 shrink-0"
                style={{ color: 'var(--text3)' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-1.5 mt-1">
            <input
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
              placeholder="Colar um link…"
              className="flex-1 rounded-[7px] px-2 py-[6px] text-[12px] outline-none min-w-0"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
            />
            <button onClick={addLink} className="w-7 h-7 rounded-[7px] grid place-items-center shrink-0" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>
              <Plus size={13} />
            </button>
          </div>
        </div>
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
