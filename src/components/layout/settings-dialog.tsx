'use client';

import { useEffect, useState } from 'react';
import { Settings, Loader, Moon, Sun, Briefcase, RefreshCw, Plus, Minus, Info } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import OpfsBackupDialog from '@/components/backup/opfs-backup-dialog';
import ExpenseCategoryManager from '@/components/dashboard/expense-category-manager';
import IncomeCategoryManager from '@/components/dashboard/income-category-manager';
import { HelpDialog } from './help-dialog';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { SectionHeader } from '@/components/finance-ui';
import { useBalanceVisibility } from '@/contexts/balance-visibility-context';
import { QUICK_ADD_TEMPLATES_KEY } from '@/lib/quick-add-templates';
import { HOME_PREFERENCES_KEY } from '@/lib/home-preferences';
import { SAVED_TRANSACTION_FILTERS_KEY } from '@/lib/saved-transaction-filters';
import { TRANSACTION_RULES_KEY } from '@/lib/transaction-rules';
import TransactionRuleManager from '@/components/settings/transaction-rule-manager';

const SETTINGS_SECTIONS = [
  ['general', 'General'],
  ['finance', 'Finanzas'],
  ['categories', 'Categorías'],
  ['automation', 'Automatización'],
  ['privacy', 'Privacidad y seguridad'],
  ['data', 'Datos y backups'],
  ['appearance', 'Apariencia'],
  ['about', 'Acerca de'],
] as const;

