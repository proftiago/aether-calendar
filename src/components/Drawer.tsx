import { useState } from 'react';
import { X, Share2, Copy, Check } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import { useGoogleSync } from '../hooks/useGoogleSync';
import { useAllEvents, calendarOf } from '../store/selectors';
import { formatDayLabel, hm, minutesOfDay, dateKeyOf } from '../lib/dates';
import { travelOf } from '../lib/estimates';
import { weekdayLabelsPtBR } from '../lib/recurrence';
import { duplicateEvent } from '../lib/duplicateEvent';
import { splitTextAndLinks } from '../lib/linkify';

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google Calendar',
  local: 'Aether local',
  task: 'Tarefa agendada',
};

export function Drawer() {
  const { state, dispatch } = useStore();
  const { pushDelete, pushCreate, pushUpdate } = useGoogleSync();
  const allEvents = useAllEvents(state);
  const event = allEvents.find((e) => e.id === state.selected);
  const overlay = state.w < 1240;
  const [editChoiceOpen, setEditChoiceOpen] = useState(false);
  const [deleteChoiceOpen, setDeleteChoiceOpen] = useState(false);
  const [googleSeriesChoiceOpen, setGoogleSeriesChoiceOpen] = useState(false);
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
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
  // série que se repete DE VERDADE no Google (criada lá, não no Aether) —
  // cada ocorrência chega como evento separado e independente, sem rrule
  // local nenhum. Não dá pra "editar toda a série" nesse caso (exigiria
  // mexer na API do Google de um jeito bem mais complexo), mas dá pra
  // aplicar uma troca de calendário a esta e às próximas ocorrências.
  const isGoogleRecurringInstance = !isRecurringInstance && !!event.googleRecurringEventId;

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

  function toggleDone() {
    dispatch({ type: 'PATCH_EVENT', id: event!.id, changes: { done: !event!.done } });
    pushUpdate({ ...event!, done: !event!.done });
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

        {event.location && (
          <div className="rounded-[10px] overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <iframe
              title={`Mapa de ${event.location}`}
              className="w-full h-[130px] block"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
            />
          </div>
        )}

        {event.notes && (
          <p
            className="text-[13px] leading-[1.55] rounded-[10px] p-3 break-words"
            style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
          >
            {splitTextAndLinks(event.notes).map((part, i) =>
              typeof part === 'string' ? (
                <span key={i}>{part}</span>
              ) : (
                <a
                  key={i}
                  href={part.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => e.stopPropagation()}
                  className="underline font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  {part.url}
                </a>
              ),
            )}
          </p>
        )}

        <div className="flex gap-2 mt-1">
          <button
            onClick={toggleDone}
            className="w-11 shrink-0 rounded-[10px] py-2.5 grid place-items-center"
            style={{
              background: event.done ? 'var(--sync-ok)' : 'var(--surface2)',
              color: event.done ? '#ffffff' : 'var(--text)',
            }}
            aria-label={event.done ? 'Marcar como não concluído' : 'Marcar como concluído'}
            title={event.done ? 'Concluído' : 'Marcar como concluído'}
          >
            <Check size={15} />
          </button>
          <button
            onClick={() => {
              if (isRecurringInstance) setEditChoiceOpen(true);
              else if (isGoogleRecurringInstance) setGoogleSeriesChoiceOpen(true);
              else edit();
            }}
            className="flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}
          >
            Editar
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
            onClick={() => (isRecurringInstance ? setDeleteChoiceOpen(true) : remove())}
            className="flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold border"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            Excluir
          </button>
        </div>

        {deleteChoiceOpen && (
          <>
            <div className="fixed inset-0 z-[65]" onClick={() => setDeleteChoiceOpen(false)} />
            <div
              className="absolute left-4 right-4 z-[66] rounded-[14px] border p-2 animate-ae-pop"
              style={{ bottom: 88, background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <p className="text-[12px] px-2 pt-1 pb-2" style={{ color: 'var(--text3)' }}>
                Este evento se repete. O que você quer excluir?
              </p>
              <button
                onClick={() => {
                  setDeleteChoiceOpen(false);
                  remove();
                }}
                className="w-full text-left rounded-[9px] px-2.5 py-2.5 text-[13px] font-medium hover:[background:var(--surface2)]"
                style={{ color: 'var(--danger)' }}
              >
                Só esta ocorrência
              </button>
              <button
                onClick={() => {
                  setDeleteChoiceOpen(false);
                  removeSeries();
                }}
                className="w-full text-left rounded-[9px] px-2.5 py-2.5 text-[13px] font-medium hover:[background:var(--surface2)]"
                style={{ color: 'var(--danger)' }}
              >
                Toda a série
              </button>
            </div>
          </>
        )}

        {editChoiceOpen && (
          <>
            <div className="fixed inset-0 z-[65]" onClick={() => setEditChoiceOpen(false)} />
            <div
              className="absolute left-4 right-4 z-[66] rounded-[14px] border p-2 animate-ae-pop"
              style={{ bottom: 88, background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <p className="text-[12px] px-2 pt-1 pb-2" style={{ color: 'var(--text3)' }}>
                Este evento se repete. O que você quer editar?
              </p>
              <button
                onClick={() => {
                  setEditChoiceOpen(false);
                  edit();
                }}
                className="w-full text-left rounded-[9px] px-2.5 py-2.5 text-[13px] font-medium hover:[background:var(--surface2)]"
                style={{ color: 'var(--text)' }}
              >
                Só esta ocorrência
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  As outras semanas continuam como estavam
                </span>
              </button>
              <button
                onClick={() => {
                  setEditChoiceOpen(false);
                  editSeries();
                }}
                className="w-full text-left rounded-[9px] px-2.5 py-2.5 text-[13px] font-medium hover:[background:var(--surface2)]"
                style={{ color: 'var(--text)' }}
              >
                Toda a série
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  Vale pra essa e todas as próximas ocorrências
                </span>
              </button>
            </div>
          </>
        )}

        {googleSeriesChoiceOpen && (
          <>
            <div className="fixed inset-0 z-[65]" onClick={() => setGoogleSeriesChoiceOpen(false)} />
            <div
              className="absolute left-4 right-4 z-[66] rounded-[14px] border p-2 animate-ae-pop"
              style={{ bottom: 88, background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <p className="text-[12px] px-2 pt-1 pb-2" style={{ color: 'var(--text3)' }}>
                Este evento se repete no Google Calendar. O que você quer fazer?
              </p>
              <button
                onClick={() => {
                  setGoogleSeriesChoiceOpen(false);
                  edit();
                }}
                className="w-full text-left rounded-[9px] px-2.5 py-2.5 text-[13px] font-medium hover:[background:var(--surface2)]"
                style={{ color: 'var(--text)' }}
              >
                Editar só este evento
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  Título, horário, local — só desta ocorrência
                </span>
              </button>
              <button
                onClick={() => {
                  setGoogleSeriesChoiceOpen(false);
                  setCalendarPickerOpen(true);
                }}
                className="w-full text-left rounded-[9px] px-2.5 py-2.5 text-[13px] font-medium hover:[background:var(--surface2)]"
                style={{ color: 'var(--text)' }}
              >
                Mudar calendário desta e das próximas
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  Não muda título nem horário, só o calendário — pra essa e todas as ocorrências futuras
                </span>
              </button>
            </div>
          </>
        )}

        {calendarPickerOpen && (
          <>
            <div className="fixed inset-0 z-[65]" onClick={() => setCalendarPickerOpen(false)} />
            <div
              className="absolute left-4 right-4 z-[66] rounded-[14px] border p-3 animate-ae-pop"
              style={{ bottom: 88, background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <p className="text-[12px] px-1 pb-2" style={{ color: 'var(--text3)' }}>
                Mudar pra qual calendário? (esta e as próximas ocorrências)
              </p>
              <div className="flex flex-col gap-1">
                {state.calendars.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCalendarPickerOpen(false);
                      dispatch({
                        type: 'BULK_SET_CALENDAR_FOR_GOOGLE_SERIES',
                        googleRecurringEventId: event.googleRecurringEventId!,
                        fromDateKey: dateKeyOf(event.startsAt),
                        calId: String(c.id),
                      });
                    }}
                    className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] font-medium hover:[background:var(--surface2)]"
                    style={{ color: 'var(--text)' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </>
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
