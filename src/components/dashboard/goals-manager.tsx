'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFinances } from '@/contexts/finance-context';
import { Target, Trash2, PlusCircle, Brain, Calendar, Repeat } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SuggestionProfile } from '@/lib/goal-calculator';
import { suggestMonthly, requiredMonthlyByDeadline } from '@/lib/goal-calculator';
import type { Goal } from '@/lib/types';

const goalSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  target: z.coerce.number().positive('El objetivo debe ser un número positivo'),
  date: z.string().optional(),
  quota: z.coerce.number().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

const contributionSchema = z.object({
    amount: z.coerce.number().positive('El monto debe ser positivo'),
});

type ContributionFormValues = z.infer<typeof contributionSchema>;

function ContributeToGoalDialog({ goal, onContribute }: { goal: Goal, onContribute: (amount: number) => void }) {
    const [open, setOpen] = useState(false);
    const { getDisposable } = useFinances();
    const { toast } = useToast();
    const disposable = getDisposable();

    const form = useForm<ContributionFormValues>({
        resolver: zodResolver(contributionSchema),
        defaultValues: { amount: (goal.quota || 0) / 100 },
    });

    const onSubmit = (data: ContributionFormValues) => {
        if ((data.amount * 100) > disposable) {
            toast({
                title: 'Saldo disponible superado',
                description: `Estás intentando aportar más de tu disponible mensual de ${formatCurrency(disposable)}.`,
                variant: 'destructive',
            });
            return;
        }
        onContribute(data.amount);
        toast({
            title: '¡Contribución exitosa!',
            description: `Has añadido ${formatCurrency(data.amount * 100)} a tu meta "${goal.name}".`
        });
        form.reset();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"><PlusCircle className="mr-2 h-4 w-4" /> Aportar</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Aportar a "{goal.name}"</DialogTitle>
                    <DialogDescription>Aporte planificado: {formatCurrency(goal.quota)}. Disponible mensual: {formatCurrency(disposable)}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto a aportar</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="100" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="submit" className="bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]">Confirmar Aporte</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

// Removed GoalPlanner component as it's now integrated inside GoalsManager


export default function GoalsManager() {
  const { goals, addGoal, deleteGoal, contributeToGoal, getTotals, currentMonth, getDisposable } = useFinances();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', target: 0, date: '', quota: 0 },
  });

  const disposable = getDisposable();
  const target = form.watch('target');
  const deadline = form.watch('date');
  
  const suggestionProfiles: SuggestionProfile[] = ['conservative', 'balanced', 'aggressive'];
  const suggestions = useMemo(() => {
      if (!target || target <= 0) return [];
      return suggestionProfiles.map(p => ({
          profile: p,
          ...suggestMonthly(target * 100, 0, disposable, p)
      }))
  }, [target, disposable]);

  const requiredByDeadline = useMemo(() => {
      if (!deadline || !target || target <= 0) return null;
      return requiredMonthlyByDeadline(target * 100, 0, deadline, disposable);
  }, [target, deadline, disposable]);

  const isFormValid = !!(form.watch('name') && form.watch('target') > 0 && form.watch('quota'));

  useEffect(() => {
    if (!open) {
      form.reset({ name: '', target: 0, date: '', quota: undefined });
    }
  }, [open, form]);

  const onPlanSelect = (quota: number, date?: string) => {
    form.setValue('quota', quota);
    if (date) form.setValue('date', date);
  };

  const onSubmit = (data: GoalFormValues) => {
    addGoal({ ...data, quota: data.quota || 0 });
    toast({ title: '¡Meta creada!', description: 'Tu nueva meta de ahorro ha sido añadida.' });
    setOpen(false);
    form.reset({ name: '', target: 0, date: '', quota: undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">Metas de Ahorro</h3>
            <p className="text-sm text-muted-foreground">Crea y gestiona tus objetivos de ahorro a corto y largo plazo.</p>
        </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"><PlusCircle className="mr-2"/> Nueva Meta</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                     <DialogHeader>
                        <DialogTitle>Crear Nueva Meta</DialogTitle>
                        <DialogDescription>Configura tu meta de ahorro paso a paso.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                 <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>1. Nombre de la Meta</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej. Vacaciones, Coche nuevo..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="target"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>2. Monto Objetivo</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="0.00" {...field} onChange={e => {
                                                        field.onChange(parseFloat(e.target.value) || 0);
                                                        form.setValue('quota', undefined); // Reset selection
                                                    }} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fecha Límite (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} onChange={e => {
                                                        field.onChange(e.target.value);
                                                        form.setValue('quota', undefined); // Reset selection
                                                    }} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {target > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <FormLabel className="flex items-center gap-2 mb-2">
                                            3. Selecciona un Plan de Ahorro
                                            {disposable > 0 && (
                                                <span className="text-xs font-normal text-muted-foreground ml-auto bg-secondary/30 px-2 py-1 rounded">
                                                    Disponible: {formatCurrency(disposable)}
                                                </span>
                                            )}
                                        </FormLabel>
                                        <div className="grid gap-3">
                                            {suggestions.map(({ profile, monthly, months, eta, viable }) => (
                                                <button
                                                    key={profile}
                                                    type="button"
                                                    disabled={!viable}
                                                    onClick={() => onPlanSelect(monthly / 100, eta?.toISOString().slice(0,10))}
                                                    className={cn(
                                                        "text-left p-3 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-2 transition-colors",
                                                        !viable && "opacity-50 cursor-not-allowed bg-muted/30 border-dashed",
                                                        viable && form.watch('quota') === monthly / 100 ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/50",
                                                    )}
                                                >
                                                    <div>
                                                        <h4 className="font-semibold capitalize text-sm">{profile}</h4>
                                                        {viable && eta ? (
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                Lo lograrás en ~{months} meses ({formatDate(eta.toISOString().slice(0,10))})
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-destructive-foreground mt-0.5">Saldo insuficiente</div>
                                                        )}
                                                    </div>
                                                    {viable && (
                                                        <div className="font-bold text-primary shrink-0">
                                                            {formatCurrency(monthly)}<span className="text-xs font-normal text-muted-foreground">/mes</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}

                                            {requiredByDeadline && requiredByDeadline.viable && (
                                                <div className="relative pt-4">
                                                    <div className="absolute inset-x-0 top-0 flex items-center justify-center">
                                                        <span className="bg-background px-2 text-xs text-muted-foreground uppercase tracking-widest">Plan de Fecha Opcional</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => onPlanSelect(requiredByDeadline.monthlyRequired / 100, deadline)}
                                                        className={cn(
                                                            "w-full text-left p-3 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-2 transition-colors",
                                                            form.watch('quota') === requiredByDeadline.monthlyRequired / 100 ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/50",
                                                        )}
                                                    >
                                                        <div>
                                                            <h4 className="font-semibold text-sm">Dictado por Fecha Límite</h4>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                Cuota requerida para llegar al {formatDate(deadline!)}
                                                            </div>
                                                        </div>
                                                        <div className="font-bold text-primary shrink-0">
                                                            {formatCurrency(requiredByDeadline.monthlyRequired)}<span className="text-xs font-normal text-muted-foreground">/mes</span>
                                                        </div>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button type="submit" className="w-full bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]" disabled={!isFormValid}>
                                    Crear Meta
                                </Button>
                            </form>
                        </Form>
                    </div>
                </DialogContent>
            </Dialog>
      </div>

      <div className="pt-2">
            {(goals || []).length > 0 ? (
                <div className="flex flex-col gap-3">
                    {goals!.map(goal => {
                        const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
                        const remaining = goal.target - goal.saved;
                        return (
                            <div key={goal.id} className={cn(
                                "flex flex-col sm:flex-row gap-4 p-4 border rounded-xl transition-colors items-start sm:items-center",
                                goal.status === 'completed' ? "bg-emerald-500/5 border-emerald-500/30" : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"
                            )}>
                                {/* Icon & Title */}
                                <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[200px]">
                                    <div className={cn(
                                        "shrink-0 flex items-center justify-center w-12 h-12 rounded-full",
                                        goal.status === 'completed' ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/10 text-primary"
                                    )}>
                                        <Target className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold truncate">{goal.name}</h4>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {goal.date ? `Para ${formatDate(goal.date)}` : 'Sin fecha límite'}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Section */}
                                <div className="flex-1 w-full space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-foreground">{formatCurrency(goal.saved)}</span>
                                        <span className="text-muted-foreground text-xs">de {formatCurrency(goal.target)} ({progress.toFixed(1)}%)</span>
                                    </div>
                                    <Progress value={progress} className={cn("h-2", goal.status === 'completed' && "[&>div]:bg-emerald-500")} />
                                    <div className="flex justify-between text-xs text-muted-foreground !mt-1">
                                        {goal.status === 'completed' ? (
                                             <span className="font-semibold text-emerald-500">¡Meta Completada! 🎉</span>
                                        ) : (
                                            <span>Restan {formatCurrency(remaining)}</span>
                                        )}
                                        {goal.quota > 0 && goal.status === 'active' && (
                                            <span className="flex items-center gap-1">
                                                <Repeat className="h-3 w-3"/>
                                                {formatCurrency(goal.quota)}/mes
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                                    {goal.status === 'active' && (
                                         <ContributeToGoalDialog goal={goal} onContribute={(amount) => contributeToGoal(goal.id, amount)} />
                                    )}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-9 w-9">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar meta?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción es permanente. Se eliminará la meta "{goal.name}". Los fondos aportados no se devolverán automáticamente a tu balance.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteGoal(goal.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-[rgba(255,255,255,0.02)]">
                    <Target className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                    <h4 className="font-medium text-lg mb-1">Sin metas de ahorro</h4>
                    <p className="text-sm text-muted-foreground mb-4 max-w-[280px]">Usa el botón "Nueva Meta" para empezar a destinar fondos a tus sueños.</p>
                </div>
            )}
      </div>
    </div>
  );
}