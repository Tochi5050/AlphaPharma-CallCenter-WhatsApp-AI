import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'new' | 'pending' | 'resolved' | 'ai' | 'system' | 'awaiting-payment';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const variant = {
    new: 'destructive' as const,
    pending: 'warning' as const,
    resolved: 'success' as const,
    ai: 'info' as const,
    system: 'secondary' as const,
    'awaiting-payment': 'info' as const,
  }[status];

  const labels = {
    new: 'New',
    pending: 'Pending',
    resolved: 'Resolved',
    ai: 'AI',
    system: 'System',
    'awaiting-payment': 'Awaiting Payment',
  };

  return (
    <Badge variant={variant} className={size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}>
      {labels[status]}
    </Badge>
  );
}
