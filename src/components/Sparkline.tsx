export function Sparkline({ values, color = 'var(--gold)', height = 32 }: { values: number[]; color?: string; height?: number }) {
  const max = Math.max(1, ...values);
  const w = 100;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
  const areaPoints = `0,${height} ${points} ${w},${height}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - (v / max) * height} r={1.6} fill={color} />
      ))}
    </svg>
  );
}
