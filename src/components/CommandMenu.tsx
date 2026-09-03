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
import { useSmartReschedule } from '../hooks/useSmartReschedule';
import { isGoogleConfigured, buildGoogleAuthUrl } from '../lib/googleApi';
import { parseQuickAdd } from '../lib/nlParse';
import { calendarOf } from '../store/selectors';
import { formatDayLabel, hm, toUtcIso } from '../lib/dates';
import type { Event, ViewKey } from '../lib/types';

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
};

export function CommandMenu() {
  const { state, dispatch } = useStore();
  const { resolveConflicts } = useSmartReschedule();
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
        id: 'new-task',
        label: 'Nova tarefa',
        icon: <CalendarPlus size={15} />,
        run: () => {
          dispatch({ type: 'SET_PAGE', page: 'tarefas' });
          // pequeno atraso: precisa a pagina Tarefas montar (e o TaskPanel
          // registrar o listener) antes do evento ser disparado, senao a
          // navegacao e o evento correm em paralelo e o evento se perde
          window.setTimeout(() => window.dispatchEvent(new CustomEvent('aether:add-task')), 50);
        },
      },
      {
        id: 'create',
        label: 'Criar evento',
        hint: 'C',
        icon: <CalendarPlus size={15} />,
        run: () => dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(state.cursor, undefined, undefined, state.calendars[0]?.id) }),
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
        id: 'focus-mode',
        label: 'Iniciar Focus Mode',
        icon: <Sparkles size={15} />,
        run: () => dispatch({ type: 'SET_FOCUS_MODE', on: true }),
      },
      {
        id: 'resolve-conflicts',
        label: 'Reorganizar conflitos de agenda',
        icon: <RefreshCw size={15} />,
        run: resolveConflicts,
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

  // Comando fixo no topo: criação de evento por linguagem natural, estilo
  // Raycast — a barra de comando também é a barra de criação rápida.
  const nlPreview = query.trim().length > 0 ? parseQuickAdd(query) : null;
  const nlCal = nlPreview ? calendarOf(state, nlPreview.calId) : undefined;
  const nlCommand: Command | null = nlPreview
    ? {
        id: 'nl-create',
        label: `Criar "${nlPreview.title}"`,
        hint: undefined,
        icon: <CalendarPlus size={15} style={{ color: 'var(--gold)' }} />,
        run: () => {
          const startsAt = toUtcIso(nlPreview.dateKey, nlPreview.startMin);
          const endsAt = toUtcIso(nlPreview.dateKey, nlPreview.startMin + nlPreview.durationMin);
          const event: Event = {
            id: `local-${Date.now()}`,
            title: nlPreview.title,
            calId: nlPreview.calId,
            startsAt,
            endsAt,
            timeZone: 'America/Sao_Paulo',
            allDay: false,
            location: nlPreview.location,
            src: 'local',
          };
          dispatch({ type: 'ADD_EVENT', event, toast: `Evento criado: ${event.title}` });
        },
      }
    : null;

  const allEntries: Command[] = nlCommand ? [nlCommand, ...filtered] : filtered;

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
      setSelected((s) => Math.min(s + 1, allEntries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = allEntries[selected];
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
            placeholder="Criar evento ou buscar um comando…"
            className="flex-1 h-12 bg-transparent outline-none text-[14px]"
            style={{ color: 'var(--text)' }}
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {allEntries.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--text3)' }}>
              <Search size={20} strokeWidth={1.5} />
              <span className="text-[13px]">Nenhum comando encontrado</span>
            </div>
          )}
          {nlCommand && nlPreview && (
            <button
              onClick={() => execute(nlCommand)}
              onMouseEnter={() => setSelected(0)}
              className="w-full flex flex-col gap-1 text-left px-2.5 py-2.5 rounded-[8px]"
              style={{
                background: selected === 0 ? 'color-mix(in oklab, var(--gold) 12%, var(--surface2))' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2.5">
                <CalendarPlus size={15} style={{ color: 'var(--gold)' }} />
                <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                  Criar "{nlPreview.title}"
                </span>
              </div>
              <div className="pl-[25px] flex flex-wrap gap-1.5 text-[11px]" style={{ color: 'var(--text3)' }}>
                <span className="capitalize">{formatDayLabel(nlPreview.dateKey)}</span>
                <span>·</span>
                <span className="font-mono-ae">{hm(nlPreview.startMin)}</span>
                <span>·</span>
                <span>{nlCal?.name}</span>
                {nlPreview.location && (
                  <>
                    <span>·</span>
                    <span>{nlPreview.location}</span>
                  </>
                )}
              </div>
            </button>
          )}
          {filtered.map((cmd, i) => {
            const idx = nlCommand ? i + 1 : i;
            return (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelected(idx)}
                className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-[8px] text-[13px] font-medium"
                style={{
                  background: idx === selected ? 'var(--surface2)' : 'transparent',
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
