'use client';

import { Fragment, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ActionMenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
};

export function ActionMenu({
  label = 'Más acciones',
  items,
}: {
  label?: string;
  items: ActionMenuItem[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label={label} title={label}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={item.disabled}
              onSelect={event => {
                event.preventDefault();
                item.onSelect();
              }}
              className={item.destructive ? 'text-destructive focus:text-destructive' : undefined}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
