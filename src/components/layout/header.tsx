
'use client';

import { localDate } from '@/lib/finance-calculations';
import { HelpDialog } from './help-dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useEffect, useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Moon, Sun, Settings, RefreshCw, Plus, Minus, Loader, Info, Briefcase } from 'lucide-react';
import OpfsBackupDialog from '@/components/backup/opfs-backup-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { db } from '@/lib/db';

import { AchievementsDialogContent, AchievementToastLayer, AchievementHeaderBadge } from '@/components/dashboard/achievements-panel';
import ExpenseCategoryManager from '@/components/dashboard/expense-category-manager';
import IncomeCategoryManager from '@/components/dashboard/income-category-manager';

export default function Header({ onNewMovement }: { onNewMovement?: () => void }) {
  const { 
    theme, setTheme, 
    strictMode, setStrictMode, 
    currentMonth, setCurrentMonth, 
    rolloverStrategy, setRolloverStrategy,
    baseIncome: baseIncomeSettings, setBaseIncome,
    resetSettings, isWorking
  } = useFinances();
  const [baseFreq, setBaseFreq] = useState(baseIncomeSettings?.freq || 'mensual');
  const [baseAmount, setBaseAmount] = useState(String((baseIncomeSettings?.amount || 0) / 100));
  const { toast } = useToast();




  // Theme toggle moved to explicit selector dialog
  
  const handleClearData = async () => {
    try {
        await db.transaction('rw', db.tables, async () => {
            for (const table of db.tables) {
                await table.clear();
            }
        });
        // Also clear achievements stored in localStorage
        localStorage.removeItem('glitchbudget_achievements');
        localStorage.removeItem('glitchbudget_contribution_streak');
        await resetSettings();
        toast({ title: "Datos eliminados", description: "Todos los datos han sido borrados. La página se recargará." });
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        console.error("Failed to clear data:", error);
        toast({ title: "Error al limpiar los datos", description: "No se pudieron borrar los datos. Revisa la consola.", variant: 'destructive'});
    }
  }

  return (
    <>
    <header className="sticky top-0 z-10 flex h-auto items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 py-2">
      <div className="flex w-full items-center gap-2 flex-wrap">
         <div className="flex items-center gap-2 mr-auto">
            <Link href="/" className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--primary)_/_0.08)] border border-primary/20 text-primary shadow-[0_0_15px_hsl(var(--primary)_/_0.1)] transition-all hover:bg-primary/10">
                    <span className="text-lg">💰</span>
                    <span className="font-syne font-bold tracking-wide">GlitchBudget Pro</span>
                </div>
            </Link>
        </div>
        {onNewMovement && <Button className="md:hidden shrink-0" size="icon" onClick={onNewMovement} aria-label="Nuevo movimiento"><Plus className="h-5 w-5" /></Button>}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 pt-2 sm:pt-0 w-full sm:w-auto">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <label htmlFor="month" className="text-sm text-muted-foreground hidden md:inline">Período</label>
                <div className="relative min-w-0 w-[104px] sm:w-[145px] h-9 rounded-full border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                  <span aria-hidden="true" className="flex h-full items-center justify-center px-2 text-xs sm:text-sm capitalize pointer-events-none">{new Date(`${currentMonth}-02T12:00:00`).toLocaleDateString('es-DO', { month: 'short', year: 'numeric' })}</span>
                  <Input id="month" type="month" value={currentMonth} onChange={(e) => { if (e.target.value) setCurrentMonth(e.target.value); }} aria-label="Mes del presupuesto" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <Button variant="outline" className="h-9 px-2 text-xs sm:text-sm" onClick={() => setCurrentMonth(localDate().slice(0, 7))}>Este mes</Button>
            </div>
            
             <Dialog>
               <DialogTrigger asChild>
                 <Button variant="outline" size="icon" className="relative" aria-label="Ver logros">
                   <AchievementHeaderBadge />
                 </Button>
               </DialogTrigger>
               <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                 <DialogHeader>
                   <DialogTitle>🏆 Logros</DialogTitle>
                   <DialogDescription>
                     Tu progreso y medallas desbloqueadas.
                   </DialogDescription>
                 </DialogHeader>
                 <AchievementsDialogContent />
               </DialogContent>
             </Dialog>

             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Ajustes">
                  { isWorking ? <Loader className="animate-spin" /> : <Settings className="h-4 w-4" /> }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="relative flex cursor-default select-none items-center rounded-[6px] px-2 py-1.5 text-sm outline-none transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10">
                    <label className="flex flex-1 items-center cursor-pointer gap-2">
                        <input type="checkbox" checked={strictMode} onChange={e => setStrictMode(e.target.checked)} />
                        <span>Modo estricto</span>
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button aria-label="Cómo funciona el modo estricto" className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors focus:outline-none" onClick={(e) => e.stopPropagation()}>
                                <Info className="h-4 w-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" side="left">
                            <h4 className="font-semibold mb-2">Modo Estricto</h4>
                            <p className="text-xs text-muted-foreground">
                                Impide registrar gastos en efectivo, pagos y aportes que superen el disponible del mes. Tiene en cuenta lo reservado en presupuestos y ahorro.
                            </p>
                        </PopoverContent>
                    </Popover>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            {theme === 'light' ? <Sun className="mr-2 h-4 w-4" /> : theme === 'serious' ? <Briefcase className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                            <span>Apariencia</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Apariencia visual</DialogTitle>
                            <DialogDescription>
                                Personaliza los colores y el estilo de la aplicación.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <RadioGroup value={theme} onValueChange={(value) => setTheme(value as any)} className="gap-4">
                                <div className="flex items-center space-x-2 rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:bg-white/5 transition-colors">
                                    <RadioGroupItem value="dark" id="t1" />
                                    <Label htmlFor="t1" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><Moon className="h-4 w-4 text-slate-400" /> Neón Oscuro (Default)</span>
                                        <span className="text-xs text-muted-foreground mt-1">El tema clásico de GlitchBudget con colores vibrantes.</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:bg-white/5 transition-colors">
                                    <RadioGroupItem value="light" id="t2" />
                                    <Label htmlFor="t2" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><Sun className="h-4 w-4 text-amber-500" /> Modo Claro</span>
                                        <span className="text-xs text-muted-foreground mt-1">Superficies claras y colores de alto contraste.</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:bg-white/5 transition-colors">
                                    <RadioGroupItem value="serious" id="t3" />
                                    <Label htmlFor="t3" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><Briefcase className="h-4 w-4 text-blue-500" /> Minimalista</span>
                                        <span className="text-xs text-muted-foreground mt-1">Superficies mate, tipografía sencilla y acentos discretos.</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            <span>Cierre de Mes</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Estrategia de Cierre de Mes</DialogTitle>
                            <DialogDescription>
                                ¿Qué ocurre con tus presupuestos cuando empieza un mes nuevo?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <RadioGroup value={rolloverStrategy} onValueChange={(value) => setRolloverStrategy(value as any)} className="gap-4">
                                <div className="flex items-center space-x-2 rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:bg-white/5 transition-colors">
                                    <RadioGroupItem value="reset" id="r1" />
                                    <Label htmlFor="r1" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><RefreshCw className="h-4 w-4 text-slate-400" /> Resetear a cero</span>
                                        <span className="text-xs text-muted-foreground mt-1">Descarta lo sobrante y empieza de nuevo con los límites base.</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:bg-white/5 transition-colors">
                                    <RadioGroupItem value="accumulate_surplus" id="r2" />
                                    <Label htmlFor="r2" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><Plus className="h-4 w-4 text-primary" /> Acumular Sobrante</span>
                                        <span className="text-xs text-muted-foreground mt-1">El dinero que no gastaste se suma al presupuesto del mes siguiente.</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:bg-white/5 transition-colors">
                                    <RadioGroupItem value="accumulate_debt" id="r3" />
                                    <Label htmlFor="r3" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><Minus className="h-4 w-4 text-rose-500" /> Acumular Deuda</span>
                                        <span className="text-xs text-muted-foreground mt-1">Si gastaste de más, se te restará del presupuesto base del nuevo mes.</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Briefcase className="mr-2 h-4 w-4" />
                            <span>Ingreso previsto</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>💼 Ingreso previsto</DialogTitle>
                            <DialogDescription>
                                Establece tu sueldo o ingreso recurrente principal.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <select
                                    value={baseFreq}
                                    onChange={(e) => setBaseFreq(e.target.value as any)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="mensual">Mensual</option>
                                    <option value="quincenal">Quincenal (2x mes)</option>
                                    <option value="semanal">Semanal (4.33x mes)</option>
                                </select>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    value={baseAmount}
                                    onChange={(e) => setBaseAmount(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    setBaseIncome({ freq: baseFreq as any, amount: Number(baseAmount) });
                                }}
                                className="w-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
                            >
                                Guardar Ingreso previsto
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <DropdownMenuSeparator />

                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <div className="flex items-center">
                                <span className="mr-2 text-base">🏷️</span>
                                <span>Categorías</span>
                            </div>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Gestión de Categorías</DialogTitle>
                            <DialogDescription>
                                Personaliza tus categorías de gastos e ingresos. Elige iconos que te ayuden a identificar tus movimientos rápidamente.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-6 py-4">
                            <ExpenseCategoryManager />
                            <IncomeCategoryManager />
                        </div>
                    </DialogContent>
                </Dialog>

                <DropdownMenuSeparator />
                 {(
                    <>
                        <OpfsBackupDialog />
                        <DropdownMenuSeparator />
                    </>
                 )}
                
                <HelpDialog />
                <DropdownMenuSeparator />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-[hsl(var(--bad)_/_0.9)] focus:bg-[hsl(var(--bad)_/_0.15)] focus:text-[hsl(var(--bad)_/_1)]">
                            <span>Limpiar datos</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Borrar todos los datos?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se borrarán todos sus ingresos, gastos, metas, presupuestos y logros.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearData} className='bg-destructive text-destructive-foreground'>Borrar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
    <AchievementToastLayer />
    </>
  );
}
