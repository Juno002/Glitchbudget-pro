'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import { usePrivateCurrency } from '@/contexts/balance-visibility-context';
import { EmptyState, ProgressMetric } from '@/components/finance-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { goalDraftFundingSchedule, goalManagerReadModel, goalWouldComplete, type GoalView } from '@/domain/goals';
import { formatDate, toCents } from '@/lib/utils';
import { isValidDate, localDate } from '@/lib/finance-calculations';
import { triggerGoalCompletionConfetti } from '@/lib/confetti';

const monetaryInput = z.coerce.number().finite().nonnegative().refine(value => Number.isSafeInteger(toCents(value)), 'El monto supera el máximo admitido.');
const goalSchema = z.object({
  name:z.string().trim().min(3, 'Escribe al menos 3 caracteres.'),
  target:monetaryInput.refine(value => toCents(value) > 0, 'El objetivo mínimo es 0.01.'),
  date:z.string().refine(value => !value || isValidDate(value), 'Elige una fecha válida.'),
  quota:monetaryInput,
});
type GoalInput = z.infer<typeof goalSchema>;
const contributionSchema = z.object({ amount:monetaryInput.refine(value => toCents(value) > 0, 'El aporte mínimo es 0.01.') });

function ContributeDialog({ goal, model }: { goal:GoalView; model:ReturnType<typeof goalManagerReadModel> }) {
  const { contributeToGoal } = useFinances();
  const money = usePrivateCurrency();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof contributionSchema>>({ resolver:zodResolver(contributionSchema), defaultValues:{ amount:model.suggestedContribution / 100 } });
  async function submit(values:z.infer<typeof contributionSchema>) {
    if (!await contributeToGoal(goal.id, values.amount)) return;
    if (goalWouldComplete(goal, toCents(values.amount))) triggerGoalCompletionConfetti();
    setOpen(false);
  }
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) form.reset({ amount:model.suggestedContribution / 100 }); }}>
    <DialogTrigger asChild><Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Aportar</Button></DialogTrigger>
    <DialogContent className="sm:max-w-md" data-goal-contribution-dialog="prisma">
      <DialogHeader><DialogTitle className="font-display text-2xl font-normal">Aportar a {goal.name}</DialogTitle><DialogDescription>Registrarás una reserva para esta meta. El efectivo y los saldos bancarios no cambian.</DialogDescription></DialogHeader>
      <p className="text-sm text-muted-foreground">Ahorrado: {money(model.saved)} · Restante: {money(model.remaining)}</p>
      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <FormField control={form.control} name="amount" render={({field}) => <FormItem><FormLabel>Importe del aporte</FormLabel><FormControl><Input {...field} type="number" inputMode="decimal" min="0.01" step="0.01" autoFocus /></FormControl><FormMessage /></FormItem>} />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">{form.formState.isSubmitting ? 'Guardando…' : 'Confirmar aporte'}</Button>
      </form></Form>
    </DialogContent>
  </Dialog>;
}

