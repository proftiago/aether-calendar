import { Sun, CalendarDays, CheckSquare, FileText, BookOpen, Hourglass, Settings } from 'lucide-react';
import { useStore } from '../store/store';
import type { PageKey } from '../store/store';

const NAV_ITEMS: { key: PageKey; label: string; icon: typeof Sun }[] = [
  { key: 'hoje', label: 'Hoje', icon: Sun },
  { key: 'calendario', label: 'Calendário', icon: CalendarDays },
  { key: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { key: 'notas', label: 'Notas', icon: FileText },
  { key: 'paginas', label: 'Páginas', icon: BookOpen },
];

/**
 * Barra de navegação fina, só ícones — estilo do app de referência (rail
 * estreito, ~52px, sem rótulos de texto visíveis, tooltip no hover pra
 * acessibilidade). Fica sempre visível em telas largas; em telas
 * estreitas, o BottomNav já cobre a navegação entre páginas.
 */
export function NavRail() {
  const { state, dispatch } = useStore();
  if (state.w < 900) return null;

  return (
    <nav
      className="w-[52px] shrink-0 flex flex-col items-center py-3 gap-1 border-r"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <span
        className="w-8 h-8 rounded-[9px] grid place-items-center mb-3 shrink-0"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }}
        title="Aether"
      >
        <span className="grid grid-cols-2 gap-[2px]">
          <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: 'rgba(255,255,255,0.95)' }} />
          <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: 'rgba(255,255,255,0.6)' }} />
          <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: 'rgba(255,255,255,0.6)' }} />
          <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: '#fbbf24' }} />
        </span>
      </span>

      <div className="flex flex-col gap-0.5 w-full items-center">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = state.page === key;
          return (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_PAGE', page: key })}
              className="w-9 h-9 rounded-[9px] grid place-items-center"
              style={{ background: active ? 'var(--surface2)' : 'transparent' }}
              title={label}
              aria-label={label}
            >
              <Icon size={17} style={{ color: active ? 'var(--accent)' : 'var(--text2)' }} />
            </button>
          );
        })}
      </div>

      <button
        onClick={() => dispatch({ type: 'SET_FOCUS_MODE', on: true })}
        className="w-9 h-9 rounded-[9px] grid place-items-center hover:[background:var(--surface2)]"
        aria-label="Timer de Foco"
        title="Timer de Foco"
      >
        <Hourglass size={16} style={{ color: 'var(--text2)' }} />
      </button>

      <div className="mt-auto flex flex-col items-center gap-0.5">
        <button
          onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' })}
          className="w-9 h-9 rounded-[9px] grid place-items-center hover:[background:var(--surface2)]"
          aria-label="Configurações"
          title="Configurações"
        >
          <Settings size={16} style={{ color: 'var(--text2)' }} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'perfil' })}
          className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold shrink-0 mt-1"
          style={{
            background: state.page === 'perfil' ? 'var(--accent)' : 'var(--surface2)',
            color: state.page === 'perfil' ? 'var(--accentText)' : 'var(--text2)',
          }}
          aria-label="Perfil"
          title="Perfil"
        >
          {(state.settings.userName || 'Você').charAt(0).toUpperCase()}
        </button>
      </div>
    </nav>
  );
}
