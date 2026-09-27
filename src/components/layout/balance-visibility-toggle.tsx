'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBalanceVisibility } from '@/contexts/balance-visibility-context';

export function BalanceVisibilityToggle() {
  const { balancesHidden, toggleBalancesHidden } = useBalanceVisibility();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-pressed={balancesHidden}
      aria-label={balancesHidden ? 'Mostrar importes' : 'Ocultar importes'}
      title={balancesHidden ? 'Mostrar importes' : 'Ocultar importes'}
      onClick={toggleBalancesHidden}
    >
      {balancesHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </Button>
  );
}
