import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import { useAllEvents, useVisibleEvents } from '../store/selectors';
import { suggestBestTimes, type Suggestion } from '../lib/suggest';
import { formatDayLabel, hm } from '../lib/dates';

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
];

export function AIAssistant() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [priority, setPriority] = useState<'alta' | 'média' | 'baixa'>('média');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const pendingTasks = state.tasks.filter((t) => !t.done);
  const hidden = !!state.form || !!state.selected;

  function close() {
    dispatch({ type: 'SET_AI_OPEN', open: false });
    setSuggestions(null);
  }

  function runSuggest() {
    const results = suggestBestTimes(visibleEvents, duration, { priority, preferMorning: true });
    setSuggestions(results);
  }

  function pickTask(taskTitle: string, dur: number, prio: 'alta' | 'média' | 'baixa') {
    setTitle(taskTitle);
    setDuration(dur);
    setPriority(prio);
    setSuggestions(null);
  }

  function applySuggestion(s: Suggestion) {
    dispatch({
      type: 'OPEN_FORM',
      form: emptyCreateForm(s.dateKey, s.startMin, s.durationMin),
    });
    dispatch({ type: 'UPDATE_FORM', changes: { title: title.trim() || 'Novo evento' } });
    close();
  }

  return (
    <>
      {!hidden && (
        <button
          onClick={() => dispatch({ type: 'SET_AI_OPEN', open: !state.aiOpen })}
          className="fixed z-40 w-12 h-12 rounded-full grid place-items-center shadow-lg"
          style={{
            right: 16,
            bottom: 'calc(48px + env(safe-area-inset-bottom))',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
          aria-label="Assistente de horários"
        >
          <Sparkles size={19} style={{ color: 'var(--accent)' }} />
        </button>
      )}

      {state.aiOpen && !hidden && (
        <div
          className="fixed z-50 rounded-[16px] border p-4 animate-ae-pop flex flex-col gap-3"
          style={{
            right: 16,
            bottom: 'calc(108px + env(safe-area-inset-bottom))',
            left: state.w < 420 ? 16 : undefined,
            width: state.w < 420 ? undefined : 320,
            maxHeight: '70vh',
            overflowY: 'auto',
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: '0 30px 70px -20px rgba(0,0,0,0.45)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                Melhor horário
              </h3>
            </div>
            <button onClick={close} className="w-6 h-6 rounded-[7px] grid place-items-center" style={{ background: 'var(--surface2)' }}>
              <X size={12} style={{ color: 'var(--text2)' }} />
            </button>
          </div>

          <p className="text-[11.5px] leading-[1.5]" style={{ color: 'var(--text3)' }}>
            Sugestões calculadas a partir da sua agenda real (não é uma IA externa — roda tudo aqui no navegador).
          </p>

          {pendingTasks.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold mb-1.5" style={{ color: 'var(--text3)' }}>
                A partir de uma tarefa
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pendingTasks.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTask(t.title, t.dur, t.prio)}
                    className="text-[11px] font-semibold rounded-[7px] px-2 py-1 border"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que você quer agendar?"
            className="rounded-[10px] px-3 py-[9px] text-[13px] outline-none border"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />

          <div className="flex gap-1.5 flex-wrap">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className="text-[11.5px] font-semibold rounded-[7px] px-2.5 py-1 border"
                style={
                  duration === d.value
                    ? { background: 'var(--accent)', color: 'var(--accentText)', borderColor: 'var(--accent)' }
                    : { background: 'var(--surface2)', color: 'var(--text2)', borderColor: 'var(--border)' }
                }
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={runSuggest}
            className="rounded-[10px] py-2 text-[13px] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
          >
            Sugerir horários
          </button>

          {suggestions && (
            <div className="flex flex-col gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              {suggestions.length === 0 && (
                <p className="text-[12px] pt-2" style={{ color: 'var(--text3)' }}>
                  Não achei horários livres nos próximos 14 dias. Tente uma duração menor.
                </p>
              )}
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(s)}
                  className="flex flex-col items-start rounded-[10px] border px-3 py-2 text-left mt-1.5"
                  style={{ borderColor: i === 0 ? 'var(--accent)' : 'var(--border)', background: 'var(--surface2)' }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[12.5px] font-bold capitalize" style={{ color: 'var(--text)' }}>
                      {formatDayLabel(s.dateKey)}
                    </span>
                    <span className="text-[12px] font-mono-ae" style={{ color: 'var(--text2)' }}>
                      {hm(s.startMin, state.settings.timeFormat)}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                    {i === 0 ? '★ melhor opção · ' : ''}
                    {s.reason}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
