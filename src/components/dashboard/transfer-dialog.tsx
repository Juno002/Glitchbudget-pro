'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  fromCategoryId: z.string().min(1, 'Debes seleccionar una categoría de origen'),
  toCategoryId: z.string().min(1, 'Debes seleccionar una categoría de destino'),
  amount: z.coerce.number().positive('El monto debe ser mayor que cero'),
}).refine(data => data.fromCategoryId !== data.toCategoryId, {
  message: 'La categoría de origen y destino no pueden ser la misma',
  path: ['toCategoryId'],
});

type TransferFormValues = z.infer<typeof formSchema>;

export default function TransferDialog() {
  const [open, setOpen] = useState(false);
  const { expenseCategories, transferBetweenBudgets, getBudgetStatusDetails, currentMonth } = useFinances();
  const { toast } = useToast();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromCategoryId: '',
      toCategoryId: '',
      amount: 0,
    },
  });

  const budgetsWithFunds = getBudgetStatusDetails(currentMonth).filter(b => b.limit > 0);

  async function onSubmit(values: TransferFormValues) {
    try {
        await transferBetweenBudgets(currentMonth, values.fromCategoryId, values.toCategoryId, values.amount);
        toast({
            title: 'Transferencia exitosa',
            description: 'El monto ha sido transferido entre los presupuestos.',
        });
        form.reset();
        setOpen(false);
    } catch (error: any) {
        toast({
            title: 'Error en la transferencia',
            description: error.message,
            variant: 'destructive',
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Transferir entre Planes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transferir Fondos</DialogTitle>
          <DialogDescription>
            Mueve montos entre tus categorías de presupuesto para el mes actual.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="fromCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desde</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría de origen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {budgetsWithFunds.map(b => {
                        const cat = getCategoryInfo(b.categoryId);
                        return cat ? <SelectItem key={cat.id} value={cat.id}>{cat.name} ({formatCurrency(b.limit)})</SelectItem> : null
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hacia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría de destino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map(id => {
                        const cat = getCategoryInfo(id);
                        return cat ? <SelectItem key={id} value={id}>{cat.name}</SelectItem> : null
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="submit" className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">Confirmar Transferencia</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    