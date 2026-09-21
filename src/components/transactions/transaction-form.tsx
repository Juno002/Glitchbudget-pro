'use client';

import { AccountSelect } from '@/components/dashboard/account-select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { localDate } from '@/lib/finance-calculations';
import { useState, useMemo } from 'react';

const formSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('El monto debe ser positivo'),
  description: z.string().min(2, 'La descripción debe tener al menos 2 caracteres'),
  categoryId: z.string().min(1, 'Por favor selecciona una categoría'),
});

type TransactionFormValues = z.infer<typeof formSchema>;

export function TransactionForm({ setOpen }: { setOpen: (open: boolean) => void }) {
  const [accountId, setAccountId] = useState('');
  const { addIncomeItem, addExpense, incomeCategories, expenseCategories } = useFinances();
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      description: '',
      categoryId: '',
    },
  });
  
  const categoryOptions = useMemo(() => {
    return type === 'income' ? incomeCategories : expenseCategories;
  }, [type, incomeCategories, expenseCategories]);

  async function onSubmit(values: TransactionFormValues) {
    const data = {
        amount: values.amount,
        date: localDate(),
        categoryId: values.categoryId,
    };
    let success: boolean;
    if (values.type === 'income') {
        success = await addIncomeItem({ ...data, accountId: accountId || undefined, description: values.description, type: 'extra' });
    } else {
        success = await addExpense({ ...data, accountId: accountId || undefined, concept: values.description, type: 'Variable' });
    }
    if (!success) return;
    form.reset();
    setOpen(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <AccountSelect value={accountId} onChange={setAccountId} label={type === 'income' ? 'Cuenta de destino' : 'Cuenta de origen'} />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Tabs
                  value={field.value}
                  onValueChange={(value) => {
                    const newType = value as 'income' | 'expense';
                    field.onChange(newType);
                    setType(newType);
                    form.setValue('categoryId', ''); // Reset category on type change
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expense">Gasto</TabsTrigger>
                    <TabsTrigger value="income">Ingreso</TabsTrigger>
                  </TabsList>
                </Tabs>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Café" {...field} />
              </FormControl>
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
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoryOptions.map(id => {
                    const cat = getCategoryInfo(id);
                    return cat ? <SelectItem key={id} value={id}>{cat.name}</SelectItem> : null
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={form.formState.isSubmitting} type="submit" className="w-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">Guardar transacción</Button>
      </form>
    </Form>
  );
}
