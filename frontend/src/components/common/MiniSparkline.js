export default function MiniSparkline({ change, color, w = 80, h = 28 }) {
  const steps = 10;
  const pts = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    const trend = t * change * 2;
    const wave  = Math.sin(i * 1.7 + Math.abs(change)) * Math.abs(change) * 0.5;
    return { x: t * w, y: h / 2 - trend - wave };
  });
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const range = maxY - minY || 1;
  const norm = pts.map(p => ({ x: p.x, y: 3 + ((p.y - minY) / range) * (h - 6) }));
  const d = norm.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  );
}
