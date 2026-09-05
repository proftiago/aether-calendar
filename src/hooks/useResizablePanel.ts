import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Largura ajustável por arrastar — clica, segura e arrasta a borda do
 * painel pra mudar o tamanho. Lembra a última largura escolhida (guarda
 * no localStorage por uma chave própria de cada painel).
 *
 * `direction`: painéis à DIREITA da tela têm o puxador na borda ESQUERDA
 * deles — arrastar pra esquerda deveria AUMENTAR a largura (direction=-1,
 * inverte o delta). Painéis à ESQUERDA da tela (ex: Sidebar) têm o
 * puxador na borda direita — arrastar pra direita aumenta (direction=1).
 */
export function useResizablePanel(storageKey: string, defaultWidth: number, min: number, max: number, direction: 1 | -1 = 1) {
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : defaultWidth;
  });
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent) {
      const delta = (e.clientX - startX.current) * direction;
      setWidth(Math.min(max, Math.max(min, startWidth.current + delta)));
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, min, max, direction]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(width));
  }, [storageKey, width]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      startX.current = e.clientX;
      startWidth.current = width;
      setDragging(true);
    },
    [width],
  );

  return { width, dragging, startDrag };
}
