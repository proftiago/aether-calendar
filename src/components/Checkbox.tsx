import { Check } from 'lucide-react';

/**
 * Checkbox customizado — o <input type="checkbox"> nativo do navegador
 * renderiza como uma caixa quadrada em todo lugar (Chrome/Firefox/Safari),
 * destoando do resto do app que é todo arredondado. Usado nos 3 lugares
 * que ainda tinham a caixa nativa (tarefas na Hoje, Timer de Foco, lista
 * de calendários do Google nas Configurações).
 */
export function Checkbox({
  checked,
  onChange,
  size = 16,
  accentColor = 'var(--sync-ok)',
}: {
  checked: boolean;
  onChange: () => void;
  size?: number;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="rounded-[6px] grid place-items-center shrink-0 transition-colors"
      style={{
        width: size,
        height: size,
        background: checked ? accentColor : 'transparent',
        border: checked ? 'none' : '1.5px solid var(--border)',
      }}
    >
      {checked && <Check size={size - 4} strokeWidth={3} color="white" />}
    </button>
  );
}
