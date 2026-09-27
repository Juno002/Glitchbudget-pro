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
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex min-h-36 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed p-6 text-center',
      className,
    )}>
      {icon ? <div className="mb-3 text-muted-foreground" aria-hidden="true">{icon}</div> : null}
      <h3 className="font-semibold">{title}</h3>
      {description ? <div className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
