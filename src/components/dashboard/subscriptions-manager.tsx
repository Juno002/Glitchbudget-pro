import { useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlayCircle, ShieldAlert, CheckCircle2, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategoryInfo } from '@/lib/categories';

export default function SubscriptionsManager() {
  const { recurrents, addRecurring, deleteRecurring, addExpense, currentMonth, expenseCategories } = useFinances();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSub, setNewSub] = useState({ title: '', amount: '', day: '1', categoryId: '' });

  const activeSubs = recurrents?.filter(r => r.active && r.type === 'expense') || [];
  
  // Sort by day
  const sortedSubs = [...activeSubs].sort((a, b) => (a.day || 0) - (b.day || 0));

  // A sub is "pending" if the day is >= today's day (roughly) or we haven't paid it
  const pd = new Date();
  const todayDay = pd.getDate();

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(Number(newSub.amount) * 100);
    if (!newSub.title || amountCents <= 0 || !newSub.categoryId) return;
    
    addRecurring({
      title: newSub.title,
      amount: amountCents,
      day: parseInt(newSub.day),
      freq: 'monthly',
      startDate: new Date().toISOString().slice(0, 10),
      categoryId: newSub.categoryId,
      type: 'expense',
      active: true
    });
    
    setIsAddOpen(false);
    setNewSub({ title: '', amount: '', day: '1', categoryId: '' });
  };

  const handleLogExpense = (sub: typeof activeSubs[0]) => {
    // Add an expense for this subscription
    const date = new Date();
    if (sub.day) date.setDate(sub.day); // approx date
    
    addExpense({
      concept: `Suscripción: ${sub.title}`,
      amount: sub.amount / 100,
      categoryId: sub.categoryId,
      date: date.toISOString().slice(0, 10),
      type: 'Fijo',
      frequency: 'mensual'
    });
    
    toast({ title: 'Suscripción pagada', description: `Se ha registrado el gasto para ${sub.title}.` });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-bold">Mis Suscripciones</h3>
          <p className="text-sm text-muted-foreground">Loggea tus gastos recurrentes manualmente</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              <Plus className="w-4 h-4 mr-2" /> Añadir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Suscripción</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre del Servicio</Label>
                <Input value={newSub.title} onChange={e => setNewSub({...newSub, title: e.target.value})} placeholder="Ej. Netflix, Gimnasio" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto (RD$)</Label>
                  <Input type="number" step="0.01" value={newSub.amount} onChange={e => setNewSub({...newSub, amount: e.target.value})} placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label>Día de cobro</Label>
                  <Select value={newSub.day} onValueChange={v => setNewSub({ ...newSub, day: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={newSub.categoryId} onValueChange={v => setNewSub({ ...newSub, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => {
                         const info = getCategoryInfo(cat);
                         return info ? <SelectItem key={cat} value={cat}>{info.name}</SelectItem> : null;
                      })}
                    </SelectContent>
                  </Select>
              </div>
              <Button type="submit" className="w-full">Guardar Suscripción</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sortedSubs.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
          <PlayCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">Aún no hay suscripciones</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedSubs.map(sub => {
            const isDue = sub.day && todayDay >= sub.day && todayDay - sub.day <= 5; // Due or recently due
            const isFuture = sub.day && sub.day > todayDay;
            
            return (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                    isDue ? "bg-amber-500/20 text-amber-500" : "bg-black/5 dark:bg-white/5 text-muted-foreground"
                  )}>
                    {sub.day || '-'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{sub.title}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{formatCurrency(sub.amount)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleLogExpense(sub)} 
                      className="h-8 text-[11px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                   >
                     <CheckCircle2 className="w-3 h-3 mr-1" /> Loggear
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-bad/50 hover:bg-bad/10 hover:text-bad" onClick={() => deleteRecurring(sub.id)}>
                     <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
