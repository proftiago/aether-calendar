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
        className={`w-[268px] shrink-0 overflow-y-auto flex flex-col gap-5 p-3.5 border-r ${
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

        <section>
          <SectionTitle>Calendar sets</SectionTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {state.calendarSets.map((s) => {
              const active = state.set === s.id;
              return (
                <div key={s.id} className="relative group">
                  <button
                    onClick={() => dispatch({ type: 'SET_CAL_SET', set: s.id })}
                    className="rounded-[7px] pl-[11px] pr-[11px] py-[6px] text-[12px] font-medium"
                    style={
                      active
                        ? { background: 'var(--accent)', color: 'var(--accentText)' }
                        : { background: 'var(--surface2)', color: 'var(--text2)' }
                    }
                  >
                    {s.name}
                  </button>
                  {!s.builtin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'REMOVE_CALENDAR_SET', id: s.id });
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--now-line)', color: 'white' }}
                      aria-label={`Excluir set ${s.name}`}
                    >
                      <X size={9} strokeWidth={3} />
                    </button>
                  )}
                </div>
              );
            })}
            {addingSet ? (
              <div className="flex items-center gap-1">
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
                  className="rounded-[8px] px-2 py-[6px] text-[12px] outline-none border w-[110px]"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--accent)', color: 'var(--text)' }}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingSet(true)}
                className="rounded-[7px] px-2 py-[6px] text-[12px] font-medium flex items-center gap-1"
                style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
                title="Salvar seleção atual de calendários como um novo set"
              >
                <Plus size={12} />
              </button>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>Calendários</SectionTitle>
          <div className="mt-1.5 flex flex-col">
            {state.calendars.map((c) => (
              <button
                key={c.id}
                onClick={() => dispatch({ type: 'TOGGLE_CAL', id: c.id })}
                className="flex items-center gap-2.5 rounded-[9px] px-1.5 py-[7px] text-left hover:[background:var(--surface2)]"
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
                <span className="text-[13.5px] font-medium flex-1" style={{ color: 'var(--text)' }}>
                  {c.name}
                </span>
                <span className="text-[11px] font-mono-ae" style={{ color: 'var(--text3)' }}>
                  {eventCountByCal[c.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <SectionTitle>Tarefas</SectionTitle>
            <span className="text-[10.5px]" style={{ color: 'var(--text3)' }}>
              arraste p/ agendar
            </span>
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {state.tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-aether-task', task.id);
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                onClick={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                className="rounded-[9px] px-[10px] py-[8px] cursor-grab select-none hover:[background:var(--surface2)]"
                style={{
                  opacity: task.done ? 0.45 : 1,
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-5 rounded-[3px] shrink-0"
                    style={{ background: prioColor(task.prio) }}
                  />
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 pl-[14px] text-[10.5px]">
                  <span className="font-semibold uppercase" style={{ color: prioColor(task.prio) }}>
                    {task.prio}
                  </span>
                  <span className="font-mono-ae" style={{ color: 'var(--text3)' }}>
                    {task.dur}min
                  </span>
                  <span
                    className="rounded-[5px] px-1.5 py-[1px]"
                    style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
                  >
                    {task.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-auto rounded-[10px] p-3" style={{ background: 'var(--surface2)' }}>
          <div className="text-[11.5px] font-semibold mb-1" style={{ color: 'var(--text2)' }}>
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
                : { background: 'var(--surface)', color: 'var(--text2)' }
            }
          >
            {state.workOnly ? 'Mostrar 24 horas' : 'Colapsar fora do horário'}
          </button>
        </div>
      </aside>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
      {children}
    </div>
  );
}
