import { useRef, useState } from 'react';
import { Menu, Search, PanelRight } from 'lucide-react';
import { useStore } from '../store/store';
import { parseQuickAdd } from '../lib/nlParse';
import { calendarOf } from '../store/selectors';
import { hm, formatDayLabel, toUtcIso } from '../lib/dates';
import { isGoogleConfigured, buildGoogleAuthUrl } from '../lib/googleApi';
import { AccountMenu } from './AccountMenu';
import type { Event } from '../lib/types';

const GOOGLE_LABEL: Record<string, string> = {
  off: 'Conectar Google Calendar',
  sync: 'Sincronizando…',
  on: 'Google sincronizado',
};

export function Header() {
  const { state, dispatch } = useStore();
  const [focused, setFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = state.quick.trim() ? parseQuickAdd(state.quick) : null;
  const cal = parsed ? calendarOf(state, parsed.calId) : undefined;

  function createFromQuick() {
    if (!parsed) return;
    const startsAt = toUtcIso(parsed.dateKey, parsed.startMin);
    const endsAt = toUtcIso(parsed.dateKey, parsed.startMin + parsed.durationMin);
    const event: Event = {
      id: `local-${Date.now()}`,
      title: parsed.title,
      calId: parsed.calId,
      startsAt,
      endsAt,
      timeZone: 'America/Sao_Paulo',
      allDay: false,
      location: parsed.location,
      src: 'local',
    };
    dispatch({ type: 'ADD_EVENT', event, toast: `Evento criado: ${parsed.title}` });
    dispatch({ type: 'SET_QUICK', value: '' });
    inputRef.current?.blur();
  }

  return (
    <header
      className="flex items-center gap-3.5 px-4 py-2.5 flex-wrap border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="flex items-center gap-2.5 shrink-0"
        aria-label="Abrir menu"
      >
        <span
          className="w-[30px] h-[30px] rounded-[9px] grid place-items-center font-extrabold text-[15px]"
          style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
        >
          A
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-[15px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
            Aether
          </span>
          <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
            Calendar
          </span>
        </span>
        <Menu size={18} className="sm:hidden" style={{ color: 'var(--text2)' }} />
      </button>

      <div className="relative flex-1 min-w-[220px] basis-[320px]">
        <div
          className="h-10 flex items-center gap-2 rounded-[11px] px-2.5 border"
          style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <span className="text-[13px]" style={{ color: 'var(--text3)' }}>
            ⌘
          </span>
          <input
            ref={inputRef}
            id="quick-add-input"
            value={state.quick}
            onChange={(e) => dispatch({ type: 'SET_QUICK', value: e.target.value })}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createFromQuick();
            }}
            placeholder="Reunião com João amanhã 14h no Zoom"
            className="flex-1 bg-transparent outline-none text-[14px] min-w-0"
            style={{ color: 'var(--text)' }}
          />
          {state.quick.trim() && (
            <button
              onClick={createFromQuick}
              className="h-7 px-3 rounded-[8px] text-[12.5px] font-semibold shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
            >
              Criar
            </button>
          )}
        </div>

        {focused && parsed && (
          <div
            className="absolute top-[46px] left-0 right-0 z-10 rounded-[12px] border p-3.5 animate-ae-in"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-sm" style={{ background: cal?.color }} />
              <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                {parsed.title}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip>{formatDayLabel(parsed.dateKey)}</Chip>
              <Chip mono>
                {hm(parsed.startMin)} – {hm(parsed.startMin + parsed.durationMin)}
              </Chip>
              <Chip>{cal?.name}</Chip>
              {parsed.location && <Chip>{parsed.location}</Chip>}
            </div>
            <div className="mt-2 text-[11px]" style={{ color: 'var(--text3)' }}>
              Enter para criar
            </div>
          </div>
        )}
      </div>

      {(state.w >= 560 || searchOpen) && (
        <div
          className="h-9 flex items-center gap-1.5 rounded-[10px] px-2.5"
          style={{ background: 'var(--surface2)' }}
        >
          <Search size={14} style={{ color: 'var(--text3)' }} />
          <input
            value={state.search}
            onChange={(e) => dispatch({ type: 'SET_SEARCH', value: e.target.value })}
            onBlur={() => !state.search && setSearchOpen(false)}
            autoFocus={searchOpen}
            placeholder="Buscar"
            className="bg-transparent outline-none text-[13px] w-20 sm:w-24"
            style={{ color: 'var(--text)' }}
          />
        </div>
      )}
      {state.w < 560 && !searchOpen && (
        <button
          onClick={() => setSearchOpen(true)}
          className="w-9 h-9 rounded-[10px] border grid place-items-center shrink-0"
          style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
          aria-label="Buscar"
        >
          <Search size={15} style={{ color: 'var(--text2)' }} />
        </button>
      )}

      <button
        onClick={() => {
          if (state.google === 'off' && isGoogleConfigured()) {
            window.location.href = buildGoogleAuthUrl();
            return;
          }
          dispatch({ type: 'GOOGLE_TOGGLE' });
        }}
        className="h-9 flex items-center gap-2 rounded-[10px] px-2.5 sm:px-3 border text-[12.5px] font-semibold shrink-0"
        style={
          state.google === 'on'
            ? { background: 'color-mix(in oklab, var(--sync-ok) 14%, var(--surface))', borderColor: 'color-mix(in oklab, var(--sync-ok) 40%, transparent)', color: 'var(--text)' }
            : { background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }
        }
        aria-label={GOOGLE_LABEL[state.google]}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${state.google === 'sync' ? 'animate-ae-spin' : ''}`}
          style={{
            background: state.google === 'off' ? 'oklch(0.7 0.02 95)' : state.google === 'sync' ? 'var(--sync-progress)' : 'var(--sync-ok)',
          }}
        />
        {state.w >= 720 && GOOGLE_LABEL[state.google]}
      </button>

      {state.w >= 900 && (
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS' })}
          className="w-9 h-9 rounded-[10px] border grid place-items-center shrink-0"
          style={{
            background: state.shortcutsOpen ? 'var(--surface2)' : 'transparent',
            borderColor: state.shortcutsOpen ? 'var(--border)' : 'transparent',
          }}
          aria-label="Mostrar/ocultar atalhos"
        >
          <PanelRight size={16} style={{ color: 'var(--text2)' }} />
        </button>
      )}

      <AccountMenu />
    </header>
  );
}

function Chip({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={`text-[11.5px] rounded-[6px] px-2 py-[3px] ${mono ? 'font-mono-ae' : ''}`}
      style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
    >
      {children}
    </span>
  );
}
