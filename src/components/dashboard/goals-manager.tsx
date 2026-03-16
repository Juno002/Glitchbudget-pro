'use client';

import { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Aportar</Button>
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
                            <Button type="submit">Confirmar Aporte</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function GoalPlanner({ onPlanCreate }: { onPlanCreate: (plan: Omit<GoalFormValues, 'name'>) => void }) {
    const { getDisposable } = useFinances();
    const disposable = getDisposable();
    const [activeTab, setActiveTab] = useState("suggest");

    const form = useForm({
        defaultValues: {
            target: 1000,
            deadline: '',
        }
    });

    const target = form.watch('target');
    const deadline = form.watch('deadline');
    
    const suggestionProfiles: SuggestionProfile[] = ['conservative', 'balanced', 'aggressive'];
    const suggestions = useMemo(() => {
        return suggestionProfiles.map(p => ({
            profile: p,
            ...suggestMonthly(target * 100, 0, disposable, p)
        }))
    }, [target, disposable]);

    const requiredByDeadline = useMemo(() => {
        if (!deadline || !target) return null;
        return requiredMonthlyByDeadline(target * 100, 0, deadline, disposable);
    }, [target, deadline, disposable]);

    return (
        <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-lg mb-2">Planificador Inteligente de Metas</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Disponible mensual para metas: <span className="font-bold text-primary">{formatCurrency(disposable)}</span>
            </p>
            <FormProvider {...form}>
              <form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <FormField
                        control={form.control}
                        name="target"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Monto Objetivo</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="1000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    {activeTab === 'deadline' && (
                        <FormField
                            control={form.control}
                            name="deadline"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha Límite</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    )}
                </div>
            </form>
            </FormProvider>


            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="suggest"><Brain className="mr-2"/>Sugerir Aporte</TabsTrigger>
                    <TabsTrigger value="deadline"><Calendar className="mr-2"/>Llegar a una Fecha</TabsTrigger>
                </TabsList>
                <TabsContent value="suggest" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Sugerencias de Aporte</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             {suggestions.map(({ profile, monthly, months, eta, viable }) => (
                                <div key={profile} className={cn("p-3 rounded-lg border", viable ? 'border-green-500/50' : 'border-destructive/50 opacity-60')}>
                                    <h4 className="font-semibold capitalize flex justify-between items-center">
                                        {profile}
                                        {viable ? 
                                            <Button size="sm" variant="ghost" onClick={() => onPlanCreate({ target, quota: monthly / 100, date: eta?.toISOString().slice(0,10) })}>Usar este plan</Button> :
                                            <span className="text-xs text-destructive">No viable</span>
                                        }
                                    </h4>
                                    {viable && eta ? (
                                        <div className="text-sm text-muted-foreground">
                                            Aportando <span className="font-bold text-primary">{formatCurrency(monthly)}</span>/mes,
                                            lo lograrás en ~<span className="font-bold">{months}</span> meses
                                            (aprox. <span className="font-bold">{formatDate(eta?.toISOString().slice(0,10) || '')}</span>).
                                        </div>
                                    ) : (
                                        <p className="text-sm text-destructive-foreground">No tienes suficiente disponible para este perfil.</p>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="deadline" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Plan por Fecha Límite</CardTitle></CardHeader>
                        <CardContent>
                           {requiredByDeadline ? (
                                <div className={cn("p-3 rounded-lg border", requiredByDeadline.viable ? 'border-green-500/50' : 'border-destructive/50')}>
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold">Aporte mensual requerido</h4>
                                        {requiredByDeadline.viable && (
                                            <Button size="sm" variant="ghost" onClick={() => onPlanCreate({ target, quota: requiredByDeadline.monthlyRequired / 100, date: deadline })}>Usar este plan</Button>
                                        )}
                                    </div>
                                    <p className="text-3xl font-bold text-primary">{formatCurrency(requiredByDeadline.monthlyRequired)}</p>
                                    
                                    {!requiredByDeadline.viable && (
                                        <div className="mt-4 text-destructive-foreground bg-destructive/80 p-3 rounded-md">
                                            <p className="font-bold">Plan no viable</p>
                                            <p className="text-sm">Te faltan <span className="font-bold">{formatCurrency(requiredByDeadline.deficit)}</span>/mes.</p>
                                            <p className="text-sm mt-2">
                                                Con tu disponible actual, la nueva fecha sugerida es <span className="font-bold">{formatDate(requiredByDeadline.altEta.toISOString().slice(0,10))}</span>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                           ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">Ingresa un monto y una fecha para calcular el plan.</p>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function GoalsManager() {
  const { goals, addGoal, deleteGoal, contributeToGoal } = useFinances();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', target: 0, date: '', quota: 0 },
  });
  
  const onPlanCreate = (plan: Omit<GoalFormValues, 'name'>) => {
    form.setValue('target', plan.target);
    form.setValue('date', plan.date);
    form.setValue('quota', plan.quota);
    toast({ title: "Plan de meta cargado", description: "Ahora ponle un nombre a tu meta y guárdala." });
  }

  const onSubmit = (data: GoalFormValues) => {
    addGoal(data);
    toast({ title: '¡Meta creada!', description: 'Tu nueva meta de ahorro ha sido añadida.' });
    form.reset({ name: '', target: 0, date: '', quota: 0 });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><Target className="h-6 w-6" /> Metas de Ahorro</CardTitle>
                <CardDescription>Crea y gestiona tus objetivos de ahorro a corto y largo plazo.</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2"/> Nueva Meta</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                     <DialogHeader>
                        <DialogTitle>Crear Nueva Meta</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GoalPlanner onPlanCreate={onPlanCreate} />
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-card">
                                 <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>1. Nombre de la Meta</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Vacaciones, nuevo PC..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="target"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>2. Monto Objetivo</FormLabel>
                                            <FormControl><Input type="number" readOnly disabled {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name="quota"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>3. Cuota Mensual</FormLabel>
                                                <FormControl><Input type="number" readOnly disabled {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>4. Fecha Estimada</FormLabel>
                                                <FormControl><Input type="date" readOnly disabled {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button type="submit" className="w-full">Crear Meta</Button>
                            </form>
                        </Form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
            {(goals || []).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals!.map(goal => {
                        const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
                        const remaining = goal.target - goal.saved;
                        return (
                            <div key={goal.id} className={cn("p-4 border rounded-lg", goal.status === 'completed' && "bg-green-500/10 border-green-500")}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{goal.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {goal.date ? `Objetivo para el ${formatDate(goal.date)}` : 'Sin fecha límite'}
                                        </p>
                                        {goal.status === 'completed' && <span className="text-xs font-bold text-green-600">¡Completada!</span>}
                                    </div>
                                     <div className="flex items-center gap-2">
                                        {goal.status === 'active' && <ContributeToGoalDialog goal={goal} onContribute={(amount) => contributeToGoal(goal.id, amount)} />}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
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
                                                    <AlertDialogAction onClick={() => deleteGoal(goal.id)}>Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold">{formatCurrency(goal.saved)}</span>
                                        <span className="text-muted-foreground">de {formatCurrency(goal.target)}</span>
                                    </div>
                                    <Progress value={progress} />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>Resta: {formatCurrency(remaining)}</span>
                                        <span>{progress.toFixed(1)}%</span>
                                    </div>
                                    {goal.quota > 0 && goal.status === 'active' && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            <Repeat className="inline h-3 w-3 mr-1"/>
                                            Plan de aporte: <span className="font-semibold">{formatCurrency(goal.quota)}/mes</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-10 border rounded-lg">
                    <p>No has creado ninguna meta de ahorro todavía.</p>
                    <p className="text-sm">Usa el botón "Nueva Meta" para empezar a planificar tus sueños.</p>
                </div>
            )}
      </CardContent>
    </Card>
  );
}