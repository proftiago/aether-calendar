import { Sun, CalendarDays, CheckSquare, FileText, Settings } from 'lucide-react';
import { useStore } from '../store/store';
import type { PageKey } from '../store/store';

const NAV_ITEMS: { key: PageKey; label: string; icon: typeof Sun }[] = [
  { key: 'hoje', label: 'Hoje', icon: Sun },
  { key: 'calendario', label: 'Calendário', icon: CalendarDays },
  { key: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { key: 'notas', label: 'Notas', icon: FileText },
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
      className="w-[76px] shrink-0 flex flex-col items-center py-4 gap-1 border-r"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <span
        className="w-8 h-8 rounded-[9px] grid place-items-center mb-4"
        style={{ background: 'linear-gradient(135deg, #0a2e4a, var(--accent))' }}
      >
        <span className="grid grid-cols-2 gap-[2.5px]">
          <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.92)' }} />
          <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.55)' }} />
          <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.55)' }} />
          <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'var(--gold)' }} />
        </span>
      </span>

      <div className="flex flex-col gap-1 w-full px-2">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = state.page === key;
          return (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_PAGE', page: key })}
              className="w-full flex flex-col items-center gap-1 rounded-[10px] py-2"
              style={{ background: active ? 'var(--surface2)' : 'transparent' }}
            >
              <Icon size={17} style={{ color: active ? 'var(--accent)' : 'var(--text2)' }} />
              <span className="text-[9.5px] font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text3)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto w-full px-2 flex flex-col items-center gap-1.5">
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'hoje' })}
          className="w-full rounded-[10px] p-2 text-center hover:opacity-80"
          style={{ background: 'color-mix(in oklab, var(--gold) 12%, var(--surface2))' }}
        >
          <div className="text-[9px] font-medium mb-0.5" style={{ color: 'var(--text3)' }}>
            Seu dia
          </div>
          <div className="text-[9.5px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
            {today} {today === 1 ? 'tarefa' : 'tarefas'}
          </div>
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' })}
          className="w-9 h-9 rounded-[9px] grid place-items-center hover:[background:var(--surface2)]"
          aria-label="Configurações"
        >
          <Settings size={16} style={{ color: 'var(--text2)' }} />
        </button>
      </div>
    </nav>
  );
}
