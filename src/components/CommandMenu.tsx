import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  CalendarPlus,
  CalendarDays,
  Settings,
  Sparkles,
  Sun,
  Moon,
  MonitorSmartphone,
  PanelLeft,
  PanelRight,
  RefreshCw,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import { isGoogleConfigured, buildGoogleAuthUrl } from '../lib/googleApi';
import type { ViewKey } from '../lib/types';

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
};

export function CommandMenu() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // Ctrl/Cmd+K é reservado pelo Chrome (foca a barra de endereço) numa
        // aba normal — só funciona aqui quando o app está instalado como PWA
        // (sem barra de endereço) ou em navegadores que não reservam essa
        // combinação. Ainda assim tentamos: se o navegador ignorar o
        // preventDefault, Ctrl+/ e "/" abaixo cobrem o caso.
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        // Não checa inField de propósito: Ctrl+/ raramente é digitado dentro
        // de um campo de texto, então vale abrir o menu mesmo com foco ativo.
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === '/' && !inField) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onOpenRequest = () => setOpen(true);
    window.addEventListener('aether:open-command-menu', onOpenRequest);
    return () => window.removeEventListener('aether:open-command-menu', onOpenRequest);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commands: Command[] = useMemo(() => {
    const setView = (view: ViewKey) => () => dispatch({ type: 'SET_VIEW', view });
    const list: Command[] = [
      {
        id: 'today',
        label: 'Ir para hoje',
        hint: 'T',
        icon: <CalendarDays size={15} />,
        run: () => dispatch({ type: 'GO_TODAY' }),
      },
      {
        id: 'create',
        label: 'Criar evento',
        hint: 'C',
        icon: <CalendarPlus size={15} />,
        run: () => dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(state.cursor) }),
      },
      { id: 'view-day', label: 'Ver: Dia', hint: '1', icon: <CalendarDays size={15} />, run: setView('day') },
      { id: 'view-week', label: 'Ver: Semana', hint: '2', icon: <CalendarDays size={15} />, run: setView('week') },
      { id: 'view-month', label: 'Ver: Mês', hint: '3', icon: <CalendarDays size={15} />, run: setView('month') },
      { id: 'view-agenda', label: 'Ver: Agenda', hint: '4', icon: <CalendarDays size={15} />, run: setView('agenda') },
      {
        id: 'sidebar',
        label: 'Mostrar/ocultar sidebar',
        icon: <PanelLeft size={15} />,
        run: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
      },
      {
        id: 'shortcuts',
        label: 'Mostrar/ocultar atalhos',
        icon: <PanelRight size={15} />,
        run: () => dispatch({ type: 'TOGGLE_SHORTCUTS' }),
      },
      {
        id: 'settings',
        label: 'Abrir Configurações',
        icon: <Settings size={15} />,
        run: () => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' }),
      },
      {
        id: 'assistant',
        label: 'Assistente de horários',
        icon: <Sparkles size={15} />,
        run: () => dispatch({ type: 'SET_AI_OPEN', open: true }),
      },
      {
        id: 'theme-light',
        label: 'Tema: Claro',
        icon: <Sun size={15} />,
        run: () => dispatch({ type: 'UPDATE_SETTINGS', changes: { themeMode: 'light' } }),
      },
      {
        id: 'theme-dark',
        label: 'Tema: Escuro',
        icon: <Moon size={15} />,
        run: () => dispatch({ type: 'UPDATE_SETTINGS', changes: { themeMode: 'dark' } }),
      },
      {
        id: 'theme-auto',
        label: 'Tema: Automático',
        icon: <MonitorSmartphone size={15} />,
        run: () => dispatch({ type: 'UPDATE_SETTINGS', changes: { themeMode: 'auto' } }),
      },
    ];

    if (state.google === 'on') {
      list.push({
        id: 'google-sync',
        label: 'Sincronizar Google Calendar agora',
        icon: <RefreshCw size={15} />,
        run: () => window.dispatchEvent(new CustomEvent('aether:sync-now')),
      });
      list.push({
        id: 'google-disconnect',
        label: 'Desconectar Google Calendar',
        icon: <LogOut size={15} />,
        run: () => dispatch({ type: 'GOOGLE_TOGGLE' }),
      });
    } else {
      list.push({
        id: 'google-connect',
        label: 'Conectar Google Calendar',
        icon: <LogIn size={15} />,
        run: () => {
          if (isGoogleConfigured()) window.location.href = buildGoogleAuthUrl();
          else dispatch({ type: 'GOOGLE_TOGGLE' });
        },
      });
    }

    return list;
  }, [state.cursor, state.google, dispatch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  function execute(cmd: Command) {
    cmd.run();
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) execute(cmd);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4 animate-ae-in"
      style={{ background: 'color-mix(in oklab, #000 50%, transparent)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full rounded-[14px] border overflow-hidden animate-ae-pop"
        style={{ maxWidth: 480, background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <Search size={15} style={{ color: 'var(--text3)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar um comando…"
            className="flex-1 h-12 bg-transparent outline-none text-[14px]"
            style={{ color: 'var(--text)' }}
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--text3)' }}>
              <Search size={20} strokeWidth={1.5} />
              <span className="text-[13px]">Nenhum comando encontrado</span>
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelected(i)}
              className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-[8px] text-[13px] font-medium"
              style={{
                background: i === selected ? 'var(--surface2)' : 'transparent',
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--text3)' }}>{cmd.icon}</span>
              <span className="flex-1">{cmd.label}</span>
              {cmd.hint && (
                <kbd
                  className="text-[11px] font-mono-ae rounded-[5px] px-[6px] py-[1px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
                >
                  {cmd.hint}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
