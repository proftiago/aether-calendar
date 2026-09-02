import { useMemo } from 'react';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../store/selectors';
import { dateKeyOf, hm, minutesOfDay, todayKey } from '../lib/dates';

type Alert = { id: string; icon: React.ReactNode; title: string; subtitle: string; color: string; onClick: () => void };

/**
 * Central de Alertas — modal cheio, não é decorativo: junta eventos de
 * hoje que ainda vão começar, tarefas atrasadas e tarefas que vencem
 * hoje. Sem sistema de notificações "de verdade" com histórico
 * persistido (o Aether não guarda isso), então é sempre computado na
 * hora a partir dos dados reais, não uma lista fixa salva em algum lugar.
 */
export function AlertsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();
  const now = state.now;

  const alerts: Alert[] = useMemo(() => {
    const list: Alert[] = [];

    visibleEvents
      .filter((ev) => !ev.allDay && !ev.done && dateKeyOf(ev.startsAt) === today && minutesOfDay(ev.startsAt) >= now)
      .sort((a, b) => minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt))
      .forEach((ev) => {
        const cal = calendarOf(state, ev.calId);
        list.push({
          id: `ev-${ev.id}`,
          icon: <Clock size={15} />,
          title: ev.title,
          subtitle: `Hoje às ${hm(minutesOfDay(ev.startsAt), state.settings.timeFormat)}${cal ? ` · ${cal.name}` : ''}`,
          color: cal?.color ?? 'var(--accent)',
          onClick: () => {
            dispatch({ type: 'SET_PAGE', page: 'calendario' });
            dispatch({ type: 'SET_SELECTED', id: ev.id });
            onClose();
          },
        });
      });

    state.tasks
      .filter((t) => !t.archived && !t.done && t.dueDate && t.dueDate < today)
      .forEach((t) => {
        list.push({
          id: `overdue-${t.id}`,
          icon: <AlertTriangle size={15} />,
          title: t.title,
          subtitle: `Atrasada desde ${t.dueDate}`,
          color: 'var(--danger)',
          onClick: () => {
            dispatch({ type: 'SET_PAGE', page: 'tarefas' });
            onClose();
          },
        });
      });

    state.tasks
      .filter((t) => !t.archived && !t.done && t.dueDate === today)
      .forEach((t) => {
        list.push({
          id: `duetoday-${t.id}`,
          icon: <Clock size={15} />,
          title: t.title,
          subtitle: 'Vence hoje',
          color: 'var(--gold)',
          onClick: () => {
            dispatch({ type: 'SET_PAGE', page: 'tarefas' });
            onClose();
          },
        });
      });

    return list;
  }, [visibleEvents, state.tasks, today, now, state, dispatch, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-5 animate-ae-in" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div
        className="w-full max-w-[480px] mt-[8vh] rounded-[16px] overflow-hidden animate-ae-pop"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
            Alertas
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]" aria-label="Fechar">
            <X size={15} style={{ color: 'var(--text3)' }} />
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <span style={{ fontSize: 40 }}>🦥</span>
            <p className="text-[14px] font-semibold mt-3" style={{ color: 'var(--text)' }}>
              Você não tem alertas ainda
            </p>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--text3)' }}>
              Que bom, né?
            </p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {alerts.map((a) => (
              <button
                key={a.id}
                onClick={a.onClick}
                className="w-full flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left hover:[background:var(--surface2)]"
              >
                <span className="shrink-0" style={{ color: a.color }}>
                  {a.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium truncate" style={{ color: 'var(--text)' }}>
                    {a.title}
                  </span>
                  <span className="block text-[11.5px] truncate" style={{ color: 'var(--text3)' }}>
                    {a.subtitle}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
