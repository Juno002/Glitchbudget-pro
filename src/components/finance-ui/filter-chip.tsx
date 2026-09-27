import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FilterChip({
  active = false,
  children,
  clearLabel,
  onClear,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
  clearLabel?: string;
  onClear?: () => void;
}) {
  return (
    <span className={cn(
      'inline-flex min-h-9 items-center rounded-full border text-xs font-medium transition-colors',
      active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground',
      className,
    )}>
      <button
        type="button"
        {...props}
        className="min-h-9 rounded-full px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {children}
      </button>
      {active && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel || 'Quitar filtro'}
          className="mr-1 flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </span>
  );
}
