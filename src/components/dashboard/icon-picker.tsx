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
        <Button variant="outline" className="flex items-center gap-2 h-10 px-3">
          <SelectedIcon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="grid grid-cols-6 gap-1 max-h-[200px] overflow-y-auto pr-1">
          {Object.entries(ICON_MAP).map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => onChange(name)}
              className={cn(
                "flex items-center justify-center p-2 rounded-md hover:bg-primary/10 transition-colors",
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
