import { Sun, CalendarDays, CheckSquare, FileText, BookOpen, Settings } from 'lucide-react';
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
 * Barra de navegação fina e persistente, estilo Lumen/Amie — logo no topo,
 * as 4 páginas do app, um cartão de saudação ("Seu dia") no rodapé, e o
 * atalho de Configurações por último. Fica sempre visível em telas largas;
 * em telas estreitas, o BottomNav já cobre a navegação entre páginas, então
 * esse componente não aparece ali (ver a checagem de largura abaixo).
 */
export function NavRail() {
  const { state, dispatch } = useStore();
  if (state.w < 900) return null;

  const today = state.tasks.filter((t) => !t.archived && !t.done).length;

  return (
    <nav
      className="w-[168px] shrink-0 flex flex-col py-4 px-2.5 gap-1 border-r"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 px-1 mb-5">
        <span
          className="w-7 h-7 rounded-[8px] grid place-items-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #0a2e4a, var(--accent))' }}
        >
          <span className="grid grid-cols-2 gap-[2px]">
            <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: 'rgba(255,255,255,0.92)' }} />
            <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: 'rgba(255,255,255,0.55)' }} />
            <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: 'rgba(255,255,255,0.55)' }} />
            <span className="w-[5px] h-[5px] rounded-[1.5px]" style={{ background: 'var(--gold)' }} />
          </span>
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
          Aether
        </span>
      </div>

      <div className="flex flex-col gap-0.5 w-full">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = state.page === key;
          return (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_PAGE', page: key })}
              className="w-full flex items-center gap-2.5 rounded-[9px] px-2.5 py-2"
              style={{ background: active ? 'var(--surface2)' : 'transparent' }}
            >
              <Icon size={16} style={{ color: active ? 'var(--accent)' : 'var(--text2)' }} />
              <span className="text-[13px] font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text2)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto w-full flex flex-col gap-1.5">
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'hoje' })}
          className="w-full rounded-[12px] pt-2.5 px-3 pb-2 text-left hover:opacity-80 overflow-hidden relative"
          style={{ background: 'color-mix(in oklab, var(--gold) 12%, var(--surface2))' }}
        >
          <div className="text-[10px] font-medium mb-0.5 relative z-10" style={{ color: 'var(--text3)' }}>
            Seu dia
          </div>
          <div className="text-[12px] font-semibold leading-tight relative z-10" style={{ color: 'var(--text)' }}>
            {today} {today === 1 ? 'tarefa' : 'tarefas'}
          </div>
          <svg viewBox="0 0 140 28" className="w-full h-7 mt-1.5" preserveAspectRatio="none" aria-hidden="true">
            <circle cx="70" cy="11" r="8" fill="var(--gold)" opacity="0.55" />
            <path d="M0 26 Q 35 12, 70 18 T 140 16 V 28 H 0 Z" fill="var(--gold)" opacity="0.3" />
          </svg>
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' })}
          className="w-full flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 hover:[background:var(--surface2)]"
        >
          <Settings size={16} style={{ color: 'var(--text2)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>
            Configurações
          </span>
        </button>
      </div>
    </nav>
  );
}
