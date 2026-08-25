import { useStore } from '../store/store';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Menu de comando' },
  { keys: ['T'], label: 'Ir para hoje' },
  { keys: ['C'], label: 'Criar evento' },
  { keys: ['G'], label: 'Ir para busca' },
  { keys: ['1'], label: 'Ver: Dia' },
  { keys: ['2'], label: 'Ver: Semana' },
  { keys: ['3'], label: 'Ver: Mês' },
  { keys: ['4'], label: 'Ver: Agenda' },
  { keys: ['←', '→'], label: 'Navegar' },
  { keys: ['Esc'], label: 'Fechar' },
];

export function ShortcutsPanel() {
  const { state } = useStore();
  if (!state.shortcutsOpen || state.w < 900) return null;

  return (
    <aside
      className="w-[220px] shrink-0 border-l p-4 hidden lg:block overflow-y-auto"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text3)' }}>
        Atalhos úteis
      </div>
      <div className="flex flex-col gap-2.5">
        {SHORTCUTS.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="text-[12.5px]" style={{ color: 'var(--text2)' }}>
              {s.label}
            </span>
            <span className="flex gap-1 shrink-0">
              {s.keys.map((k, j) => (
                <kbd
                  key={j}
                  className="text-[10.5px] font-mono-ae font-semibold rounded-[5px] px-[6px] py-[1px] border"
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
  );
}
