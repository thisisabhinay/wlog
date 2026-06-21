export function Sparkline({ values, direction }: { values: (number | null)[]; direction?: string }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <span className="text-xs text-muted-foreground">—</span>;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const step = w / (nums.length - 1);

  const points = nums.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const last = nums[nums.length - 1];
  const prev = nums[nums.length - 2];
  const trending = direction === 'lower' ? last <= prev : last >= prev;

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={trending ? '#22c55e' : '#ef4444'}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
