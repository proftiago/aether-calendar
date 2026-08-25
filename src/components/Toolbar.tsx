import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useStore } from '../store/store';
import { formatPeriodLabel, weekNumberOf } from '../lib/dates';
import { weatherOf } from '../lib/estimates';
import type { ViewKey } from '../lib/types';

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'agenda', label: 'Agenda' },
];

export function Toolbar() {
  const { state, dispatch } = useStore();
  const weather = weatherOf(state.cursor);
  const [moreOpen, setMoreOpen] = useState(false);
  const compact = state.w < 640;

  return (
    <div
      className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b flex-wrap relative"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => dispatch({ type: 'GO_TODAY' })}
        className="h-8 px-2.5 rounded-[7px] text-[12.5px] font-medium shrink-0 hover:[background:var(--surface2)]"
        style={{ color: 'var(--text2)' }}
      >
        Hoje
      </button>

      <div className="flex items-center h-8 shrink-0">
        <button
          onClick={() => dispatch({ type: 'NAV', dir: -1 })}
          className="w-7 h-full rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
          aria-label="Período anterior"
        >
          <ChevronLeft size={15} style={{ color: 'var(--text2)' }} />
        </button>
        <button
          onClick={() => dispatch({ type: 'NAV', dir: 1 })}
          className="w-7 h-full rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
          aria-label="Próximo período"
        >
          <ChevronRight size={15} style={{ color: 'var(--text2)' }} />
        </button>
      </div>

      <div className="text-[14px] sm:text-[16px] font-bold tracking-[-0.02em] capitalize truncate min-w-0 ml-0.5" style={{ color: 'var(--text)' }}>
        {formatPeriodLabel(state.view, state.cursor, state.settings.weekStartsOn)}
        {state.settings.showWeekNumbers && state.view === 'week' && state.w >= 560 && (
          <span className="ml-2 text-[12px] font-medium normal-case" style={{ color: 'var(--text3)' }}>
            Semana {weekNumberOf(state.cursor)}
          </span>
        )}
      </div>

      {state.w >= 480 && (
        <div className="flex items-center gap-1.5 text-[12px] shrink-0" style={{ color: 'var(--text3)' }}>
          <span>{weather.icon}</span>
          <span className="font-mono-ae">{weather.temp}°</span>
        </div>
      )}

      <div className="flex-1 basis-full sm:basis-0 order-3 sm:order-none" />

      <div
        className="flex items-center p-[2px] rounded-[9px] flex-1 sm:flex-initial min-w-0"
        style={{ background: 'var(--surface2)' }}
      >
        {VIEWS.map((v) => {
          const active = state.view === v.key;
          return (
            <button
              key={v.key}
              onClick={() => dispatch({ type: 'SET_VIEW', view: v.key })}
              className="h-7 flex-1 sm:flex-initial sm:px-3 rounded-[7px] text-[12px] sm:text-[12.5px] font-medium"
              style={
                active
                  ? { background: 'var(--surface)', color: 'var(--text)' }
                  : { color: 'var(--text3)' }
              }
            >
              {compact ? v.label.slice(0, 3) : v.label}
            </button>
          );
        })}
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="h-8 w-8 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
          aria-label="Mais opções"
        >
          <MoreHorizontal size={16} style={{ color: 'var(--text2)' }} />
        </button>
        {moreOpen && (
          <div
            className="absolute top-9 right-0 z-40 w-[220px] rounded-[12px] border p-1.5 animate-ae-pop"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <MenuItem
              onClick={() => {
                dispatch({ type: 'SET_PANEL', panel: 'free' });
                setMoreOpen(false);
              }}
            >
              Encontrar horário livre
            </MenuItem>
            <MenuItem
              onClick={() => {
                dispatch({ type: 'SET_PANEL', panel: 'link' });
                setMoreOpen(false);
              }}
            >
              Link de agendamento
            </MenuItem>
            <MenuItem
              onClick={() => {
                dispatch({ type: 'TOGGLE_WORK_ONLY' });
                setMoreOpen(false);
              }}
            >
              {state.workOnly ? 'Mostrar 24 horas' : 'Colapsar fora do horário'}
            </MenuItem>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-2.5 py-2 rounded-[8px] text-[13px] font-medium"
      style={{ color: 'var(--text)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}
