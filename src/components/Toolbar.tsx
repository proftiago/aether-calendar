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
      className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b flex-wrap relative"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => dispatch({ type: 'GO_TODAY' })}
        className="h-9 px-3 rounded-[9px] text-[12.5px] font-semibold shrink-0"
        style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
      >
        Hoje
      </button>

      <div className="flex items-center h-9 shrink-0">
        <button
          onClick={() => dispatch({ type: 'NAV', dir: -1 })}
          className="w-9 h-full rounded-l-[9px] rounded-r-[3px] grid place-items-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRight: 'none' }}
          aria-label="Período anterior"
        >
          <ChevronLeft size={15} style={{ color: 'var(--text2)' }} />
        </button>
        <button
          onClick={() => dispatch({ type: 'NAV', dir: 1 })}
          className="w-9 h-full rounded-r-[9px] rounded-l-[3px] grid place-items-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          aria-label="Próximo período"
        >
          <ChevronRight size={15} style={{ color: 'var(--text2)' }} />
        </button>
      </div>

      <div className="text-[15px] sm:text-[17px] font-bold tracking-[-0.02em] capitalize truncate min-w-0" style={{ color: 'var(--text)' }}>
        {formatPeriodLabel(state.view, state.cursor, state.settings.weekStartsOn)}
        {state.settings.showWeekNumbers && state.view === 'week' && state.w >= 560 && (
          <span className="ml-2 text-[12px] font-semibold normal-case" style={{ color: 'var(--text3)' }}>
            Semana {weekNumberOf(state.cursor)}
          </span>
        )}
      </div>

      {state.w >= 480 && (
        <div className="flex items-center gap-1.5 text-[12px] shrink-0" style={{ color: 'var(--text2)' }}>
          <span>{weather.icon}</span>
          <span className="font-mono-ae">{weather.temp}°</span>
          {state.w >= 900 && <span style={{ color: 'var(--text3)' }}>{weather.label}</span>}
        </div>
      )}

      <div className="flex-1 basis-full sm:basis-0 order-3 sm:order-none" />

      <div
        className="flex items-center p-[3px] rounded-[10px] border flex-1 sm:flex-initial min-w-0"
        style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        {VIEWS.map((v) => {
          const active = state.view === v.key;
          return (
            <button
              key={v.key}
              onClick={() => dispatch({ type: 'SET_VIEW', view: v.key })}
              className="h-8 flex-1 sm:flex-initial sm:px-3 rounded-[7px] text-[12px] sm:text-[12.5px] font-semibold"
              style={
                active
                  ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                  : { color: 'var(--text3)' }
              }
            >
              {compact ? v.label.slice(0, 3) : v.label}
            </button>
          );
        })}
      </div>

      {compact ? (
        <div className="relative shrink-0">
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className="h-9 w-9 rounded-[9px] border grid place-items-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            aria-label="Mais opções"
          >
            <MoreHorizontal size={16} style={{ color: 'var(--text2)' }} />
          </button>
          {moreOpen && (
            <div
              className="absolute top-11 right-0 z-40 w-[220px] rounded-[12px] border p-1.5 animate-ae-pop"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
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
      ) : (
        <>
          <button
            onClick={() => dispatch({ type: 'SET_PANEL', panel: 'free' })}
            className="h-9 px-3 rounded-[9px] text-[12.5px] font-semibold border shrink-0"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Encontrar horário livre
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_PANEL', panel: 'link' })}
            className="h-9 px-3 rounded-[9px] text-[12.5px] font-semibold border shrink-0"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Link de agendamento
          </button>
        </>
      )}
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
