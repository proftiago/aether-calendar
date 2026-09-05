import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStore } from '../store/store';
import { addDays, addMonthsKey, dayNum, isSameMonth, keyToDate, startOfMonthGridKey, todayKey } from '../lib/dates';

const DOW_LABELS_SUN = ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa'];
const DOW_LABELS_MON = ['Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa', 'Do'];

/**
 * Calendário próprio (arredondado, no nosso estilo) pra escolher uma
 * data — substitui o <input type="date"> nativo, cujo popup é
 * desenhado pelo navegador/sistema operacional e não dá pra estilizar
 * de jeito nenhum (fica sempre quadrado, fora do alcance de qualquer
 * CSS). Controlado (value/onChange), independente do cursor global do
 * app — cada instância navega seu próprio mês.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Escolher data',
  className,
}: {
  value: string | undefined;
  onChange: (dateKey: string | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value ?? todayKey());
  const ref = useRef<HTMLDivElement>(null);
  const weekStartsOn = state.settings.weekStartsOn;
  const today = todayKey();

  useEffect(() => {
    if (!open) return;
    setViewMonth(value ?? todayKey());
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, value]);

  const gridStart = startOfMonthGridKey(viewMonth, weekStartsOn);
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)));
  }
  const labels = weekStartsOn === 0 ? DOW_LABELS_SUN : DOW_LABELS_MON;
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(keyToDate(viewMonth));

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] outline-none"
        style={{ background: 'var(--surface2)', color: value ? 'var(--text)' : 'var(--text3)' }}
      >
        <CalendarIcon size={13} style={{ color: 'var(--text3)' }} className="shrink-0" />
        <span className="flex-1 text-left truncate">{value ?? placeholder}</span>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="shrink-0 w-4 h-4 rounded-[4px] grid place-items-center hover:[background:var(--surface)]"
            aria-label="Limpar data"
          >
            <X size={11} />
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 rounded-[14px] border p-3 w-[260px] animate-ae-pop select-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <span className="text-[13px] font-semibold capitalize" style={{ color: 'var(--text)' }}>
              {monthLabel}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonthsKey(m, -1))}
                className="w-6 h-6 rounded-[6px] grid place-items-center hover:[background:var(--surface2)]"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={12} style={{ color: 'var(--text3)' }} />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonthsKey(m, 1))}
                className="w-6 h-6 rounded-[6px] grid place-items-center hover:[background:var(--surface2)]"
                aria-label="Próximo mês"
              >
                <ChevronRight size={12} style={{ color: 'var(--text3)' }} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center">
            {labels.map((l, i) => (
              <span key={i} className="text-[10px] font-semibold pb-1.5" style={{ color: 'var(--text3)' }}>
                {l}
              </span>
            ))}
            {weeks.map((week) =>
              week.map((dateKey) => {
                const inMonth = isSameMonth(dateKey, viewMonth);
                const isToday = dateKey === today;
                const isSelected = dateKey === value;
                return (
                  <button
                    type="button"
                    key={dateKey}
                    onClick={() => {
                      onChange(dateKey);
                      setOpen(false);
                    }}
                    className="text-[12px] rounded-full w-7 h-7 mx-auto my-[2px] grid place-items-center"
                    style={{
                      opacity: inMonth ? 1 : 0.32,
                      background: isSelected ? 'var(--accent)' : isToday ? 'var(--surface2)' : 'transparent',
                      color: isSelected ? 'var(--accentText)' : isToday ? 'var(--accent)' : 'var(--text)',
                      fontWeight: isToday || isSelected ? 600 : 400,
                    }}
                  >
                    {dayNum(dateKey)}
                  </button>
                );
              }),
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(today);
              setOpen(false);
            }}
            className="w-full mt-2 rounded-[8px] py-1.5 text-[12px] font-medium"
            style={{ background: 'var(--surface2)', color: 'var(--accent)' }}
          >
            Hoje
          </button>
        </div>
      )}
    </div>
  );
}
