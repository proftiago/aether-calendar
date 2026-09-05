/**
 * Puxador fino na borda de um painel — clica, segura e arrasta
 * lateralmente pra redimensionar. Fica destacado (mais grosso, cor de
 * destaque) enquanto está sendo arrastado, pra dar retorno visual claro.
 */
export function ResizeHandle({ onPointerDown, dragging, side }: { onPointerDown: (e: React.PointerEvent) => void; dragging: boolean; side: 'left' | 'right' }) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute inset-y-0 w-[5px] cursor-col-resize z-10 group"
      style={{ [side]: -2.5 } as React.CSSProperties}
      role="separator"
      aria-orientation="vertical"
    >
      <div
        className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full transition-opacity ${
          dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
        }`}
        style={{ background: 'var(--accent)' }}
      />
    </div>
  );
}
