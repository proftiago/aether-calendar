import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStore } from '../store/store';
import { eventBg } from '../lib/style';

/**
 * Pilula mostrando o calendário atual — clicar abre uma lista arredondada
 * pra trocar. Substitui um <select> nativo (mesmo problema do calendário
 * de data: a lista do <select> é desenhada pelo navegador, sempre
 * quadrada, fora do alcance do CSS).
 */
export function CalendarSelect({ value, onChange }: { value: string; onChange: (calId: string) => void }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = state.calendars.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative w-fit" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1 text-[12px] font-semibold"
        style={{ background: eventBg(current?.color ?? 'var(--accent)', 22), color: current?.color }}
      >
        {current?.name ?? 'Calendário'}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 rounded-[12px] border p-1.5 w-[180px] animate-ae-pop"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
        >
          {state.calendars.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(String(c.id));
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-medium hover:[background:var(--surface2)]"
              style={{ color: 'var(--text)' }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