export default function GoalsManager() {
  const { goals, goalContributions, addGoal, updateGoal, deleteGoal, periodStartDay } = useFinances();
  const money = usePrivateCurrency();
  const [open, setOpen] = useState(false);
  const today = localDate();
  const [editing, setEditing] = useState<GoalView | null>(null);
  const earliestDate = editing?.startDate || today;
  const form = useForm<GoalInput>({ resolver:zodResolver(goalSchema.refine(value => !value.date || value.date >= earliestDate, {path:['date'], message:'La fecha límite no puede ser anterior al inicio de la meta.'})), defaultValues:{ name:'', target:0, date:'', quota:0 } });
  const target = form.watch('target');
  const deadline = form.watch('date');
  const schedule = deadline && isValidDate(deadline) && target > 0 ? goalDraftFundingSchedule(toCents(target), editing?.saved || 0, deadline, today, {periodStartDay}) : null;
  async function submit(values:GoalInput) {
    const saved = editing
      ? await updateGoal({...editing, name:values.name, target:toCents(values.target), quota:toCents(values.quota), date:values.date || undefined})
      : await addGoal({...values, date:values.date || undefined});
    if (!saved) return;
    setOpen(false);
    form.reset();
  }
  return <section className="space-y-5" aria-labelledby="goals-heading" data-plan-goals="prisma">
    <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Objetivos</p><h3 id="goals-heading" className="mt-1 font-display text-2xl font-normal tracking-[-0.025em]">Metas de ahorro</h3><p className="mt-1 text-sm text-muted-foreground">Los aportes son reservas de planificación: no son gastos ni mueven dinero entre cuentas.</p></div>
    {goals?.length ? <div className="grid gap-4 xl:grid-cols-2">{goals.map(goal => {
      const metrics = goalManagerReadModel(goal, goalContributions || [], today, { periodStartDay });
      return <article key={goal.id} className="min-w-0 space-y-4 rounded-[var(--radius-card)] border bg-card p-5 shadow-[var(--shadow-card)]" data-goal-card="prisma">
        <ProgressMetric label={<span className="break-words">{goal.name}</span>} current={metrics.saved} total={goal.target} remaining={metrics.remaining} currentLabel="Ahorrado" totalLabel="Objetivo" status={metrics.status === 'completed' ? 'success' : metrics.overdue ? 'warning' : 'neutral'} statusLabel={metrics.status === 'completed' ? 'Completada' : metrics.overdue ? 'Plazo vencido' : 'En progreso'} />
        <div className="grid gap-3 rounded-[var(--radius-interactive)] bg-muted/35 p-3 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Fecha límite: </span>{goal.date ? formatDate(goal.date) : 'Sin fecha límite'}</p>
          <p><span className="text-muted-foreground">Aporte mensual requerido: </span><strong>{metrics.requiredMonthly === null ? 'Define una fecha límite' : money(metrics.requiredMonthly)}</strong></p>
        </div>
        {metrics.requiredMonthly !== null && metrics.remaining > 0 && <p className="text-xs text-muted-foreground">{metrics.overdue ? 'El plazo terminó; queda por reservar el importe restante.' : 'Repartido entre ' + metrics.periods + ' períodos financieros, incluido el actual.'}</p>}
        {goal.quota > 0 && <p className="text-xs text-muted-foreground">Tu aporte planificado: {money(goal.quota)} por período. Es una referencia; no genera aportes automáticos.</p>}
        {metrics.legacyBalance > 0 && <p className="text-xs text-muted-foreground">Incluye {money(metrics.legacyBalance)} de progreso anterior recuperado. No se cuenta como una nueva reserva mensual.</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {metrics.status === 'active' && <ContributeDialog goal={goal} model={metrics} />}
          <Button variant="ghost" size="icon" aria-label={'Editar meta ' + goal.name} onClick={() => { setEditing(goal); form.reset({name:goal.name,target:goal.target/100,date:goal.date || '',quota:goal.quota/100}); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={'Eliminar meta ' + goal.name}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar {goal.name}?</AlertDialogTitle><AlertDialogDescription>Se eliminarán la meta y sus reservas de planificación. El efectivo, las cuentas y los movimientos reales conservarán sus saldos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteGoal(goal.id)}>Eliminar meta</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </article>;
    })}</div> : <EmptyState title="Todavía no tienes metas" description="Define un objetivo y registra tus reservas para seguir su progreso." />}
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { form.reset(); setEditing(null); } }}><DialogTrigger asChild><Button variant="outline" className="min-h-12 w-full rounded-[var(--radius-interactive)] border-dashed"><PlusCircle className="mr-2 h-4 w-4" />Nueva meta</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md" data-goal-dialog="prisma"><DialogHeader><DialogTitle className="font-display text-2xl font-normal">{editing ? 'Editar meta' : 'Nueva meta'}</DialogTitle><DialogDescription>{editing ? 'Ajusta tu objetivo o plazo. Los aportes registrados se conservan.' : 'Define tu objetivo. Puedes empezar aunque todavía no tengas un aporte mensual planificado.'}</DialogDescription></DialogHeader>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField control={form.control} name="name" render={({field}) => <FormItem><FormLabel>Nombre de la meta</FormLabel><FormControl><Input {...field} placeholder="Ej. Fondo de emergencia" autoComplete="off" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="target" render={({field}) => <FormItem><FormLabel>Objetivo</FormLabel><FormControl><Input {...field} type="number" inputMode="decimal" min="0.01" step="0.01" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="date" render={({field}) => <FormItem><FormLabel>Fecha límite (opcional)</FormLabel><FormControl><Input {...field} type="date" min={earliestDate} /></FormControl><FormMessage /></FormItem>} />
          {schedule && <p className="rounded-[var(--radius-interactive)] border border-[hsl(var(--brand-mint)/0.22)] bg-[hsl(var(--brand-mint)/0.08)] p-3 text-sm">Para llegar a tiempo: <strong>{money(schedule.requiredMonthly!)}</strong> por período financiero, desde el actual. Esta sugerencia no mueve dinero.</p>}
          <FormField control={form.control} name="quota" render={({field}) => <FormItem><FormLabel>Aporte planificado por período (opcional)</FormLabel><FormControl><Input {...field} type="number" inputMode="decimal" min="0" step="0.01" /></FormControl><FormMessage /></FormItem>} />
          {schedule && <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue('quota',schedule.requiredMonthly!/100)}>Usar aporte sugerido</Button>}
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">{form.formState.isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear meta'}</Button>
        </form></Form>
      </DialogContent>
    </Dialog>
  </section>;
}
