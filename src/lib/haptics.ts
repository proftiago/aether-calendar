/**
 * Vibração leve pra confirmar uma ação por toque (soltar um evento
 * arrastado, criar um evento). A Vibration API só existe no Android —
 * no iOS Safari `navigator.vibrate` nem existe, então isso já é
 * silenciosamente ignorado lá, sem precisar de nenhum tratamento especial.
 */
export function hapticTick(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // alguns navegadores lançam se chamado fora de um gesto do usuário — ignora
  }
}
