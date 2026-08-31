export function eventBg(color: string, mixPercent?: number): string {
  const mix = mixPercent != null ? `${mixPercent}%` : 'var(--event-mix)';
  return `color-mix(in oklab, ${color} ${mix}, var(--surface))`;
}

export function prioColor(prio: 'alta' | 'média' | 'baixa'): string {
  if (prio === 'alta') return 'var(--prio-alta)';
  if (prio === 'média') return 'var(--prio-media)';
  return 'var(--prio-baixa)';
}
