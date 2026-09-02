import { useMemo, useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { useStore } from '../store/store';
import type { Action } from '../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../store/selectors';
import { dateKeyOf, addDays, hm, minutesOfDay, todayKey } from '../lib/dates';
import { eventBg } from '../lib/style';
import type { Task } from '../lib/types';

const HABIT_ICON_PRESETS = ['🧘', '🏃', '🚶', '📖', '🏋️', '🍎', '💧', '😴', '✍️', '🎨'];
const HABIT_SUGGESTIONS = [
  { icon: '🧘', title: 'Meditar' },
  { icon: '🏃', title: 'Correr' },
  { icon: '🚶', title: 'Caminhar' },
  { icon: '📖', title: 'Ler' },
  { icon: '🏋️', title: 'Academia' },
  { icon: '🍎', title: 'Comer frutas' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Calcula quantos dias seguidos (contando hoje pra trás) tiveram pelo
 * menos uma tarefa concluída — métrica real, calculada a partir dos
 * dados que já temos (lastDoneKey de cada tarefa), não um número
 * fictício de "pontos".
 */
function computeStreak(tasks: Task[]): number {
  const doneDates = new Set(tasks.map((t) => t.lastDoneKey).filter((d): d is string => !!d));
  let streak = 0;
  let cursor = todayKey();
  while (doneDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function HojePage() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const [addingIn, setAddingIn] = useState<'today' | 'tomorrow' | 'someday' | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const [somedayOpen, setSomedayOpen] = useState(true);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🧘');

  const todaysEvents = useMemo(
    () =>
      visibleEvents
        .filter((ev) => dateKeyOf(ev.startsAt) === today)
        .sort((a, b) => {
          if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
          return minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt);
        }),
    [visibleEvents, today],
  );

  const activeTasks = state.tasks.filter((t) => !t.archived);
  const todayTasks = activeTasks.filter((t) => !t.someday && (!t.dueDate || t.dueDate <= today));
  const tomorrowTasks = activeTasks.filter((t) => !t.someday && t.dueDate === tomorrow);
  const somedayTasks = activeTasks.filter((t) => t.someday);

  const streak = useMemo(() => computeStreak(state.tasks), [state.tasks]);
  const todayHabits = state.habits.filter((h) => h.days.length === 0 || h.days.includes(new Date().getDay()));
  const habitsDoneToday = todayHabits.filter((h) => h.doneDates.includes(today)).length;
  const recentPages = [...state.pages].filter((p) => !p.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);

  function addQuickTask(bucket: 'today' | 'tomorrow' | 'someday') {
    if (!newTitle.trim()) {
      setAddingIn(null);
      return;
    }
    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      prio: 'média',
      dur: 30,
      tag: 'Geral',
      calId: 'work',
      done: false,
      dueDate: bucket === 'tomorrow' ? tomorrow : undefined,
      someday: bucket === 'someday',
    };
    dispatch({ type: 'ADD_TASK', task });
    setNewTitle('');
    setAddingIn(null);
  }

  function quickAddHabit(icon: string, title: string) {
    dispatch({
      type: 'ADD_HABIT',
      habit: { id: `habit-${Date.now()}`, title, icon, days: [], doneDates: [], createdAt: new Date().toISOString() },
    });
  }

  function submitHabit() {
    if (!newHabitTitle.trim()) {
      setAddingHabit(false);
      return;
    }
    quickAddHabit(newHabitIcon, newHabitTitle.trim());
    setNewHabitTitle('');
    setAddingHabit(false);
  }

  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-[920px] mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
            {greeting()}! 👋
          </h1>
        </div>
        <p className="text-[13px] capitalize mb-6" style={{ color: 'var(--text3)' }}>
          {dateLabel}
        </p>

        <div className="grid grid-cols-4 gap-3 mb-8">
          <StatCard label="Eventos hoje" value={todaysEvents.length} />
          <StatCard label="Tarefas pendentes" value={activeTasks.filter((t) => !t.done).length} />
          <StatCard label="Sequência de dias" value={streak} accent="var(--gold)" />
          <StatCard label="Hábitos hoje" value={`${habitsDoneToday}/${todayHabits.length}`} accent="var(--sync-ok)" isText />
        </div>

        <section className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text3)' }}>
            Agenda de hoje
          </h2>
          {todaysEvents.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
              Nada agendado por hoje.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {todaysEvents.map((ev) => {
                const cal = calendarOf(state, ev.calId);
                return (
                  <button
                    key={ev.id}
                    onClick={() => {
                      dispatch({ type: 'SET_PAGE', page: 'calendario' });
                      dispatch({ type: 'SET_SELECTED', id: ev.id });
                    }}
                    className="flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left"
                    style={{ background: eventBg(cal?.color ?? 'var(--accent)', 12) }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cal?.color }} />
                    <span className="w-[68px] shrink-0 text-[12.5px] font-mono-ae" style={{ color: cal?.color }}>
                      {ev.allDay ? 'dia todo' : hm(minutesOfDay(ev.startsAt), state.settings.timeFormat)}
                    </span>
                    <span className="text-[14px] font-medium truncate" style={{ color: 'var(--text)' }}>
                      {ev.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
            ✔️ Tarefas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TaskColumn
              title="Hoje"
              tasks={todayTasks}
              adding={addingIn === 'today'}
              onStartAdd={() => setAddingIn('today')}
              onSubmit={() => addQuickTask('today')}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              placeholder="Add a new task..."
              dispatch={dispatch}
            />
            <TaskColumn
              title="Amanhã"
              tasks={tomorrowTasks}
              adding={addingIn === 'tomorrow'}
              onStartAdd={() => setAddingIn('tomorrow')}
              onSubmit={() => addQuickTask('tomorrow')}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              placeholder="Add a task for tomorrow..."
              collapsible
              open={tomorrowOpen}
              onToggleOpen={() => setTomorrowOpen((v) => !v)}
              dispatch={dispatch}
            />
            <TaskColumn
              title="Algum dia"
              tasks={somedayTasks}
              adding={addingIn === 'someday'}
              onStartAdd={() => setAddingIn('someday')}
              onSubmit={() => addQuickTask('someday')}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              placeholder="Add new..."
              collapsible
              open={somedayOpen}
              onToggleOpen={() => setSomedayOpen((v) => !v)}
              dispatch={dispatch}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                💪 Hábitos
              </h2>
            </div>
            {todayHabits.length === 0 && !addingHabit && (
              <p className="text-[13px] mb-2.5" style={{ color: 'var(--text3)' }}>
                Nenhum hábito criado ainda.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {todayHabits.map((h) => {
                const done = h.doneDates.includes(today);
                return (
                  <div key={h.id} className="relative group">
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_HABIT_TODAY', id: h.id })}
                      className="flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-[12.5px] font-medium"
                      style={
                        done
                          ? { background: 'var(--sync-ok)', color: 'white' }
                          : { background: 'var(--surface2)', color: 'var(--text2)' }
                      }
                    >
                      <span>{h.icon}</span>
                      {h.title}
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_HABIT', id: h.id })}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full grid place-items-center opacity-0 group-hover:opacity-100"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)' }}
                      aria-label="Remover hábito"
                    >
                      <span style={{ fontSize: 9 }}>✕</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {addingHabit ? (
              <div className="flex items-center gap-1.5">
                <select
                  value={newHabitIcon}
                  onChange={(e) => setNewHabitIcon(e.target.value)}
                  className="text-[16px] rounded-[8px] px-1.5 py-1.5 outline-none shrink-0"
                  style={{ background: 'var(--surface2)' }}
                >
                  {HABIT_ICON_PRESETS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
                <input
                  autoFocus
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitHabit();
                    if (e.key === 'Escape') setAddingHabit(false);
                  }}
                  onBlur={submitHabit}
                  placeholder="Nome do hábito"
                  className="flex-1 rounded-[8px] px-2.5 py-1.5 text-[13px] outline-none min-w-0"
                  style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {HABIT_SUGGESTIONS.filter((s) => !todayHabits.some((h) => h.title === s.title)).map((s) => (
                  <button
                    key={s.title}
                    onClick={() => quickAddHabit(s.icon, s.title)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium"
                    style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                  >
                    <span>{s.icon}</span>
                    {s.title}
                  </button>
                ))}
                <button
                  onClick={() => setAddingHabit(true)}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
                  style={{ background: 'color-mix(in oklab, var(--accent) 14%, var(--surface2))', color: 'var(--accent)' }}
                >
                  + Criar hábito
                </button>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
              <FileText size={16} /> Páginas recentes
            </h2>
            {recentPages.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                Suas páginas recentes vão aparecer aqui.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {recentPages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => dispatch({ type: 'SET_PAGE', page: 'notas' })}
                    className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 hover:[background:var(--surface2)]"
                  >
                    <span>{p.icon || '📄'}</span>
                    <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                      {p.title || 'Sem título'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, isText }: { label: string; value: number | string; accent?: string; isText?: boolean }) {
  return (
    <div className="rounded-[14px] p-3.5" style={{ background: 'var(--surface2)' }}>
      <div className={isText ? 'text-[17px] font-semibold' : 'text-[22px] font-semibold tracking-[-0.02em]'} style={{ color: accent ?? 'var(--text)' }}>
        {value}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  adding,
  onStartAdd,
  onSubmit,
  newTitle,
  setNewTitle,
  placeholder,
  collapsible,
  open,
  onToggleOpen,
  dispatch,
}: {
  title: string;
  tasks: Task[];
  adding: boolean;
  onStartAdd: () => void;
  onSubmit: () => void;
  newTitle: string;
  setNewTitle: (v: string) => void;
  placeholder: string;
  collapsible?: boolean;
  open?: boolean;
  onToggleOpen?: () => void;
  dispatch: (a: Action) => void;
}) {
  const doneCount = tasks.filter((t) => t.done).length;
  const showBody = !collapsible || open;
  return (
    <div className="rounded-[14px] p-3.5" style={{ background: 'var(--surface2)' }}>
      <button
        onClick={collapsible ? onToggleOpen : undefined}
        className="w-full flex items-center justify-between mb-2"
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </span>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <span className="text-[11px] font-mono-ae" style={{ color: 'var(--text3)' }}>
              {doneCount}/{tasks.length}
            </span>
          )}
          {collapsible && (
            <ChevronDown size={13} style={{ color: 'var(--text3)', transform: open ? undefined : 'rotate(-90deg)' }} />
          )}
        </div>
      </button>
      {showBody && (
        <div className="flex flex-col gap-1">
          {tasks.map((task) => (
            <label key={task.id} className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                className="shrink-0"
              />
              <span
                className="text-[13px] truncate"
                style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.5 : 1 }}
              >
                {task.title}
              </span>
            </label>
          ))}
          {adding ? (
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
              onBlur={onSubmit}
              placeholder={placeholder}
              className="text-[13px] outline-none bg-transparent py-1"
              style={{ color: 'var(--text)' }}
            />
          ) : (
            <button onClick={onStartAdd} className="text-left text-[13px] py-1" style={{ color: 'var(--text3)' }}>
              {placeholder}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
