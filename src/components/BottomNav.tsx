import { Sun, CalendarDays, ListChecks, FileText, Plus } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import type { PageKey } from '../store/store';

const NAV_ITEMS: { key: PageKey; label: string; icon: typeof Sun }[] = [
  { key: 'hoje', label: 'Hoje', icon: Sun },
  { key: 'calendario', label: 'Calendário', icon: CalendarDays },
  { key: 'tarefas', label: 'Tarefas', icon: ListChecks },
  { key: 'notas', label: 'Notas', icon: FileText },
];

/**
 * Barra inferior do celular — 4 páginas, igual ao mockup (antes tinha 5
 * itens incluindo Sync e Perfil, que saíram: sincronizar continua
 * acessível puxando a tela pra baixo na grade e nas Configurações;
 * Configurações agora mora no ícone do Header, ver Header.tsx). O botão
 * de criar virou um "+" flutuante à parte, não um item da barra.
 */
export function BottomNav() {
  const { state, dispatch } = useStore();
  if (state.w >= 640 || state.focusMode) return null;

  return (
    <>
      <button
        onClick={() => dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(state.cursor) })}
        className="fixed z-40 w-12 h-12 rounded-full grid place-items-center"
        style={{
          right: 16,
          bottom: 'calc(64px + env(safe-area-inset-bottom))',
          background: 'var(--gold)',
          color: 'var(--goldText)',
          boxShadow: 'var(--shadow)',
        }}
        aria-label="Criar evento"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      <nav
        className="flex items-center justify-around border-t shrink-0"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingTop: 6,
        }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = state.page === key;
          return (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_PAGE', page: key })}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3"
              style={{ color: active ? 'var(--accent)' : 'var(--text2)' }}
            >
              <Icon size={20} />
              <span className="text-[9.5px] font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
