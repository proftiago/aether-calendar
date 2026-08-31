import { useMemo } from 'react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../store/selectors';
import { dateKeyOf, hm, minutesOfDay, todayKey } from '../lib/dates';
import { eventBg } from '../lib/style';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Página Hoje — painel de resumo do dia: saudação, agenda de hoje e as
 * tarefas pendentes mais próximas. Não existia como página própria antes
 * (o "hoje" só era um botão de navegação dentro do Calendário).
 */
export function HojePage() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();

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

  const pendingTasks = state.tasks.filter((t) => !t.archived && !t.done).slice(0, 6);
  const doneToday = state.tasks.filter((t) => !t.archived && t.done).length;

  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] mb-1" style={{ color: 'var(--text)' }}>
          {greeting()}! ☀️
        </h1>
        <p className="text-[13px] capitalize mb-6" style={{ color: 'var(--text3)' }}>
          {dateLabel}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard label="Eventos hoje" value={todaysEvents.length} />
          <StatCard label="Tarefas pendentes" value={pendingTasks.length} />
          <StatCard label="Concluídas" value={doneToday} accent="var(--sync-ok)" />
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

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
              Prioridades
            </h2>
            <button
              onClick={() => dispatch({ type: 'SET_PAGE', page: 'tarefas' })}
              className="text-[12px] font-medium"
              style={{ color: 'var(--gold)' }}
            >
              Ver todas →
            </button>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
              Nenhuma tarefa pendente — dia livre.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {pendingTasks.map((task) => {
                const cal = calendarOf(state, task.calId);
                return (
                  <button
                    key={task.id}
                    onClick={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                    className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 hover:[background:var(--surface2)]"
                  >
                    <span className="w-[15px] h-[15px] rounded-full border shrink-0" style={{ borderColor: 'var(--text3)' }} />
                    <span className="text-[13px] font-medium flex-1 text-left truncate" style={{ color: 'var(--text)' }}>
                      {task.title}
                    </span>
                    {cal && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cal.color }} />}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-[14px] p-3.5" style={{ background: 'var(--surface2)' }}>
      <div className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: accent ?? 'var(--text)' }}>
        {value}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
    </div>
  );
}
