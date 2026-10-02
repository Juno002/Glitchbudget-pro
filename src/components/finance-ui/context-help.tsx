'use client';

import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function ContextHelp({
  label,
  children,
  className,
  contextLabel,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  contextLabel?: string;
}) {
  const displayLabel=contextLabel ?? label;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-interactive)] text-muted-foreground transition-colors duration-[var(--motion-control)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-72 text-xs leading-relaxed"
        showCloseButton
        closeLabel={'Cerrar explicación de '+displayLabel}
        data-context-help={displayLabel}
      >
        <p className="font-semibold text-foreground">{displayLabel}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}