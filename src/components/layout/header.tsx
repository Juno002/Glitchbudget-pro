
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useEffect, useState } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Moon, Sun, Settings, RefreshCw, Plus, Minus, Loader } from 'lucide-react';
import OpfsBackupDialog from '@/components/backup/opfs-backup-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { db } from '@/lib/db';
import { hasOPFS } from '@/lib/opfs';

export default function Header() {
  const { 
    theme, setTheme, 
    strictMode, setStrictMode, 
    currentMonth, setCurrentMonth, 
    rolloverStrategy, setRolloverStrategy,
    resetSettings, isWorking
  } = useFinances();
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
                <Badge className="text-white" style={{ background: 'var(--gradient-primary)', borderColor: 'transparent' }}>
                    💰 GlitchBudget Pro
                </Badge>
            </Link>
        </div>
        <div className="flex items-center gap-2">
            <label htmlFor="month" className="text-sm text-muted-foreground hidden sm:inline">Período</label>
            <Input id="month" type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="w-auto" />
            <Button variant="outline" onClick={() => setCurrentMonth(new Date().toISOString().slice(0, 7))}>Este mes</Button>
            
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  { isWorking ? <Loader className="animate-spin" /> : <Settings className="h-4 w-4" /> }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleThemeToggle}>
                  {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>Cambiar tema</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const newStrictMode = !strictMode;
                  setStrictMode(newStrictMode);
                  toast({ title: `Modo estricto ${newStrictMode ? 'activado' : 'desactivado'}` });
                }}>
                   <input type="checkbox" readOnly checked={strictMode} className="mr-2" />
                  <span>Modo estricto</span>
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span>Cierre de Mes</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                      <DropdownMenuLabel>Estrategia de Rollover</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={rolloverStrategy} onValueChange={(value) => setRolloverStrategy(value as any)}>
                        <DropdownMenuRadioItem value="reset">
                          <RefreshCw className="mr-2 h-4 w-4" /> Resetear
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="accumulate_surplus">
                          <Plus className="mr-2 h-4 w-4" /> Acumular Sobrante
                        </DropdownMenuRadioItem>
                         <DropdownMenuRadioItem value="accumulate_debt">
                           <Minus className="mr-2 h-4 w-4" /> Acumular Deuda
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                 {opfsAvailable && (
                    <>
                        <OpfsBackupDialog />
                        <DropdownMenuSeparator />
                    </>
                 )}
                
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
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
