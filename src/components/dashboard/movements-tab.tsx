'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { useToast } from '@/hooks/use-toast';
import { playAIInsight } from '@/lib/sounds';

const movementSchema = z.object({
  movementType: z.enum(['expense', 'income']),
  expenseType: z.enum(['Fijo', 'Variable', 'Ocasional']).optional(),
  incomeType: z.enum(['extra', 'gift']).optional(),
  concept: z.string().min(2, 'La descripción es requerida.'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0.'),
  categoryId: z.string().min(1, 'La categoría es requerida.'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Fecha inválida' }),
  frequency: z.enum(['mensual', 'quincenal', 'semanal']).optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

const today = () => new Date().toISOString().slice(0, 10);

function MainIncomeCard() {
    const { baseIncome: baseIncomeSettings, setBaseIncome } = useFinances();
    const { toast } = useToast();

    const form = useForm({
        defaultValues: {
            freq: baseIncomeSettings?.freq || 'mensual',
            amount: (baseIncomeSettings?.amount || 0) / 100,
        }
    });

     useEffect(() => {
        form.setValue('freq', baseIncomeSettings.freq);
        form.setValue('amount', baseIncomeSettings.amount / 100);
    }, [baseIncomeSettings, form.setValue]);


    const onSaveBaseIncome = (data: { freq: 'mensual' | 'quincenal' | 'semanal', amount: number }) => {
        if (data.amount < 0) {
            toast({ title: "El monto no puede ser negativo", variant: "destructive" });
            return;
        }
        setBaseIncome({ freq: data.freq, amount: Number(data.amount) });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>💼 Ingreso Principal</CardTitle>
                <CardDescription>Establece tu sueldo o ingreso recurrente principal.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSaveBaseIncome)} className="space-y-4">
                    <div className='flex flex-col sm:flex-row gap-4'>
                        <Select value={form.watch('freq')} onValueChange={(val) => form.setValue('freq', val as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Frecuencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mensual">Mensual</SelectItem>
                                <SelectItem value="quincenal">Quincenal (2x mes)</SelectItem>
                                <SelectItem value="semanal">Semanal (4.33x mes)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input type="number" placeholder="0.00" min="0" step="0.01" {...form.register('amount')} />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]">Guardar Ingreso Principal</Button>
                </form>
            </CardContent>
        </Card>
    )
}


export default function MovementsTab() {
  const { addExpense, addIncomeItem, expenseCategories, incomeCategories, strictMode, getTotals, getBudgetStatusDetails, currentMonth } = useFinances();
  const { toast } = useToast();
  const [movementType, setMovementType] = useState<'expense' | 'income'>('expense');
  const [expenseType, setExpenseType] = useState<'Fijo' | 'Variable' | 'Ocasional'>('Variable');
  const [insight, setInsight] = useState<string | null>(null);
  const [isFetchingInsight, setIsFetchingInsight] = useState(false);
  
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      movementType: 'expense',
      expenseType: 'Variable',
      concept: '',
      amount: 0,
      categoryId: '',
      date: today(),
    },
  });

  const categoryOptions = useMemo(() => {
    return movementType === 'income' ? incomeCategories : expenseCategories;
  }, [movementType, incomeCategories, expenseCategories]);
  
  useEffect(() => {
    form.setValue('categoryId', '');
  }, [categoryOptions, form]);

  // Clear insight when user starts typing a new transaction
  useEffect(() => {
    const subscription = form.watch(() => {
      if (insight) setInsight(null);
    });
    return () => subscription.unsubscribe();
  }, [form, insight]);

  const onSubmit = async (values: MovementFormValues) => {
    const { available } = getTotals(currentMonth);
    
    if (values.movementType === 'expense' && strictMode && (values.amount * 100) > available) {
        toast({ title: "Modo estricto: Saldo insuficiente", description: "No puedes registrar un gasto que exceda tu saldo disponible.", variant: "destructive" });
        return;
    }

    if (values.movementType === 'expense') {
      addExpense({
        concept: values.concept,
        amount: values.amount,
        categoryId: values.categoryId,
        date: values.date,
        type: values.expenseType || 'Variable',
        frequency: values.expenseType === 'Fijo' ? values.frequency : undefined,
      });

      // Show loading indicator
      setIsFetchingInsight(true);
      setInsight(null);

      // Ambient AI Fetching for Expense
      const budgets = getBudgetStatusDetails(currentMonth);
      const budget = budgets.find((b: any) => b.categoryId === values.categoryId);
      const catInfo = getCategoryInfo(values.categoryId);
      
      const aiPayload = {
        description: values.concept,
        amount: values.amount,
        category: catInfo?.name || values.categoryId,
        budgetForCategory: budget ? { limit: budget.limit / 100, spent: budget.spent / 100 } : null,
        available: (available - values.amount * 100) / 100
      };

      fetch('/api/ai-insight-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.insight) {
          setInsight(data.insight);
          playAIInsight();
        }
      })
      .catch(() => {}) // Fallamos en silencio
      .finally(() => {
        setIsFetchingInsight(false);
      });
      
    } else {
      addIncomeItem({
        description: values.concept,
        amount: values.amount,
        categoryId: values.categoryId,
        date: values.date,
        type: values.incomeType || 'extra',
      });
    }

    form.reset({
      movementType,
      expenseType: 'Variable',
      incomeType: 'extra',
      concept: '',
      amount: 0,
      categoryId: '',
      date: today(),
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Registro de Movimientos</h2>
      
      <MainIncomeCard />

      <Card>
        <CardHeader>
          <CardTitle>➕ Registrar Movimiento Puntual</CardTitle>
          <CardDescription>Añade un nuevo ingreso o gasto a tus finanzas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="movementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimiento</FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={(value) => {
                          const newType = value as 'income' | 'expense';
                          field.onChange(newType);
                          setMovementType(newType);
                        }}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="expense">Gasto</TabsTrigger>
                          <TabsTrigger value="income">Ingreso</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                  </FormItem>
                )}
              />

              {movementType === 'expense' && (
                <FormField
                  control={form.control}
                  name="expenseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Gasto</FormLabel>
                      <Select onValueChange={(value) => {
                        const newType = value as 'Fijo' | 'Variable' | 'Ocasional';
                        field.onChange(newType);
                        setExpenseType(newType);
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo de gasto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Variable">Variable (Supermercado, gasolina...)</SelectItem>
                          <SelectItem value="Ocasional">Ocasional (Cine, regalos...)</SelectItem>
                          <SelectItem value="Fijo">Fijo (Alquiler, suscripciones...)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {movementType === 'income' && (
                 <FormField
                  control={form.control}
                  name="incomeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Ingreso</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo de ingreso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="extra">Adicional (Freelance, bonos...)</SelectItem>
                          <SelectItem value="gift">Regalo / Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {expenseType === 'Fijo' && movementType === 'expense' && (
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frecuencia del Gasto Fijo</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue="mensual">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Frecuencia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mensual">Mensual</SelectItem>
                          <SelectItem value="quincenal">Quincenal</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="concept"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concepto</FormLabel>
                    <FormControl>
                      <Input placeholder={movementType === 'expense' ? 'Ej: Café con amigos' : 'Ej: Proyecto de diseño'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Monto</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Categoría</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona..." />
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

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Fecha</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]" disabled={isFetchingInsight}>
                Añadir Movimiento
              </Button>
              
              {isFetchingInsight && (
                <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.12)] rounded-[14px] px-[14px] py-[10px] mt-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
                  <p className="text-sm text-[rgba(255,255,255,0.5)] italic">Analizando impacto...</p>
                </div>
              )}

              {insight && !isFetchingInsight && (
                <div className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.12)] rounded-[14px] px-[14px] py-[10px] mt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p className="text-sm text-[rgba(255,255,255,0.5)] leading-snug">{insight}</p>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
