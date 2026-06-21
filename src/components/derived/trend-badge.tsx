import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendDirection } from '#domain/selectors';

export function TrendBadge({ trend, direction }: { trend: TrendDirection; direction?: string }) {
  if (trend === 'none') return <span className="text-xs text-muted-foreground">—</span>;

  const isGood =
    trend === 'flat' ? true :
    direction === 'lower' ? trend === 'down' :
    trend === 'up';

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const color = isGood ? 'text-emerald-600' : 'text-red-500';

  return <Icon className={`h-4 w-4 ${color}`} />;
}
