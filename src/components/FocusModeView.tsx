import { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, RotateCcw, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents } from '../store/selectors';
import { dateKeyOf, todayKey } from '../lib/dates';

type TimerMode = 'pomodoro' | 'short' | 'long' | 'task';

const MODE_MINUTES: Record<TimerMode, number> = { pomodoro: 25, short: 5, long: 15, task: 0 };
const MODE_LABELS: Record<TimerMode, string> = { pomodoro: 'Pomodoro', short: 'Pausa curta', long: 'Pausa longa', task: 'Timer livre' };

/**
 * Timer de Foco / Pomodoro — imagem de fundo é um gradiente (não uma foto
 * de banco de imagem, pra não depender de licenciamento externo), o resto
 * é funcionalidade real: contagem regressiva de verdade, 4 modos, conta
 * quantas sessões de foco você já fez hoje, mostra e permite marcar as
 * tarefas de hoje sem sair da tela.
 */
export function FocusModeView() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const today = todayKey();

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [secondsLeft, setSecondsLeft] = useState(MODE_MINUTES.pomodoro * 60);
  const [taskSeconds, setTaskSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(1);
  const [tasksOpen, setTasksOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const todaysTasks = state.tasks.filter((t) => !t.archived && (!t.dueDate || t.dueDate === today));
  const todaysEventsCount = visibleEvents.filter((ev) => dateKeyOf(ev.startsAt) === today).length;

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      if (mode === 'task') {
        setTaskSeconds((s) => s + 1);
        return;
      }
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          if (mode === 'pomodoro') setSessionsToday((n) => n + 1);
          return MODE_MINUTES[mode] * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  function switchMode(m: TimerMode) {
    setMode(m);
    setRunning(false);
    setSecondsLeft(MODE_MINUTES[m] * 60);
    setTaskSeconds(0);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(MODE_MINUTES[mode] * 60);
    setTaskSeconds(0);
  }

  function exit() {
    dispatch({ type: 'SET_FOCUS_MODE', on: false });
  }

  const displaySeconds = mode === 'task' ? taskSeconds : secondsLeft;
  const mm = String(Math.floor(displaySeconds / 60)).padStart(2, '0');
  const ss = String(displaySeconds % 60).padStart(2, '0');

  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

  return (
    <div
      className="flex-1 relative overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #f3d2ba 0%, #eab595 30%, #dd9a86 55%, #c67a72 75%, #a85f5f 100%)' }}
    >
      {/* Textura de dunas — SVG decorativo, não uma foto */}
      <svg className="absolute bottom-0 left-0 w-full" style={{ height: '45%' }} viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 220 Q 300 140, 600 200 T 1200 180 V 400 H 0 Z" fill="#b5715f" opacity="0.55" />
        <path d="M0 280 Q 350 220, 700 270 T 1200 250 V 400 H 0 Z" fill="#9a5c52" opacity="0.65" />
        <path d="M0 340 Q 400 300, 800 330 T 1200 320 V 400 H 0 Z" fill="#7d4a45" opacity="0.8" />
      </svg>

      <button
        onClick={exit}
        className="absolute top-5 left-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
        style={{ background: 'rgba(255,255,255,0.35)', color: 'white', backdropFilter: 'blur(6px)' }}
      >
        <X size={13} />
        Sair
      </button>

      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center p-1 rounded-full mb-8" style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)' }}>
          {(['pomodoro', 'short', 'long', 'task'] as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="h-8 px-3.5 rounded-full text-[12.5px] font-medium"
              style={mode === m ? { background: 'white', color: '#4a2c28' } : { color: 'rgba(255,255,255,0.85)' }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="text-white font-bold tracking-[-0.02em] mb-6" style={{ fontSize: 96, fontVariantNumeric: 'tabular-nums' }}>
          {mm}:{ss}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className="w-12 h-12 rounded-full grid place-items-center"
            style={{ background: 'white', color: '#4a2c28' }}
            aria-label={running ? 'Pausar' : 'Iniciar'}
          >
            {running ? <Pause size={18} fill="#4a2c28" /> : <Play size={18} fill="#4a2c28" style={{ marginLeft: 2 }} />}
          </button>
          <button
            onClick={reset}
            className="w-11 h-11 rounded-full grid place-items-center"
            style={{ background: 'rgba(255,255,255,0.35)', color: 'white', backdropFilter: 'blur(6px)' }}
            aria-label="Reiniciar"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10">
        <button
          onClick={() => setTasksOpen((v) => !v)}
          className="rounded-[12px] px-3.5 py-2.5 text-left"
          style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(10px)', minWidth: 160 }}
        >
          <div className="text-[13px] font-semibold text-white mb-0.5">Hoje | {dateLabel}</div>
          <div className="text-[11.5px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {todaysTasks.length} tarefas agendadas
            <ChevronRight size={11} style={{ transform: tasksOpen ? 'rotate(90deg)' : undefined }} />
          </div>
        </button>
        {tasksOpen && (
          <div
            className="mt-2 w-[260px] rounded-[12px] p-3 animate-ae-pop"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)' }}
          >
            {todaysTasks.length === 0 ? (
              <p className="text-[12.5px] text-center py-2" style={{ color: '#8a6f6a' }}>
                Nenhuma tarefa por hoje.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {todaysTasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'TOGGLE_TASK', id: t.id })} />
                    <span
                      className="text-[13px] truncate"
                      style={{ color: '#3a2a26', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}
                    >
                      {t.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
        Foco #{sessionsToday} · {todaysEventsCount} {todaysEventsCount === 1 ? 'evento' : 'eventos'} hoje
      </div>

      <button
        onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' })}
        className="absolute bottom-6 right-6 z-10 w-8 h-8 rounded-full grid place-items-center"
        style={{ background: 'rgba(255,255,255,0.35)', color: 'white', backdropFilter: 'blur(6px)' }}
        aria-label="Configurações"
      >
        <SettingsIcon size={14} />
      </button>
    </div>
  );
}
