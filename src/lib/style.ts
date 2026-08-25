export function eventBg(color: string): string {
  return `color-mix(in oklab, ${color} var(--event-mix), var(--surface))`;
}

export function prioColor(prio: 'alta' | 'média' | 'baixa'): string {
  if (prio === 'alta') return 'var(--prio-alta)';
  if (prio === 'média') return 'var(--prio-media)';
  return 'var(--prio-baixa)';
}
