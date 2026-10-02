'use client';

import { ICON_MAP } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const SelectedIcon = ICON_MAP[value] || ICON_MAP['landmark'];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-label="Elegir icono de categoría" title="Elegir icono" className="flex h-10 shrink-0 items-center gap-2 px-3">
          <SelectedIcon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 sm:w-80" align="start">
        <div className="grid max-h-[200px] grid-cols-5 gap-1 overflow-y-auto pr-1 sm:grid-cols-6">
          {Object.entries(ICON_MAP).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              aria-label={'Usar icono '+name}
              aria-pressed={value === name}
              onClick={() => onChange(name)}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                value === name ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}