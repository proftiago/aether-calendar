import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import { useSmartReschedule } from '../hooks/useSmartReschedule';
import { formatPeriodLabel, weekNumberOf } from '../lib/dates';
import { weatherOf } from '../lib/estimates';
import { AccountMenu } from './AccountMenu';
import type { ViewKey } from '../lib/types';

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'agenda', label: 'Agenda' },
];

export function Toolbar() {
  const { state, dispatch } = useStore();
  const { resolveConflicts } = useSmartReschedule();
  const weather = weatherOf(state.cursor);
  const [moreOpen, setMoreOpen] = useState(false);
  const compact = state.w < 640;

  const nav = (
    <>
      <button
        onClick={() => dispatch({ type: 'GO_TODAY' })}
        className="h-8 px-2.5 rounded-[7px] text-[13px] font-medium shrink-0 hover:[background:var(--surface2)]"
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

      <div className="text-[14px] sm:text-[16px] font-semibold tracking-[-0.02em] capitalize truncate min-w-0 ml-0.5" style={{ color: 'var(--text)' }}>
        {formatPeriodLabel(state.view, state.cursor, state.settings.weekStartsOn)}
        {state.settings.showWeekNumbers && state.view === 'week' && state.w >= 560 && (
          <span className="ml-2 text-[12px] font-medium normal-case" style={{ color: 'var(--text3)' }}>
            Semana {weekNumberOf(state.cursor)}
          </span>
        )}
      </div>

      {state.w >= 480 && (
        <div className="flex items-center gap-1.5 text-[12px] shrink-0 ml-auto sm:ml-0" style={{ color: 'var(--text3)' }}>
          <span>{weather.icon}</span>
          <span className="font-mono-ae">{weather.temp}°</span>
        </div>
      )}
    </>
  );

  const moreMenuButton = (
    <div className="relative shrink-0">
      <button
        onClick={() => setMoreOpen((o) => !o)}
        className="h-8 w-8 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
        aria-label="Mais opções"
      >
        <MoreHorizontal size={15} style={{ color: 'var(--text2)' }} />
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
          <MenuItem
            onClick={() => {
              resolveConflicts();
              setMoreOpen(false);
            }}
          >
            Reorganizar conflitos de agenda
          </MenuItem>
        </div>
      )}
    </div>
  );

  // Visão mobile/tablet estreito: abas seguem como estavam (testado e
  // livre de bug de sobreposição em telas pequenas — não mexi aqui).
  const compactViewSwitcher = (
    <>
      <div className="flex items-center p-[2px] rounded-[9px] flex-1 min-w-0" style={{ background: 'var(--surface2)' }}>
        {VIEWS.map((v) => {
          const active = state.view === v.key;
          return (
            <button
              key={v.key}
              onClick={() => dispatch({ type: 'SET_VIEW', view: v.key })}
              className="h-9 flex-1 sm:flex-initial sm:px-3 rounded-[7px] text-[12px] sm:text-[13px] font-medium"
              style={active ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--text3)' }}
            >
              {v.label.slice(0, 3)}
            </button>
          );
        })}
      </div>
      {moreMenuButton}
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-col border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1.5">{nav}</div>
        <div className="flex items-center gap-1.5 px-3 pb-2">{compactViewSwitcher}</div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-4 py-2 border-b"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      {nav}
      <div className="flex-1" />

      <div className="relative shrink-0">
        <select
          value={state.view}
          onChange={(e) => dispatch({ type: 'SET_VIEW', view: e.target.value as ViewKey })}
          className="h-9 appearance-none rounded-[8px] pl-3 pr-7 text-[13px] font-medium outline-none cursor-pointer"
          style={{ background: 'var(--surface2)', color: 'var(--text)' }}
        >
          {VIEWS.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text3)' }} />
      </div>

      {moreMenuButton}

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('aether:open-search'))}
        className="h-8 w-8 rounded-[7px] grid place-items-center hover:[background:var(--surface2)] shrink-0"
        aria-label="Buscar"
      >
        <Search size={15} style={{ color: 'var(--text2)' }} />
      </button>

      <button
        onClick={() => dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(state.cursor) })}
        className="h-8 flex items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold shrink-0"
        style={{ background: 'var(--gold)', color: 'var(--goldText)' }}
      >
        <Plus size={14} strokeWidth={2.5} />
        Novo
      </button>

      <AccountMenu />
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
