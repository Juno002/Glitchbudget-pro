
'use client';

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
import { hasOPFS } from '@/lib/opfs';

export default function Header() {
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
  const [opfsAvailable, setOpfsAvailable] = useState(false);

  useEffect(() => {
    hasOPFS().then(setOpfsAvailable);
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };
  
  const handleClearData = async () => {
    try {
        await db.transaction('rw', db.tables, async () => {
            for (const table of db.tables) {
                await table.clear();
            }
        });
        await resetSettings();
        toast({ title: "Datos eliminados", description: "Todos los datos han sido borrados. La página se recargará." });
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        console.error("Failed to clear data:", error);
        toast({ title: "Error al limpiar los datos", description: "No se pudieron borrar los datos. Revisa la consola.", variant: 'destructive'});
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-auto items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 py-2">
      <div className="flex w-full items-center gap-2 flex-wrap">
         <div className="flex items-center gap-2 mr-auto">
            <Link href="/" className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.1)] transition-all hover:bg-[rgba(0,255,136,0.12)]">
                    <span className="text-lg">💰</span>
                    <span className="font-syne font-bold tracking-wide">GlitchBudget Pro</span>
                </div>
            </Link>
        </div>
        <div className="flex items-center gap-2 pt-2 sm:pt-0 w-full sm:w-auto justify-between">
            <div className="flex items-center gap-2">
                <label htmlFor="month" className="text-sm text-muted-foreground hidden md:inline">Período</label>
                <Input id="month" type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="w-auto h-9" />
                <Button variant="outline" className="h-9" onClick={() => setCurrentMonth(new Date().toISOString().slice(0, 7))}>Este mes</Button>
            </div>
            
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  { isWorking ? <Loader className="animate-spin" /> : <Settings className="h-4 w-4" /> }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="relative flex cursor-default select-none items-center rounded-[6px] px-2 py-1.5 text-sm outline-none transition-colors hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)]">
                    <div className="flex flex-1 items-center cursor-pointer" onClick={() => {
                        const newStrictMode = !strictMode;
                        setStrictMode(newStrictMode);
                        toast({ title: `Modo estricto ${newStrictMode ? 'activado' : 'desactivado'}` });
                    }}>
                        <input type="checkbox" readOnly checked={strictMode} className="mr-2 cursor-pointer" />
                        <span>Modo estricto</span>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="ml-2 rounded-full p-1 text-slate-400 hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.9)] transition-colors focus:outline-none" onClick={(e) => e.stopPropagation()}>
                                <Info className="h-4 w-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" side="left">
                            <h4 className="font-semibold mb-2">Modo Estricto</h4>
                            <p className="text-xs text-muted-foreground">
                                Impide guardar montos fijos que superen tus ingresos totales mensuales, protegiéndote matemáticamente de crear presupuestos irreales.
                            </p>
                        </PopoverContent>
                    </Popover>
                </div>

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
                                <div className="flex items-center space-x-2 rounded-lg border border-[rgba(255,255,255,0.08)] p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                                    <RadioGroupItem value="reset" id="r1" />
                                    <Label htmlFor="r1" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><RefreshCw className="h-4 w-4 text-slate-400" /> Resetear a cero</span>
                                        <span className="text-xs text-muted-foreground mt-1">Descarta lo sobrante y empieza de nuevo con los límites base.</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-lg border border-[rgba(255,255,255,0.08)] p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                                    <RadioGroupItem value="accumulate_surplus" id="r2" />
                                    <Label htmlFor="r2" className="flex flex-col cursor-pointer">
                                        <span className="flex items-center gap-2 font-medium"><Plus className="h-4 w-4 text-emerald-500" /> Acumular Sobrante</span>
                                        <span className="text-xs text-muted-foreground mt-1">El dinero que no gastaste se suma al presupuesto del mes siguiente.</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-lg border border-[rgba(255,255,255,0.08)] p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
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
                            <span>Ingreso Principal</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>💼 Ingreso Principal</DialogTitle>
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
                                className="w-full bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)]"
                            >
                                Guardar Ingreso Principal
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <DropdownMenuSeparator />
                 {opfsAvailable && (
                    <>
                        <OpfsBackupDialog />
                        <DropdownMenuSeparator />
                    </>
                 )}
                
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-[rgba(255,45,120,0.9)] focus:bg-[rgba(255,45,120,0.15)] focus:text-[rgba(255,45,120,1)]">
                            <span>Limpiar datos</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Borrar todos los datos?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se borrarán todos sus ingresos, gastos, metas y presupuestos.
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
  );
}
