import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useStore, buildRRuleFromForm } from '../store/store';
import { useGoogleSync } from '../hooks/useGoogleSync';
import { toUtcIso } from '../lib/dates';
import { hapticTick } from '../lib/haptics';
import type { Event } from '../lib/types';

const DOW_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function EventModal() {
  const { state, dispatch } = useStore();
  const { pushCreate, pushUpdate, pushDelete } = useGoogleSync();
  const [quickMode, setQuickMode] = useState<'evento' | 'foco'>('evento');
  const rawForm = state.form;
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const isOpen = !!rawForm;
    if (isOpen && !wasOpenRef.current) setQuickMode('evento');
    wasOpenRef.current = isOpen;
  }, [rawForm]);

  if (!rawForm) return null;
  const form = rawForm;

  function close() {
    dispatch({ type: 'CLOSE_FORM' });
  }

  function save() {
    const startsAt = toUtcIso(form.dateKey, form.allDay ? 0 : form.startMin);
    const endsAt = toUtcIso(form.dateKey, form.allDay ? 1440 : form.endMin);
    const rrule = buildRRuleFromForm(form);
    if (form.mode === 'create') {
      const event: Event = {
        id: `local-${Date.now()}`,
        title: form.title.trim() || 'Novo evento',
        calId: form.calId,
        startsAt,
        endsAt,
        timeZone: 'America/Sao_Paulo',
        allDay: form.allDay,
        location: form.location || undefined,
        notes: form.notes || undefined,
        rrule,
        src: 'local',
      };
      dispatch({ type: 'ADD_EVENT', event, toast: `Evento criado: ${event.title}` });
      pushCreate(event);
      hapticTick();
    } else if (form.id) {
      const existing = state.events.find((ev) => ev.id === form.id);
      const changes = {
        title: form.title.trim() || 'Novo evento',
        calId: form.calId,
        startsAt,
        endsAt,
        allDay: form.allDay,
        location: form.location || undefined,
        notes: form.notes || undefined,
        ...(form.editingSeries ? { rrule } : {}),
      };
      dispatch({
        type: 'PATCH_EVENT',
        id: form.id,
        changes,
        toast: form.editingSeries ? 'Série atualizada' : 'Evento atualizado',
      });
      if (existing) pushUpdate({ ...existing, ...changes });
    }
    close();
  }

  function remove() {
    if (form.id) {
      const existing = state.events.find((ev) => ev.id === form.id);
      dispatch({ type: 'REMOVE_EVENT', id: form.id, toast: form.editingSeries ? 'Série excluída' : 'Evento excluído' });
      if (existing) pushDelete(existing);
    }
    close();
  }

  const showRepeat = form.mode === 'create' || form.editingSeries;
  const sheet = state.w < 640;

  return (
    <div
      className={`fixed inset-0 z-[60] flex ${sheet ? 'items-end' : 'items-center'} justify-center ${sheet ? 'p-0' : 'p-5'} animate-ae-in`}
      style={{ background: 'color-mix(in oklab, #000 42%, transparent)' }}
      onClick={close}
    >
      <div
        className={`w-full overflow-y-auto ${sheet ? 'rounded-t-[18px] animate-ae-sheet' : 'rounded-[16px] animate-ae-pop'}`}
        style={{
          maxWidth: sheet ? '100%' : 460,
          maxHeight: sheet ? '88vh' : '90vh',
          padding: sheet ? '10px 20px 24px' : 20,
          paddingBottom: sheet ? 'calc(24px + env(safe-area-inset-bottom))' : 20,
          background: 'var(--surface)',
          boxShadow: '0 30px 70px -20px rgba(0,0,0,0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {sheet && (
          <div className="flex justify-center pb-3">
            <span className="w-9 h-1 rounded-full" style={{ background: 'var(--border)' }} />
          </div>
        )}
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-4" style={{ color: 'var(--text)' }}>
          {form.mode === 'create' ? 'Novo evento' : form.editingSeries ? 'Editar série' : 'Editar evento'}
        </h2>

        {sheet && form.mode === 'create' && (
          <div className="flex items-center p-[2px] rounded-[9px] mb-3" style={{ background: 'var(--surface2)' }}>
            <button
              onClick={() => setQuickMode('evento')}
              className="flex-1 h-9 rounded-[7px] text-[13px] font-medium"
              style={quickMode === 'evento' ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--text3)' }}
            >
              Evento
            </button>
            <button
              onClick={() => {
                setQuickMode('foco');
                const endMin = form.startMin + 90;
                dispatch({ type: 'UPDATE_FORM', changes: { endMin: endMin % 1440 } });
              }}
              className="flex-1 h-9 rounded-[7px] text-[13px] font-medium"
              style={quickMode === 'foco' ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--text3)' }}
            >
              Foco (90min)
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={form.title}
            onChange={(e) => dispatch({ type: 'UPDATE_FORM', changes: { title: e.target.value } })}
            placeholder="Título do evento"
            className="rounded-[10px] px-3 py-[11px] text-[16px] font-semibold outline-none border"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />

          <div className="flex gap-2">
            {state.calendars.map((c) => {
              const active = form.calId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => dispatch({ type: 'UPDATE_FORM', changes: { calId: String(c.id) } })}
                  className="flex-1 flex items-center gap-1.5 rounded-[9px] px-2 py-2 text-[13px] font-semibold border justify-center"
                  style={{
                    background: active ? `color-mix(in oklab, ${c.color} 15%, var(--surface2))` : 'var(--surface2)',
                    borderColor: active ? c.color : 'var(--border)',
                    borderWidth: active ? 1.5 : 1,
                    color: 'var(--text)',
                  }}
                >
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: c.color }} />
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Field label="Data" grow>
              <input
                type="date"
                value={form.dateKey}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', changes: { dateKey: e.target.value } })}
                className="w-full rounded-[10px] px-2.5 py-2 text-[13px] outline-none border"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </Field>
            <Field label="Início">
              <input
                type="time"
                disabled={form.allDay}
                value={minToHHMM(form.startMin)}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', changes: { startMin: hhmmToMin(e.target.value) } })}
                className="w-full rounded-[10px] px-2.5 py-2 text-[13px] outline-none border"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)', opacity: form.allDay ? 0.5 : 1 }}
              />
            </Field>
            <Field label="Fim">
              <input
                type="time"
                disabled={form.allDay}
                value={minToHHMM(form.endMin)}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', changes: { endMin: hhmmToMin(e.target.value) } })}
                className="w-full rounded-[10px] px-2.5 py-2 text-[13px] outline-none border"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)', opacity: form.allDay ? 0.5 : 1 }}
              />
            </Field>
          </div>

          <button
            onClick={() => dispatch({ type: 'UPDATE_FORM', changes: { allDay: !form.allDay } })}
            className="flex items-center gap-2 text-[13px] w-fit"
            style={{ color: 'var(--text)' }}
          >
            <span
              className="w-4 h-4 rounded-[5px] grid place-items-center border"
              style={{ background: form.allDay ? 'var(--accent)' : 'transparent', borderColor: form.allDay ? 'var(--accent)' : 'var(--border)' }}
            >
              {form.allDay && <Check size={12} strokeWidth={3.5} color="white" />}
            </span>
            Dia inteiro
          </button>

          {showRepeat && (
            <div className="rounded-[10px] border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
              <button
                onClick={() => {
                  const next = !form.repeat;
                  dispatch({
                    type: 'UPDATE_FORM',
                    changes: {
                      repeat: next,
                      repeatDows: next && form.repeatDows.length === 0 ? [new Date(`${form.dateKey}T00:00:00`).getDay()] : form.repeatDows,
                    },
                  });
                }}
                className="flex items-center gap-2 text-[13px] w-fit"
                style={{ color: 'var(--text)' }}
              >
                <span
                  className="w-4 h-4 rounded-[5px] grid place-items-center border"
                  style={{ background: form.repeat ? 'var(--accent)' : 'transparent', borderColor: form.repeat ? 'var(--accent)' : 'var(--border)' }}
                >
                  {form.repeat && <Check size={12} strokeWidth={3.5} color="white" />}
                </span>
                Repetir semanalmente
              </button>

              {form.repeat && (
                <div className="mt-2.5 flex flex-col gap-2.5">
                  <div className="flex gap-1.5">
                    {DOW_LABELS.map((label, dow) => {
                      const active = form.repeatDows.includes(dow);
                      return (
                        <button
                          key={dow}
                          onClick={() => {
                            const repeatDows = active ? form.repeatDows.filter((d) => d !== dow) : [...form.repeatDows, dow].sort();
                            dispatch({ type: 'UPDATE_FORM', changes: { repeatDows } });
                          }}
                          className="w-7 h-7 rounded-full text-[11px] font-semibold shrink-0"
                          style={
                            active
                              ? { background: 'var(--accent)', color: 'var(--accentText)' }
                              : { background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <Field label="Repetir até (opcional)">
                    <input
                      type="date"
                      value={form.repeatUntil}
                      onChange={(e) => dispatch({ type: 'UPDATE_FORM', changes: { repeatUntil: e.target.value } })}
                      className="w-full rounded-[10px] px-2.5 py-2 text-[13px] outline-none border"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          <input
            value={form.location}
            onChange={(e) => dispatch({ type: 'UPDATE_FORM', changes: { location: e.target.value } })}
            placeholder="Local ou videochamada"
            className="rounded-[10px] px-3 py-[10px] text-[13px] outline-none border"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />

          <textarea
            value={form.notes}
            onChange={(e) => dispatch({ type: 'UPDATE_FORM', changes: { notes: e.target.value } })}
            placeholder="Notas"
            rows={3}
            className="rounded-[10px] px-3 py-[10px] text-[13px] outline-none border resize-y"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div className="flex items-center justify-between mt-5">
          {form.mode === 'edit' ? (
            <button onClick={remove} className="text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>
              {form.editingSeries ? 'Excluir série' : 'Excluir'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={close}
              className="rounded-[10px] px-5 py-[11px] text-[13px] font-semibold"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
            >
              Cancelar
            </button>
            <button
              onClick={save}
              className="rounded-[10px] px-5 py-[11px] text-[13px] font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div className={grow ? 'flex-1 basis-[130px]' : 'basis-[100px]'}>
      <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
