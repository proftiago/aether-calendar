import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Dropdown próprio (arredondado) — substitui um <select> nativo, cuja
 * lista de opções é desenhada pelo navegador/sistema operacional e
 * sempre fica quadrada, fora do alcance de qualquer CSS.
 */
export function Dropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] rounded-[7px] px-2 py-1.5 outline-none"
        style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
      >
        {current?.label ?? value}
        <ChevronDown size={12} style={{ color: 'var(--text3)' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-[12px] border p-1.5 w-max max-w-[220px] animate-ae-pop"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="w-full text-left rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-medium hover:[background:var(--surface2)]"
              style={{ color: o.value === value ? 'var(--accent)' : 'var(--text)' }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
