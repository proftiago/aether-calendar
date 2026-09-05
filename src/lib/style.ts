export function eventBg(color: string, mixPercent?: number): string {
  const mix = mixPercent != null ? `${mixPercent}%` : 'var(--event-mix)';
  return `color-mix(in oklab, ${color} ${mix}, var(--surface))`;
}

export function prioColor(prio: 'alta' | 'média' | 'baixa'): string {
  if (prio === 'alta') return 'var(--prio-alta)';
  if (prio === 'média') return 'var(--prio-media)';
  return 'var(--prio-baixa)';
}

const TAG_COLOR_PALETTE = [
  'oklch(0.62 0.19 292)', // roxo
  'oklch(0.68 0.16 62)', // laranja
  'oklch(0.6 0.14 220)', // azul
  'oklch(0.64 0.15 150)', // verde
  'oklch(0.62 0.2 350)', // rosa
  'oklch(0.65 0.17 90)', // amarelo-oliva
  'oklch(0.6 0.18 25)', // vermelho-coral
  'oklch(0.6 0.13 200)', // ciano
];

/**
 * Cor estável por texto de tag — o mesmo texto sempre cai na mesma cor
 * (hash simples da string), diferentes tags ficam visualmente distintas
 * entre si, em vez de todas herdarem a cor do calendário (que fazia todas
 * as tags de um mesmo calendário parecerem iguais).
 */
export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[idx];
}
