import { X } from 'lucide-react';
import { useStore } from '../store/store';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', '/'], label: 'Menu de comando' },
  { keys: ['T'], label: 'Ir para hoje' },
  { keys: ['C', 'N'], label: 'Criar evento' },
  { keys: ['G'], label: 'Ir para busca' },
  { keys: ['D'], label: 'Ver: Dia' },
  { keys: ['W'], label: 'Ver: Semana' },
  { keys: ['1', '2', '3', '4'], label: 'Trocar view (dia/semana/mês/agenda)' },
  { keys: ['←', '→'], label: 'Navegar' },
  { keys: ['Esc'], label: 'Fechar' },
];

/**
 * Painel de atalhos — as tarefas moraram aqui antes, voltaram pra Sidebar.
 * Como agora só sobrou isso (uso ocasional, não é conteúdo "sempre visível"
 * como as tarefas eram), virou sempre um overlay flutuante, independente
 * do tamanho de tela — antes ele tentava viver "no fluxo" em telas largas,
 * o que só funcionava quando estava dentro do container flex certo. Agora
 * que é renderizado globalmente (fora desse container), overlay sempre é
 * a opção que funciona em qualquer contexto.
 */
export function RightPanel() {
  const { state, dispatch } = useStore();
  if (!state.shortcutsOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        style={{ background: 'rgba(0,0,0,0.35)' }}
        onClick={() => dispatch({ type: 'SET_SHORTCUTS_OPEN', open: false })}
      />
      <aside
        className="fixed inset-y-0 right-0 z-40 w-[220px] shrink-0 border-l p-4 flex flex-col overflow-y-auto animate-ae-in"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
            Atalhos
          </span>
          <button
            onClick={() => dispatch({ type: 'SET_SHORTCUTS_OPEN', open: false })}
            className="w-6 h-6 rounded-[7px] grid place-items-center shrink-0"
            aria-label="Fechar"
          >
            <X size={13} style={{ color: 'var(--text3)' }} />
          </button>
        </div>

        <div className="flex flex-col gap-[13px]">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-[12px]" style={{ color: 'var(--text2)' }}>
                {s.label}
              </span>
              <span className="flex gap-1 shrink-0">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="text-[10px] font-mono-ae font-semibold rounded-[5px] px-[6px] py-[1px] border"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
