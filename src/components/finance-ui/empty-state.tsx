import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex min-h-36 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed bg-card/55 p-6 text-center shadow-[var(--shadow-control)]',
      className,
    )}>
      {icon ? <div className="mb-3 text-muted-foreground" aria-hidden="true">{icon}</div> : null}
      {title ? <h3 className="font-display text-lg font-normal">{title}</h3> : null}
      {description ? <div className={cn('max-w-md text-sm leading-relaxed text-muted-foreground', title && 'mt-1')}>{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}