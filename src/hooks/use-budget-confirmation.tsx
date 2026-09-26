'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BudgetWarning } from '@/policies/budget-overspending';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
export function useBudgetConfirmation(currency: string, locale: string) {
  const [warning, setWarning] = useState<BudgetWarning | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const finish = useCallback((value: boolean) => { const resolve = resolver.current; resolver.current = null; setWarning(null); resolve?.(value); }, []);
  const confirm = useCallback((value: BudgetWarning) => new Promise<boolean>(resolve => {
    if (resolver.current) { resolve(false); return; }
    resolver.current = resolve; setWarning(value);
  }), []);
  useEffect(() => () => { resolver.current?.(false); resolver.current = null; }, []);
  const amount = (cents: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  const dialog = <AlertDialog open={!!warning} onOpenChange={open => { if (!open) finish(false); }}>
    <AlertDialogContent className="z-[100]">
      <AlertDialogHeader><AlertDialogTitle>El gasto supera el presupuesto</AlertDialogTitle>
        <AlertDialogDescription>{warning && <>En {warning.evaluation.month}, el gasto de esta categoría quedaría en {amount(warning.evaluation.after)}, frente a un presupuesto de {amount(warning.evaluation.limit ?? 0)}. Todavía no se ha guardado. ¿Quieres continuar?</>}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel onClick={() => finish(false)}>Volver al gasto</AlertDialogCancel><AlertDialogAction onClick={() => finish(true)}>Guardar de todos modos</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
  return { confirm, dialog };
}
