import { useEffect, useRef, useState } from 'react';
import { Plus, Search, RefreshCw, Command, PanelRight, Sparkles } from 'lucide-react';
import { useStore } from '../store/store';
import { parseQuickAdd } from '../lib/nlParse';
import { calendarOf } from '../store/selectors';
import { hm, formatDayLabel, toUtcIso } from '../lib/dates';
import { AccountMenu } from './AccountMenu';
import type { Event } from '../lib/types';

type Mode = 'idle' | 'create' | 'search';

/**
 * Barra flutuante centralizada no rodapé — estilo Amie. Substitui a maior
 * parte do antigo Header (que ficava no topo, cheio de ícones lado a
 * lado). Fica compacta (só ícones) em repouso, e "abre" pra revelar o
 * campo de criar/buscar quando clicada — em vez de manter um campo de
 * texto grande sempre visível ocupando espaço.
 *
 * Só em desktop/tablet (w>=640) — no celular o BottomNav já cobre criar/
 * sincronizar/tarefas/perfil, então essa barra iria duplicar tudo.
 */
export function FloatingDock() {
  const { state, dispatch } = useStore();
  const [mode, setMode] = useState<Mode>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOpenSearch() {
      setMode('search');
    }
    window.addEventListener('aether:open-search', onOpenSearch);
    return () => window.removeEventListener('aether:open-search', onOpenSearch);
  }, []);

  if (state.w < 640 || state.focusMode) return null;

  const parsed = mode === 'create' && state.quick.trim() ? parseQuickAdd(state.quick) : null;
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
    setMode('idle');
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
      {mode === 'create' && parsed && (
        <div
          className="mb-2 w-[300px] rounded-[14px] border p-3.5 animate-ae-in"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cal?.color }} />
            <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
              {parsed.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <DockChip>{formatDayLabel(parsed.dateKey)}</DockChip>
            <DockChip mono>
              {hm(parsed.startMin)} – {hm(parsed.startMin + parsed.durationMin)}
            </DockChip>
            <DockChip>{cal?.name}</DockChip>
            {parsed.location && <DockChip>{parsed.location}</DockChip>}
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-1 rounded-full p-1.5"
        style={{
          background: 'color-mix(in oklab, var(--surface) 88%, transparent)',
          backdropFilter: 'blur(14px)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        {mode === 'create' ? (
          <div className="flex items-center gap-1.5 pl-3 pr-1">
            <input
              ref={inputRef}
              autoFocus
              value={state.quick}
              onChange={(e) => dispatch({ type: 'SET_QUICK', value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFromQuick();
                if (e.key === 'Escape') {
                  dispatch({ type: 'SET_QUICK', value: '' });
                  setMode('idle');
                }
              }}
              onBlur={() => {
                if (!state.quick.trim()) setMode('idle');
              }}
              placeholder="Reunião amanhã 14h no Zoom…"
              className="bg-transparent outline-none text-[13.5px] w-[240px]"
              style={{ color: 'var(--text)' }}
            />
            {state.quick.trim() && (
              <button
                onClick={createFromQuick}
                className="h-7 px-3 rounded-full text-[12px] font-semibold shrink-0"
                style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
              >
                Criar
              </button>
            )}
          </div>
        ) : mode === 'search' ? (
          <div className="flex items-center gap-1.5 pl-3 pr-1">
            <Search size={13} style={{ color: 'var(--text3)' }} />
            <input
              autoFocus
              value={state.search}
              onChange={(e) => dispatch({ type: 'SET_SEARCH', value: e.target.value })}
              onKeyDown={(e) => e.key === 'Escape' && setMode('idle')}
              onBlur={() => !state.search && setMode('idle')}
              placeholder="Buscar eventos…"
              className="bg-transparent outline-none text-[13.5px] w-[200px]"
              style={{ color: 'var(--text)' }}
            />
          </div>
        ) : (
          <>
            <DockIcon icon={Plus} label="Criar evento (N)" onClick={() => setMode('create')} accent />
            <DockIcon icon={Search} label="Buscar" onClick={() => setMode('search')} />
            <DockDivider />
            <DockIcon
              icon={RefreshCw}
              label={state.google === 'on' ? 'Sincronizar agora' : 'Conecte o Google Calendar'}
              onClick={() => window.dispatchEvent(new CustomEvent('aether:sync-now'))}
              spinning={state.google === 'sync'}
              faded={state.google !== 'on'}
            />
            <DockIcon
              icon={Command}
              label="Menu de comando (Ctrl+/)"
              onClick={() => window.dispatchEvent(new CustomEvent('aether:open-command-menu'))}
            />
            <DockIcon
              icon={PanelRight}
              label="Atalhos"
              onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS' })}
              activeState={state.shortcutsOpen}
            />
            <DockIcon
              icon={Sparkles}
              label="Focus Mode"
              onClick={() => dispatch({ type: 'SET_FOCUS_MODE', on: true })}
              color="var(--gold)"
            />
            <DockDivider />
            <AccountMenu openUpward />
          </>
        )}
      </div>
    </div>
  );
}

function DockIcon({
  icon: Icon,
  label,
  onClick,
  accent,
  spinning,
  faded,
  activeState,
  color,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  accent?: boolean;
  spinning?: boolean;
  faded?: boolean;
  activeState?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-full grid place-items-center shrink-0 hover:[background:var(--surface2)]"
      style={{
        background: accent ? 'var(--accent)' : activeState ? 'var(--surface2)' : 'transparent',
        opacity: faded ? 0.4 : 1,
      }}
    >
      <Icon
        size={15}
        className={spinning ? 'animate-ae-spin' : ''}
        style={{ color: accent ? 'var(--accentText)' : color ?? 'var(--text2)' }}
      />
    </button>
  );
}

function DockDivider() {
  return <span className="w-[1px] h-5 shrink-0" style={{ background: 'var(--border)' }} />;
}

function DockChip({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={`text-[12px] rounded-full px-2.5 py-[3px] ${mono ? 'font-mono-ae' : ''}`}
      style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
    >
      {children}
    </span>
  );
}
