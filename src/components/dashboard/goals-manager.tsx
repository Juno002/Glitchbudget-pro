'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { playCoinDrop, playIncome } from '@/lib/sounds';
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
        playCoinDrop();
        onContribute(data.amount);
        toast({
            title: '¡Aporte Exitoso!',
            description: `Has sumado ${formatCurrency(data.amount * 100)} a "${goal.name}".`
        });
        form.reset();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="h-9 font-semibold hover:bg-[rgba(0,255,136,0.1)] hover:text-[#00ff88] transition-colors"><PlusCircle className="mr-2 h-4 w-4" /> Aportar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Aportar a "{goal.name}"</DialogTitle>
                    <DialogDescription>
                        Planificado: {formatCurrency(goal.quota)}/mes<br/>
                        Disponible general: {formatCurrency(disposable)}
                    </DialogDescription>
                </DialogHeader>
                <div className="px-6 pb-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative mt-2">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">RD$</span>
                                                <Input 
                                                    type="number" 
                                                    step="100" 
                                                    {...field} 
                                                    className="h-16 pl-14 text-2xl font-bold bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)]"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full h-12 text-base font-bold bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] transition-all">
                                Confirmar Aporte
                            </Button>
                        </form>
                    </Form>
                </div>
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
    playIncome();
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
                                    <Progress 
                                        value={progress} 
                                        className={cn(
                                            "h-2 bg-[rgba(255,255,255,0.1)]", 
                                            "[&>div]:bg-[#00ff88]",
                                            goal.status === 'completed' && "[&>div]:bg-emerald-500"
                                        )} 
                                    />
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
                    <p className="text-sm text-muted-foreground mb-4 max-w-[280px]">Usa el botón inferior para empezar a destinar fondos a tus sueños.</p>
                </div>
            )}
            
            {/* New Goal Modal (Moved to bottom) */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <button className="mt-4 flex items-center justify-center gap-2 text-sm font-medium w-full py-3 rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                        <PlusCircle className="h-4 w-4"/> Nueva Meta
                    </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0">
                     <DialogHeader className="p-6 pb-4">
                        <DialogTitle>Añadir Nueva Meta</DialogTitle>
                        <DialogDescription>Define qué quieres lograr y cuánto necesitas.</DialogDescription>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* Hero Input for Amount */}
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground font-medium">1. ¿Cuánto necesitas?</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">RD$</span>
                                        <Input 
                                            type="number" 
                                            placeholder="0.00"
                                            value={form.watch('target') || ''} 
                                            onChange={e => {
                                                form.setValue('target', parseFloat(e.target.value) || 0);
                                                form.setValue('quota', undefined); // Reset selection
                                            }}
                                            className="h-16 pl-14 pr-4 text-2xl font-bold bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Nombre</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. Viaje..." {...field} className="h-10 border-[rgba(255,255,255,0.08)] bg-transparent" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => {
                                            const inputRef = useRef<HTMLInputElement>(null);
                                            return (
                                            <FormItem>
                                                <FormLabel className="text-xs">Fecha Límite</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input 
                                                            type="date" 
                                                            {...field} 
                                                            ref={inputRef}
                                                            className="h-10 border-[rgba(255,255,255,0.08)] bg-transparent"
                                                            onChange={e => {
                                                                field.onChange(e.target.value);
                                                                form.setValue('quota', undefined); // Reset selection
                                                            }} 
                                                        />
                                                        <div 
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-white"
                                                            onClick={() => inputRef.current?.showPicker()}
                                                        >
                                                            <Calendar className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                            )
                                        }}
                                    />
                                </div>

                                {target > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-xs">Plan Sugerido</FormLabel>
                                            {disposable > 0 && (
                                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                    Libre: {formatCurrency(disposable)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {suggestions.map(({ profile, monthly, months, eta, viable }) => (
                                                <button
                                                    key={profile}
                                                    type="button"
                                                    disabled={!viable}
                                                    onClick={() => onPlanSelect(monthly / 100, eta?.toISOString().slice(0,10))}
                                                    className={cn(
                                                        "text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors",
                                                        !viable && "opacity-50 cursor-not-allowed bg-muted/10 border-transparent",
                                                        viable && form.watch('quota') === monthly / 100 
                                                            ? "border-[#00ff88] bg-[rgba(0,255,136,0.1)] text-[#00ff88]" 
                                                            : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]",
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Brain className="h-4 w-4 opacity-70" />
                                                        <div>
                                                            <h4 className="font-semibold text-sm capitalize leading-none mb-1">{profile}</h4>
                                                            <div className="text-[10px] opacity-70 leading-none">
                                                                {viable && eta ? `En ~${months} meses` : "Saldo insuficiente"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {viable && (
                                                        <div className="font-bold shrink-0">
                                                            {formatCurrency(monthly)}<span className="text-[10px] font-normal opacity-70">/m</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                            
                                            {/* Date-driven plan if applicable */}
                                            {requiredByDeadline && requiredByDeadline.viable && (
                                                <button
                                                    type="button"
                                                    onClick={() => onPlanSelect(requiredByDeadline.monthlyRequired / 100, deadline)}
                                                    className={cn(
                                                        "text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors mt-2",
                                                        form.watch('quota') === requiredByDeadline.monthlyRequired / 100 
                                                            ? "border-[#00ff88] bg-[rgba(0,255,136,0.1)] text-[#00ff88]" 
                                                            : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]",
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 opacity-70" />
                                                        <div>
                                                            <h4 className="font-semibold text-sm leading-none mb-1">Tu fecha elegida</h4>
                                                            <div className="text-[10px] opacity-70 leading-none">
                                                                Requerido para el {formatDate(deadline!)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="font-bold shrink-0">
                                                        {formatCurrency(requiredByDeadline.monthlyRequired)}<span className="text-[10px] font-normal opacity-70">/m</span>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-12 font-bold bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]" disabled={!isFormValid}>
                                    Crear Meta
                                </Button>
                            </form>
                        </Form>
                    </div>
                </DialogContent>
            </Dialog>
      </div>
    </div>
  );
}