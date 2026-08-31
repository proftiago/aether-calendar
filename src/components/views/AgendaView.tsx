import { useMemo } from 'react';
import { CalendarX } from 'lucide-react';
import { useStore } from '../../store/store';
import { useAllEvents, useVisibleEvents, calendarOf } from '../../store/selectors';
import { addDays, dateKeyOf, dayNum, hm, minutesOfDay, todayKey } from '../../lib/dates';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { keyToDate } from '../../lib/dates';
import { weatherOf } from '../../lib/estimates';
import { travelOf } from '../../lib/estimates';
import { eventBg } from '../../lib/style';
import type { Event } from '../../lib/types';

export function AgendaView() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();
  const mobile = state.w < 900;

  const groups = useMemo(() => {
    const byDay = new Map<string, Event[]>();
    for (const ev of visibleEvents) {
      const key = dateKeyOf(ev.startsAt);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(ev);
    }
    const days: { dateKey: string; events: Event[] }[] = [];
    for (let i = 0; i < 28; i++) {
      const key = addDays(state.cursor, i);
      const events = byDay.get(key);
      if (events && events.length > 0) {
        events.sort((a, b) => {
          if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
          return minutesOfDay(a.startsAt) - minutesOfDay(b.startsAt);
        });
        days.push({ dateKey: key, events });
      }
    }
    return days;
  }, [visibleEvents, state.cursor]);

  if (groups.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto pb-10 pt-2">
        <div className="flex flex-col items-center gap-2.5 py-20" style={{ color: 'var(--text3)' }}>
          <CalendarX size={28} strokeWidth={1.5} />
          <span className="text-[13px]">Nenhum evento nos próximos 28 dias</span>
        </div>
      </div>
    );
  }

  // Celular/tablet: lista vertical estilo Google Agenda — cabeçalho de data
  // ocupa a largura toda, cada evento é uma linha com uma bolinha colorida,
  // sem a coluna lateral de data (que fica apertada demais em tela estreita).
  if (mobile) {
    return (
      <div className="flex-1 overflow-y-auto pb-10">
        {groups.map(({ dateKey, events }) => {
          const isToday = dateKey === today;
          return (
            <div key={dateKey}>
              <div
                className="sticky top-0 z-10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] border-b"
                style={{
                  background: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: isToday ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                {isToday ? 'Hoje · ' : ''}
                {format(keyToDate(dateKey), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </div>
              <div className="flex flex-col gap-1.5 px-3 py-2">
                {events.map((ev) => {
                  const cal = calendarOf(state, ev.calId);
                  const travel = travelOf(ev);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => dispatch({ type: 'SET_SELECTED', id: ev.id })}
                      className="flex items-start gap-2.5 px-3.5 py-2.5 text-left rounded-2xl active:scale-[0.98] transition-transform"
                      style={{ background: eventBg(cal?.color ?? 'var(--accent)', 16) }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0 mt-[5px]" style={{ background: cal?.color }} />
                      <span className="w-[60px] shrink-0 text-[12.5px] font-mono-ae" style={{ color: cal?.color }}>
                        {ev.allDay ? 'dia todo' : hm(minutesOfDay(ev.startsAt), state.settings.timeFormat)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14.5px] font-medium truncate" style={{ color: 'var(--text)' }}>
                          {ev.title}
                        </span>
                        {(ev.location || travel) && (
                          <span className="block text-[12px] truncate" style={{ color: 'var(--text3)' }}>
                            {ev.location}
                            {travel ? ` · +${travel} min` : ''}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-10 pt-2">
      {groups.map(({ dateKey, events }) => {
        const isToday = dateKey === today;
        const w = weatherOf(dateKey);
        return (
          <div
            key={dateKey}
            className="flex gap-4 px-[22px] py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-[92px] shrink-0">
              <div
                className="text-[22px] font-semibold tracking-[-0.03em]"
                style={{ color: isToday ? 'var(--accent)' : 'var(--text)' }}
              >
                {dayNum(dateKey)}
              </div>
              <div className="text-[12px] capitalize" style={{ color: 'var(--text2)' }}>
                {format(keyToDate(dateKey), 'EEE · MMM', { locale: ptBR })}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                {w.icon} {w.temp}°
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              {events.map((ev) => {
                const cal = calendarOf(state, ev.calId);
                const travel = travelOf(ev);
                return (
                  <div
                    key={ev.id}
                    onClick={() => dispatch({ type: 'SET_SELECTED', id: ev.id })}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-[9px] border cursor-pointer hover:[box-shadow:var(--shadow)]"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderLeft: `2px solid ${cal?.color}` }}
                  >
                    <div className="w-[92px] shrink-0 text-[12px] font-mono-ae" style={{ color: 'var(--text2)' }}>
                      {ev.allDay ? 'dia inteiro' : hm(minutesOfDay(ev.startsAt), state.settings.timeFormat)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {ev.title}
                      </div>
                      <div
                        className="text-[12px] truncate max-w-[220px]"
                        style={{ color: 'var(--text3)' }}
                      >
                        {ev.location || cal?.name}
                        {travel ? ` · +${travel} min` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
