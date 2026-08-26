import { X, Share2, Copy } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import { useGoogleSync } from '../hooks/useGoogleSync';
import { useAllEvents, calendarOf } from '../store/selectors';
import { formatDayLabel, hm, minutesOfDay, dateKeyOf } from '../lib/dates';
import { travelOf } from '../lib/estimates';
import { weekdayLabelsPtBR } from '../lib/recurrence';
import { duplicateEvent } from '../lib/duplicateEvent';

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google Calendar',
  local: 'Aether local',
  task: 'Tarefa agendada',
};

export function Drawer() {
  const { state, dispatch } = useStore();
  const { pushDelete, pushCreate } = useGoogleSync();
  const allEvents = useAllEvents(state);
  const event = allEvents.find((e) => e.id === state.selected);
  const overlay = state.w < 1240;
  const fullWidth = state.w < 480;

  if (!event) return null;

  const cal = calendarOf(state, event.calId);
  const dateKey = dateKeyOf(event.startsAt);
  const s = minutesOfDay(event.startsAt);
  const e = minutesOfDay(event.endsAt);
  const travel = travelOf(event);
  const source = event.fromTaskId ? 'task' : event.src ?? 'local';

  // eventos expandidos de série perdem o rrule (ver lib/recurrence#expandSeries) —
  // buscamos a série original pelo seriesId para exibir a repetição corretamente.
  const originalSeries = event.seriesId ? state.events.find((ev) => ev.id === event.seriesId) : undefined;
  const isRecurringInstance = !!originalSeries;

  function close() {
    dispatch({ type: 'SET_SELECTED', id: null });
  }

  function edit() {
    dispatch({
      type: 'OPEN_FORM',
      form: {
        ...emptyCreateForm(dateKey, s, e - s, String(event!.calId)),
        mode: 'edit',
        id: event!.id,
        title: event!.title,
        allDay: event!.allDay,
        location: event!.location ?? '',
        notes: event!.notes ?? '',
      },
    });
  }

  function editSeries() {
    if (!originalSeries) return;
    const seriesDateKey = dateKeyOf(originalSeries.startsAt);
    const seriesS = minutesOfDay(originalSeries.startsAt);
    const seriesE = minutesOfDay(originalSeries.endsAt);
    dispatch({
      type: 'OPEN_FORM',
      form: {
        mode: 'edit',
        id: originalSeries.id,
        editingSeries: true,
        title: originalSeries.title,
        calId: String(originalSeries.calId),
        dateKey: seriesDateKey,
        startMin: seriesS,
        endMin: seriesE,
        allDay: originalSeries.allDay,
        location: originalSeries.location ?? '',
        notes: originalSeries.notes ?? '',
        repeat: true,
        repeatDows: originalSeries.rrule?.dows ?? [],
        repeatUntil: originalSeries.rrule?.until ? dateKeyOf(originalSeries.rrule.until) : '',
      },
    });
  }

  function remove() {
    dispatch({ type: 'REMOVE_EVENT', id: event!.id, toast: 'Evento excluído' });
    pushDelete(event!);
  }

  async function share() {
    const lines = [
      event!.title,
      event!.allDay ? `Dia inteiro · ${formatDayLabel(dateKey)}` : `${hm(s)} – ${hm(e)} · ${formatDayLabel(dateKey)}`,
      event!.location ? `Local: ${event!.location}` : null,
      event!.meet ? event!.meet : null,
    ].filter(Boolean);
    try {
      await navigator.share({ title: event!.title, text: lines.join('\n') });
    } catch {
      // usuário cancelou o compartilhamento, ou o navegador recusou — sem toast de erro, é comportamento normal
    }
  }

  function duplicate() {
    const copy = duplicateEvent(event!);
    dispatch({ type: 'ADD_EVENT', event: copy, toast: 'Evento duplicado' });
    dispatch({ type: 'SET_SELECTED', id: copy.id });
    pushCreate(copy);
  }

  function removeSeries() {
    if (!originalSeries) return;
    dispatch({ type: 'REMOVE_EVENT', id: originalSeries.id, toast: 'Série excluída' });
    pushDelete(originalSeries);
  }

  return (
    <div
      className={`shrink-0 overflow-y-auto animate-ae-in border-l ${overlay ? 'absolute inset-y-0 right-0 z-20' : 'relative w-[320px]'}`}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: overlay ? 'var(--shadow)' : undefined,
        width: overlay ? (fullWidth ? '100%' : 320) : undefined,
      }}
    >
      <div className="p-4 flex flex-col gap-3.5">
        <div className="flex items-start gap-2.5">
          <span className="w-2.5 h-2.5 rounded-sm mt-1.5 shrink-0" style={{ background: cal?.color }} />
          <h2 className="text-[18px] font-semibold flex-1 leading-tight" style={{ color: 'var(--text)' }}>
            {event.title}
          </h2>
          <button
            onClick={close}
            className="w-7 h-7 rounded-[8px] grid place-items-center shrink-0"
            style={{ background: 'var(--surface2)' }}
            aria-label="Fechar"
          >
            <X size={15} style={{ color: 'var(--text2)' }} />
          </button>
        </div>

        <Row label="Quando">
          {event.allDay ? `Dia inteiro · ${formatDayLabel(dateKey)}` : `${hm(s, state.settings.timeFormat)} – ${hm(e, state.settings.timeFormat)} · ${formatDayLabel(dateKey)}`}
        </Row>
        <Row label="Calendário">{cal?.name}</Row>
        {event.location && <Row label="Local">{event.location}</Row>}
        {travel && (
          <Row label="Deslocamento">
            <span style={{ color: 'var(--travel)', fontWeight: 700 }}>+{travel} min de trânsito</span>
          </Row>
        )}
        {originalSeries?.rrule && <Row label="Repetição">Semanal · {weekdayLabelsPtBR(originalSeries.rrule.dows)}</Row>}
        <Row label="Origem">{SOURCE_LABEL[source] ?? 'Aether local'}</Row>

        {event.meet && (
          <a
            href={event.meet}
            target="_blank"
            rel="noreferrer"
            className="w-full text-center rounded-[10px] py-2.5 text-[13px] font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
          >
            Entrar na reunião
          </a>
        )}

        {event.notes && (
          <p
            className="text-[13px] leading-[1.55] rounded-[10px] p-3"
            style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
          >
            {event.notes}
          </p>
        )}

        <div className="flex gap-2 mt-1">
          <button
            onClick={edit}
            className="flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}
          >
            {isRecurringInstance ? 'Editar este' : 'Editar'}
          </button>
          <button
            onClick={duplicate}
            className="w-11 shrink-0 rounded-[10px] py-2.5 grid place-items-center"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}
            aria-label="Duplicar evento"
            title="Duplicar"
          >
            <Copy size={15} />
          </button>
          {typeof navigator !== 'undefined' && !!navigator.share && (
            <button
              onClick={share}
              className="w-11 shrink-0 rounded-[10px] py-2.5 grid place-items-center"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              aria-label="Compartilhar evento"
              title="Compartilhar"
            >
              <Share2 size={15} />
            </button>
          )}
          <button
            onClick={remove}
            className="flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold border"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            {isRecurringInstance ? 'Excluir este' : 'Excluir'}
          </button>
        </div>

        {isRecurringInstance && (
          <div className="flex gap-2 -mt-1.5">
            <button onClick={editSeries} className="flex-1 text-[12px] font-semibold py-1" style={{ color: 'var(--text3)' }}>
              Editar toda a série
            </button>
            <button onClick={removeSeries} className="flex-1 text-[12px] font-semibold py-1" style={{ color: 'var(--text3)' }}>
              Excluir toda a série
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-[13px]">
      <span className="w-[76px] shrink-0" style={{ color: 'var(--text3)' }}>
        {label}
      </span>
      <span style={{ color: 'var(--text)' }}>{children}</span>
    </div>
  );
}
