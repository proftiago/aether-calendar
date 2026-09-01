import { useEffect, useState } from 'react';
import { Menu, Search, Settings } from 'lucide-react';
import { useStore } from '../store/store';

/**
 * Header ficou reduzido ao mínimo — hamburguer (só funciona na página
 * Calendário, onde a Sidebar de filtros existe de verdade) ou engrenagem
 * de Configurações (nas outras páginas, onde o hamburguer não abriria
 * nada — bug real que existia antes desse ajuste: clicar nele em Notas/
 * Tarefas/Hoje não fazia literalmente nada). + busca, exclusiva do
 * celular, onde a FloatingDock não aparece.
 */
export function Header() {
  const { state, dispatch } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const onCalendarPage = state.page === 'calendario';

  useEffect(() => {
    function onOpenSearch() {
      setSearchOpen(true);
    }
    window.addEventListener('aether:open-search', onOpenSearch);
    return () => window.removeEventListener('aether:open-search', onOpenSearch);
  }, []);

  return (
    <header
      className="flex items-center px-3 py-2 border-b shrink-0"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() =>
          onCalendarPage
            ? dispatch({ type: 'TOGGLE_SIDEBAR' })
            : dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' })
        }
        className="w-8 h-8 rounded-[8px] grid place-items-center shrink-0 hover:[background:var(--surface2)]"
        aria-label={onCalendarPage ? 'Abrir menu' : 'Configurações'}
      >
        {onCalendarPage ? (
          <>
            <span
              className="hidden sm:grid w-[26px] h-[26px] rounded-[7px] place-items-center"
              style={{ background: 'linear-gradient(135deg, #0a2e4a, var(--accent))' }}
            >
              <span className="grid grid-cols-2 gap-[2.5px]">
                <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.92)' }} />
                <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.55)' }} />
                <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.55)' }} />
                <span className="w-[6px] h-[6px] rounded-[2px]" style={{ background: 'var(--gold)' }} />
              </span>
            </span>
            <Menu size={17} className="sm:hidden" style={{ color: 'var(--text2)' }} />
          </>
        ) : (
          <Settings size={17} style={{ color: 'var(--text2)' }} />
        )}
      </button>

      {state.w < 640 && (
        <div className="flex-1 flex justify-end">
          {searchOpen ? (
            <div className="h-8 flex items-center gap-1.5 rounded-full px-2.5" style={{ background: 'var(--surface2)' }}>
              <Search size={12} style={{ color: 'var(--text3)' }} />
              <input
                value={state.search}
                onChange={(e) => dispatch({ type: 'SET_SEARCH', value: e.target.value })}
                onBlur={() => !state.search && setSearchOpen(false)}
                autoFocus
                placeholder="Buscar"
                className="bg-transparent outline-none text-[13px] w-24"
                style={{ color: 'var(--text)' }}
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 rounded-[8px] grid place-items-center shrink-0 hover:[background:var(--surface2)]"
              aria-label="Buscar"
            >
              <Search size={15} style={{ color: 'var(--text2)' }} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
