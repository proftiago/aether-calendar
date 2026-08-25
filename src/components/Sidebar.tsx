import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useStore } from '../store/store';
import { prioColor } from '../lib/style';
import { MiniCalendar } from './MiniCalendar';

export function Sidebar({ eventCountByCal }: { eventCountByCal: Record<string, number> }) {
  const { state, dispatch } = useStore();
  const [addingSet, setAddingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  const overlayMode = state.w < 980;

  function confirmAddSet() {
    if (newSetName.trim()) {
      dispatch({ type: 'ADD_CALENDAR_SET', name: newSetName });
    }
    setNewSetName('');
    setAddingSet(false);
  }

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
        className={`w-[268px] shrink-0 overflow-y-auto flex flex-col p-4 border-r ${
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
                      <X size={11} strokeWidth={2.5} />
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
              <button
                key={c.id}
                onClick={() => dispatch({ type: 'TOGGLE_CAL', id: c.id })}
                className="flex items-center gap-2.5 rounded-[7px] px-1.5 py-[7px] text-left hover:[background:var(--surface2)]"
                style={{ opacity: c.visible ? 1 : 0.5 }}
              >
                <span
                  className="w-4 h-4 rounded-[5px] grid place-items-center shrink-0"
                  style={{
                    border: `1.5px solid ${c.color}`,
                    background: c.visible ? c.color : 'transparent',
                  }}
                >
                  {c.visible && <Check size={10} strokeWidth={3.5} color="white" />}
                </span>
                <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--text)' }}>
                  {c.name}
                </span>
                <span className="text-[11px] font-mono-ae" style={{ color: 'var(--text3)' }}>
                  {eventCountByCal[c.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </section>

        <SectionDivider />

        <section>
          <div className="flex items-center justify-between">
            <SectionTitle>Tarefas</SectionTitle>
            <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
              arraste p/ agendar
            </span>
          </div>
          <div className="mt-1.5 flex flex-col gap-0.5">
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
        </section>

        <div className="mt-auto pt-4">
          <SectionDivider />
          <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text2)' }}>
            Horário de trabalho
          </div>
          <div className="text-[11px] font-mono-ae mb-2" style={{ color: 'var(--text3)' }}>
            08:00 – 19:00 · seg a sex
          </div>
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