export function SettingsDialog() {
  const {
    theme, setTheme,
    currency, setBaseCurrency,
    preventNegativeAccountBalance, setPreventNegativeAccountBalance,
    budgetOverspendingBehavior, setBudgetOverspendingBehavior,
    periodStartDay, setPeriodStartDay,
    rolloverStrategy, setRolloverStrategy,
    baseIncome, setBaseIncome,
    savePct, updateSettings,
    resetSettings, isWorking,
  } = useFinances();
  const { toast } = useToast();
  const { balancesHidden, setBalancesHidden } = useBalanceVisibility();
  const [baseFreq, setBaseFreq] = useState(baseIncome?.freq || 'mensual');
  const [baseAmount, setBaseAmount] = useState(String((baseIncome?.amount || 0) / 100));
  const [baseCurrencyDraft, setBaseCurrencyDraft] = useState(currency);
  useEffect(() => setBaseCurrencyDraft(currency), [currency]);

  const handleClearData = async () => {
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) await table.clear();
      });
      localStorage.removeItem('glitchbudget_achievements');
      localStorage.removeItem('glitchbudget_contribution_streak');
      localStorage.removeItem(QUICK_ADD_TEMPLATES_KEY);
      localStorage.removeItem(HOME_PREFERENCES_KEY);
      localStorage.removeItem(SAVED_TRANSACTION_FILTERS_KEY);
      localStorage.removeItem(TRANSACTION_RULES_KEY);
      await resetSettings();
      toast({ title:'Datos eliminados', description:'Todos los datos han sido borrados. La página se recargará.' });
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast({ title:'No se pudieron borrar los datos', description:'Tus datos no fueron eliminados por completo.', variant:'destructive' });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Ajustes">
          {isWorking ? <Loader className="animate-spin" /> : <Settings className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustes</DialogTitle>
          <DialogDescription>Preferencias, categorías, privacidad y datos en un solo lugar.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-5">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
            {SETTINGS_SECTIONS.map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="text-xs sm:text-sm">{label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general" className="space-y-5">
            <SectionHeader title="General" description="Cómo se organiza tu período financiero." />
            <form className="max-w-sm rounded-xl border p-4 space-y-3" onSubmit={e => { e.preventDefault(); void setBaseCurrency(baseCurrencyDraft); }}>
              <div>
                <p className="text-sm font-medium">Moneda base</p>
                <p className="mt-1 text-xs text-muted-foreground">Código de tres letras. No hay tasas remotas ni conversión automática.</p>
              </div>
              <Input
                aria-label="Moneda base"
                value={baseCurrencyDraft}
                onChange={e => setBaseCurrencyDraft(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                minLength={3}
                maxLength={3}
                placeholder="DOP"
              />
              <p className="text-xs text-muted-foreground">Por seguridad solo puede cambiarse mientras no existan importes registrados. Las cuentas existentes sin movimientos adoptan la nueva moneda.</p>
              <Button type="submit" variant="outline" disabled={baseCurrencyDraft.length !== 3 || baseCurrencyDraft === currency}>Guardar moneda base</Button>
            </form>

            <label className="block max-w-sm space-y-2 text-sm">
              <span className="font-medium">Inicio del período</span>
              <select
                aria-label="Día inicial del período"
                value={periodStartDay}
                onChange={e => void setPeriodStartDay(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Array.from({ length:31 }, (_, index) => index + 1).map(day => (
                  <option key={day} value={day}>{day === 1 ? 'Día 1 · mes calendario' : `Día ${day}`}</option>
                ))}
              </select>
              <span className="block text-xs text-muted-foreground">Ej.: día 25 → 25 del mes anterior al 24 del mes seleccionado.</span>
            </label>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            <SectionHeader title="Finanzas" description="Protecciones y reglas de planificación. No cambian las fórmulas del ledger." />

            <div className="rounded-xl border p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={preventNegativeAccountBalance}
                  onChange={e => setPreventNegativeAccountBalance(e.target.checked)}
                />
                Proteger saldo de cuentas
              </label>
              <p className="text-xs text-muted-foreground">Impide crear o empeorar saldos negativos en cuentas reales. No utiliza ingresos previstos ni presupuestos.</p>
            </div>

            <label className="block max-w-sm space-y-2 text-sm">
              <span className="font-medium">Al exceder un presupuesto</span>
              <select
                aria-label="Al exceder un presupuesto"
                value={budgetOverspendingBehavior}
                onChange={e => setBudgetOverspendingBehavior(e.target.value as 'allow'|'warn'|'block')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="allow">Permitir</option>
                <option value="warn">Pedir confirmación</option>
                <option value="block">Bloquear</option>
              </select>
            </label>

            <div className="space-y-3">
              <h3 className="font-semibold">Cierre de período</h3>
              <RadioGroup value={rolloverStrategy} onValueChange={value => setRolloverStrategy(value as typeof rolloverStrategy)} className="grid gap-3 md:grid-cols-3">
                <Label htmlFor="roll-reset" className="cursor-pointer rounded-xl border p-4">
                  <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="reset" id="roll-reset" /><RefreshCw className="h-4 w-4" /> Resetear</div>
                  <p className="mt-2 text-xs text-muted-foreground">Empieza el siguiente período con los límites base.</p>
                </Label>
                <Label htmlFor="roll-surplus" className="cursor-pointer rounded-xl border p-4">
                  <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="accumulate_surplus" id="roll-surplus" /><Plus className="h-4 w-4" /> Acumular sobrante</div>
                  <p className="mt-2 text-xs text-muted-foreground">Suma lo no gastado al siguiente período.</p>
                </Label>
                <Label htmlFor="roll-debt" className="cursor-pointer rounded-xl border p-4">
                  <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="accumulate_debt" id="roll-debt" /><Minus className="h-4 w-4" /> Acumular exceso</div>
                  <p className="mt-2 text-xs text-muted-foreground">Resta el exceso del límite base siguiente.</p>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Ingreso previsto</h3>
              <p className="text-xs text-muted-foreground">Es una previsión de planificación; no se convierte en ingreso registrado.</p>
              <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                <select value={baseFreq} onChange={e => setBaseFreq(e.target.value as typeof baseFreq)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="mensual">Mensual</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="semanal">Semanal</option>
                </select>
                <Input type="number" min="0" step="0.01" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="0.00" />
              </div>
              <Button variant="outline" onClick={() => setBaseIncome({ freq:baseFreq as 'mensual'|'quincenal'|'semanal', amount:Number(baseAmount) })}>Guardar ingreso previsto</Button>
            </div>

            <div className="space-y-3 border-t pt-5">
              <h3 className="font-semibold">Ahorro sugerido</h3>
              <p className="text-xs text-muted-foreground">Referencia de planificación. Cambiarla no mueve dinero ni modifica el ledger.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['Ninguno 0%',0],
                  ['Conservador 5%',0.05],
                  ['Estándar 10%',0.10],
                  ['Agresivo 20%',0.20],
                ].map(([label,value]) => (
                  <Button
                    key={String(value)}
                    type="button"
                    size="sm"
                    variant={Math.abs(savePct-Number(value))<0.001?'default':'outline'}
                    onClick={()=>void updateSettings({savePct:Number(value)})}
                  >
                    {String(label)}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <SectionHeader title="Categorías" description="Renombra, archiva y organiza sin romper el historial." />
            <ExpenseCategoryManager />
            <IncomeCategoryManager />
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <SectionHeader
              title="Automatización"
              description="Reglas deterministas y locales para sugerir clasificación en Quick Add."
            />
            <TransactionRuleManager />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-5">
            <SectionHeader title="Privacidad y seguridad" description="GlitchBudget funciona localmente y no necesita enviar tus datos financieros fuera del dispositivo." />
            <div className="rounded-xl border p-4 text-sm space-y-4">
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block font-medium">Ocultar importes</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Oculta cantidades monetarias en las superficies principales. La preferencia se guarda solo en este navegador.</span>
                </span>
                <input
                  type="checkbox"
                  checked={balancesHidden}
                  onChange={event => setBalancesHidden(event.target.checked)}
                  aria-label="Ocultar importes"
                  className="mt-1 h-5 w-5"
                />
              </label>
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Bloqueo de aplicación</p>
                  <p className="mt-1 text-xs text-muted-foreground">Reservado para Fase 17 — Seguridad y privacidad UX.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Auto-lock</p>
                  <p className="mt-1 text-xs text-muted-foreground">Reservado para Fase 17; no se muestra un control falso antes de existir el comportamiento.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t pt-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Almacenamiento local</p>
                  <p className="mt-1 text-muted-foreground">Tus movimientos se guardan en este navegador. No hay cuenta, sincronización en la nube ni telemetría financiera.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <SectionHeader title="Datos y respaldos" description="Exporta antes de cambiar de navegador, dirección o dispositivo." />
            <div className="max-w-md"><OpfsBackupDialog /></div>
            <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
              <h3 className="font-semibold text-destructive">Zona destructiva</h3>
              <p className="text-sm text-muted-foreground">Borrar los datos elimina movimientos, planes, cuentas, metas y copias locales del sitio.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive">Borrar todos los datos</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Borrar todos los datos?</AlertDialogTitle>
                    <AlertDialogDescription>Borrar todos los datos eliminará movimientos, planes, cuentas, metas y copias locales del sitio. Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground">Borrar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-5">
            <SectionHeader title="Apariencia" description="Los temas cambian presentación, no jerarquía ni funcionalidad." />
            <RadioGroup value={theme} onValueChange={value => setTheme(value as typeof theme)} className="grid gap-3 md:grid-cols-3">
              <Label htmlFor="theme-dark" className="cursor-pointer rounded-xl border p-4">
                <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="dark" id="theme-dark" /><Moon className="h-4 w-4" /> Neón oscuro</div>
              </Label>
              <Label htmlFor="theme-light" className="cursor-pointer rounded-xl border p-4">
                <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="light" id="theme-light" /><Sun className="h-4 w-4" /> Claro</div>
              </Label>
              <Label htmlFor="theme-serious" className="cursor-pointer rounded-xl border p-4">
                <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="serious" id="theme-serious" /><Briefcase className="h-4 w-4" /> Minimalista</div>
              </Label>
            </RadioGroup>
          </TabsContent>

          <TabsContent value="about" className="space-y-5">
            <SectionHeader title="Acerca de" description="Ayuda, privacidad y comportamiento general de la aplicación." />
            <div className="max-w-sm"><HelpDialog /></div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
