import { useRef, useState } from 'react';
import { Menu, Search, PanelRight, Command, Sparkles } from 'lucide-react';
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
      className="flex items-center gap-2 px-3 py-2 flex-wrap border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="w-8 h-8 rounded-[8px] grid place-items-center shrink-0 hover:[background:var(--surface2)]"
        aria-label="Abrir menu"
      >
        <span
          className="hidden sm:grid w-[26px] h-[26px] rounded-[7px] place-items-center font-semibold text-[13px]"
          style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
        >
          A
        </span>
        <Menu size={17} className="sm:hidden" style={{ color: 'var(--text2)' }} />
      </button>

      <div className="relative flex-1 min-w-[200px] basis-[300px]">
        <div
          className="h-9 flex items-center gap-2 rounded-[9px] px-2.5 transition-colors"
          style={{ background: focused ? 'var(--surface2)' : 'transparent' }}
        >
          <Search size={12} style={{ color: 'var(--text3)' }} />
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
              className="h-6 px-2.5 rounded-[7px] text-[12px] font-semibold shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
            >
              Criar
            </button>
          )}
        </div>

        {focused && parsed && (
          <div
            className="absolute top-[42px] left-0 right-0 z-10 rounded-[12px] border p-3.5 animate-ae-in"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-sm" style={{ background: cal?.color }} />
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
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

      {state.w >= 560 && (
        <div className="h-8 flex items-center gap-1.5 rounded-[8px] px-2" style={{ background: 'var(--surface2)' }}>
          <Search size={12} style={{ color: 'var(--text3)' }} />
          <input
            value={state.search}
            onChange={(e) => dispatch({ type: 'SET_SEARCH', value: e.target.value })}
            placeholder="Buscar"
            className="bg-transparent outline-none text-[13px] w-20 sm:w-24"
            style={{ color: 'var(--text)' }}
          />
        </div>
      )}
      {state.w < 560 && searchOpen && (
        <div className="h-8 flex items-center gap-1.5 rounded-[8px] px-2" style={{ background: 'var(--surface2)' }}>
          <Search size={12} style={{ color: 'var(--text3)' }} />
          <input
            value={state.search}
            onChange={(e) => dispatch({ type: 'SET_SEARCH', value: e.target.value })}
            onBlur={() => !state.search && setSearchOpen(false)}
            autoFocus
            placeholder="Buscar"
            className="bg-transparent outline-none text-[13px] w-20"
            style={{ color: 'var(--text)' }}
          />
        </div>
      )}
      {state.w < 560 && !searchOpen && (
        <button
          onClick={() => setSearchOpen(true)}
          className="w-8 h-8 rounded-[8px] grid place-items-center shrink-0 hover:[background:var(--surface2)]"
          aria-label="Buscar"
        >
          <Search size={15} style={{ color: 'var(--text2)' }} />
        </button>
      )}

      {state.w >= 640 && (
        <button
          onClick={() => {
            if (state.google === 'off' && isGoogleConfigured()) {
              window.location.href = buildGoogleAuthUrl();
              return;
            }
            dispatch({ type: 'GOOGLE_TOGGLE' });
          }}
          className="h-8 flex items-center gap-1.5 rounded-[8px] px-2 text-[12px] font-medium shrink-0 hover:[background:var(--surface2)]"
          style={{ color: 'var(--text2)' }}
          aria-label={GOOGLE_LABEL[state.google]}
        >
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${state.google === 'sync' ? 'animate-ae-spin' : ''}`}
            style={{
              background: state.google === 'off' ? 'oklch(0.7 0.02 95)' : state.google === 'sync' ? 'var(--sync-progress)' : 'var(--sync-ok)',
            }}
          />
          {state.w >= 760 && GOOGLE_LABEL[state.google]}
        </button>
      )}

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('aether:open-command-menu'))}
        className="w-8 h-8 rounded-[8px] grid place-items-center shrink-0 hover:[background:var(--surface2)]"
        aria-label="Menu de comando"
        title="Menu de comando (Ctrl+/)"
      >
        <Command size={15} style={{ color: 'var(--text2)' }} />
      </button>

      {state.w >= 640 && (
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS' })}
          className="w-8 h-8 rounded-[8px] grid place-items-center shrink-0 hover:[background:var(--surface2)]"
          style={{ background: state.shortcutsOpen ? 'var(--surface2)' : 'transparent' }}
          aria-label="Tarefas e atalhos"
          title="Tarefas e atalhos"
        >
          <PanelRight size={15} style={{ color: 'var(--text2)' }} />
        </button>
      )}

      {state.w >= 640 && (
        <button
          onClick={() => dispatch({ type: 'SET_FOCUS_MODE', on: true })}
          className="h-8 flex items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium shrink-0 hover:[background:var(--surface2)]"
          style={{ color: 'var(--gold)' }}
        >
          <Sparkles size={13} />
          Focus Mode
        </button>
      )}

      {state.w >= 640 && <AccountMenu />}
    </header>
  );
}

function Chip({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={`text-[12px] rounded-[6px] px-2 py-[3px] ${mono ? 'font-mono-ae' : ''}`}
      style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
    >
      {children}
    </span>
  );
}
