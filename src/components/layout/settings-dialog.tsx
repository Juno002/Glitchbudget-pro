'use client';

import { useCallback, useEffect, useState } from 'react';
import { Settings, Loader, Moon, Sun, Briefcase, RefreshCw, Plus, Minus, Monitor, X } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import OpfsBackupDialog from '@/components/backup/opfs-backup-dialog';
import ExpenseCategoryManager from '@/components/dashboard/expense-category-manager';
import IncomeCategoryManager from '@/components/dashboard/income-category-manager';
import { HelpDialog } from './help-dialog';
import { clearPersistedFinanceData } from '@/lib/data-reset-service';
import { useToast } from '@/hooks/use-toast';
import { ContextHelp, SectionHeader } from '@/components/finance-ui';
import { useBalanceVisibility } from '@/contexts/balance-visibility-context';
import { HOME_PREFERENCES_KEY } from '@/lib/home-preferences';
import {
  LOCAL_AUTOMATION_LAYERS,
  clearLocalAutomation,
  loadLocalAutomationSummary,
  type LocalAutomationSummary,
} from '@/lib/local-automation';
import TransactionRuleManager from '@/components/settings/transaction-rule-manager';
import AppLockSettings from '@/components/settings/app-lock-settings';
import AutoLockSettings from '@/components/settings/auto-lock-settings';
import PersistentStorageSettings from '@/components/settings/persistent-storage-settings';
import { APP_LOCK_STORAGE_KEY, AUTO_LOCK_STORAGE_KEY } from '@/domain/local-security';

const SETTINGS_SECTIONS = [
  ['general', 'General'],
  ['finance', 'Finanzas'],
  ['categories', 'Categorías'],
  ['automation', 'Automatización'],
  ['privacy', 'Privacidad y seguridad'],
  ['data', 'Datos y copias'],
  ['appearance', 'Apariencia'],
  ['about', 'Acerca de'],
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number][0];

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
  const [automationSummary, setAutomationSummary] = useState<LocalAutomationSummary>({ templates:0, savedFilters:0, rules:0 });
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  useEffect(() => setBaseCurrencyDraft(currency), [currency]);

  const refreshAutomationSummary = useCallback(() => {
    if (typeof window !== 'undefined') setAutomationSummary(loadLocalAutomationSummary(window.localStorage));
  }, []);

  const handleRuleCountChange = useCallback((count:number) => {
    setAutomationSummary(previous => ({ ...previous, rules:count }));
  }, []);

  const handleClearData = async () => {
    try {
      await clearPersistedFinanceData();
      localStorage.removeItem('glitchbudget_achievements');
      localStorage.removeItem('glitchbudget_contribution_streak');
      clearLocalAutomation(localStorage);
      localStorage.removeItem(HOME_PREFERENCES_KEY);
      localStorage.removeItem(APP_LOCK_STORAGE_KEY);
      localStorage.removeItem(AUTO_LOCK_STORAGE_KEY);
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
      <DialogContent className="overflow-x-hidden sm:max-w-4xl [&>[data-dialog-close=true]]:hidden" data-settings-prisma="true">
        <Tabs
          value={activeSection}
          className="min-w-0"
          onValueChange={value => {
            const section=value as SettingsSection;
            setActiveSection(section);
            if (section === 'automation') refreshAutomationSummary();
          }}
        >
          <div className="sticky top-0 z-20 -mx-[var(--space-card)] -mt-[var(--space-card)] mb-5 border-b border-[var(--border-subtle)] bg-[hsl(var(--surface-modal))] px-[var(--space-card)] pb-3 pt-[var(--space-card)]">
            <DialogHeader className="pr-12">
              <DialogTitle className="font-display text-2xl font-normal">Ajustes</DialogTitle>
              <DialogDescription className="sr-only">Configura preferencias, seguridad y datos de Prisma.</DialogDescription>
            </DialogHeader>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Cerrar ajustes" className="absolute right-2 top-2">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DialogClose>

            <div className="mt-3 lg:hidden">
              <NativeSelect
                aria-label="Sección de ajustes"
                value={activeSection}
                onChange={event => {
                  const section=event.target.value as SettingsSection;
                  setActiveSection(section);
                  if (section === 'automation') refreshAutomationSummary();
                }}
                data-settings-mobile-navigation="prisma"
              >
                {SETTINGS_SECTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </div>

            <TabsList className="mt-3 hidden h-auto w-full justify-between gap-0.5 rounded-[var(--radius-card)] border bg-card p-1.5 shadow-[var(--shadow-control)] lg:flex" data-settings-navigation="prisma">
              {SETTINGS_SECTIONS.map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="min-h-9 min-w-0 flex-1 rounded-[var(--radius-interactive)] px-2 text-xs">{label}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="general" className="min-w-0 space-y-5">
            <SectionHeader title="General" />
            <form className="max-w-sm rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] space-y-3" onSubmit={e => { e.preventDefault(); void setBaseCurrency(baseCurrencyDraft); }}>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium">Moneda base</p>
                <ContextHelp label="Acerca de la moneda base">Usa un código de tres letras. No hay conversión automática y solo puede cambiarse mientras no existan importes registrados.</ContextHelp>
              </div>
              <Input
                aria-label="Moneda base"
                value={baseCurrencyDraft}
                onChange={e => setBaseCurrencyDraft(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                minLength={3}
                maxLength={3}
                placeholder="DOP"
              />
              <Button type="submit" variant="outline" disabled={baseCurrencyDraft.length !== 3 || baseCurrencyDraft === currency}>Guardar moneda base</Button>
            </form>

            <label className="block max-w-sm space-y-2 text-sm">
              <span className="flex items-center gap-1 font-medium">Inicio del período <ContextHelp label="Cómo funciona el inicio del período">Por ejemplo, el día 25 crea períodos del 25 de un mes al 24 del siguiente.</ContextHelp></span>
              <NativeSelect
                aria-label="Día inicial del período"
                value={periodStartDay}
                onChange={e => void setPeriodStartDay(Number(e.target.value))}
                className="w-full"
              >
                {Array.from({ length:31 }, (_, index) => index + 1).map(day => (
                  <option key={day} value={day}>{day === 1 ? 'Día 1 · mes calendario' : `Día ${day}`}</option>
                ))}
              </NativeSelect>
            </label>
          </TabsContent>

          <TabsContent value="finance" className="min-w-0 space-y-6">
            <SectionHeader title="Finanzas" />

            <div className="rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] space-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <label className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={preventNegativeAccountBalance}
                    onChange={e => setPreventNegativeAccountBalance(e.target.checked)}
                  />
                  Proteger saldo de cuentas
                </label>
                <ContextHelp label="Acerca de proteger saldo de cuentas">Impide crear o empeorar saldos negativos en cuentas reales. No utiliza ingresos previstos ni presupuestos.</ContextHelp>
              </div>
            </div>

            <label className="block max-w-sm space-y-2 text-sm">
              <span className="font-medium">Al exceder un presupuesto</span>
              <NativeSelect
                aria-label="Al exceder un presupuesto"
                value={budgetOverspendingBehavior}
                onChange={e => setBudgetOverspendingBehavior(e.target.value as 'allow'|'warn'|'block')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="allow">Permitir</option>
                <option value="warn">Pedir confirmación</option>
                <option value="block">Bloquear</option>
              </NativeSelect>
            </label>

            <div className="space-y-3">
              <h3 className="font-semibold">Cierre de período</h3>
              <RadioGroup value={rolloverStrategy} onValueChange={value => setRolloverStrategy(value as typeof rolloverStrategy)} className="grid gap-3 md:grid-cols-3">
                <Label htmlFor="roll-reset" className="cursor-pointer rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="reset" id="roll-reset" /><RefreshCw className="h-4 w-4" /> Restablecer</div>
                  <p className="mt-2 text-xs text-muted-foreground">Empieza el siguiente período con los límites base.</p>
                </Label>
                <Label htmlFor="roll-surplus" className="cursor-pointer rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="accumulate_surplus" id="roll-surplus" /><Plus className="h-4 w-4" /> Acumular sobrante</div>
                  <p className="mt-2 text-xs text-muted-foreground">Suma lo no gastado al siguiente período.</p>
                </Label>
                <Label htmlFor="roll-debt" className="cursor-pointer rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="accumulate_debt" id="roll-debt" /><Minus className="h-4 w-4" /> Acumular exceso</div>
                  <p className="mt-2 text-xs text-muted-foreground">Resta el exceso del límite base siguiente.</p>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1"><h3 className="font-semibold">Ingreso previsto</h3><ContextHelp label="Acerca del ingreso previsto">Es una referencia de planificación y no se convierte en ingreso registrado.</ContextHelp></div>
              <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                <NativeSelect value={baseFreq} onChange={e => setBaseFreq(e.target.value as typeof baseFreq)} className="">
                  <option value="mensual">Mensual</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="semanal">Semanal</option>
                </NativeSelect>
                <Input type="number" min="0" step="0.01" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="0.00" />
              </div>
              <Button variant="outline" onClick={() => setBaseIncome({ freq:baseFreq as 'mensual'|'quincenal'|'semanal', amount:Number(baseAmount) })}>Guardar ingreso previsto</Button>
            </div>

            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center gap-1"><h3 className="font-semibold">Ahorro sugerido</h3><ContextHelp label="Acerca del ahorro sugerido">Es una referencia de planificación. Cambiarla no mueve dinero.</ContextHelp></div>
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

          <TabsContent value="categories" className="min-w-0 space-y-6">
            <SectionHeader title="Categorías" />
            <ExpenseCategoryManager />
            <IncomeCategoryManager />
          </TabsContent>

          <TabsContent value="automation" className="min-w-0 space-y-6">
            <SectionHeader title="Automatización" />

            <div className="grid gap-3 md:grid-cols-3" data-local-automation-order="templates-saved-filters-rules">
              {LOCAL_AUTOMATION_LAYERS.map(layer => {
                const count = layer.id === 'templates'
                  ? automationSummary.templates
                  : layer.id === 'saved_filters'
                    ? automationSummary.savedFilters
                    : automationSummary.rules;
                return (
                  <div key={layer.id} className="rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold">{layer.title}</h3>
                      <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <TransactionRuleManager onRuleCountChange={handleRuleCountChange} />
          </TabsContent>

          <TabsContent value="privacy" className="min-w-0 space-y-5">
            <SectionHeader title="Privacidad y seguridad" />
            <div className="rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] text-sm space-y-4">
              <label className="flex min-w-0 items-start justify-between gap-4">
                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-center gap-1 font-medium">Ocultar importes <ContextHelp label="Acerca de ocultar importes">Oculta cantidades monetarias en las superficies principales. No cifra los datos almacenados ni las copias.</ContextHelp></span>
                </span>
                <input
                  type="checkbox"
                  checked={balancesHidden}
                  onChange={event => setBalancesHidden(event.target.checked)}
                  aria-label="Ocultar importes"
                  className="mt-1 h-5 w-5 shrink-0"
                />
              </label>
              <div className="border-t pt-4">
                <AppLockSettings />
              </div>
              <AutoLockSettings />
            </div>
          </TabsContent>

          <TabsContent value="data" className="min-w-0 space-y-6">
            <SectionHeader title="Datos y copias" />
            <div className="max-w-md"><PersistentStorageSettings /></div>
            <div className="max-w-md"><OpfsBackupDialog /></div>
            <div className="rounded-[var(--radius-card)] border border-destructive/30 p-4 space-y-3">
              <h3 className="font-semibold text-destructive">Zona destructiva</h3>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive">Borrar todos los datos</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Borrar todos los datos?</AlertDialogTitle>
                    <AlertDialogDescription>Borrar todos los datos eliminará movimientos, planes, cuentas, metas y copias locales del sitio. Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleClearData}>Borrar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="min-w-0 space-y-5">
            <SectionHeader title="Apariencia" />
            <RadioGroup value={theme} onValueChange={value => setTheme(value as typeof theme)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Label htmlFor="theme-dark" className="cursor-pointer rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="dark" id="theme-dark" /><Moon className="h-4 w-4" /> Neón oscuro</div>
              </Label>
              <Label htmlFor="theme-light" className="cursor-pointer rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="light" id="theme-light" /><Sun className="h-4 w-4" /> Prisma claro</div>
              </Label>
              <Label htmlFor="theme-system" className="cursor-pointer rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="system" id="theme-system" /><Monitor className="h-4 w-4" /> Seguir sistema</div>
              </Label>
              <Label htmlFor="theme-serious" className="cursor-pointer rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex items-center gap-2 font-medium"><RadioGroupItem value="serious" id="theme-serious" /><Briefcase className="h-4 w-4" /> Minimalista legado</div>
              </Label>
            </RadioGroup>
          </TabsContent>

          <TabsContent value="about" className="min-w-0 space-y-5">
            <SectionHeader title="Acerca de" />
            <div className="max-w-sm"><HelpDialog /></div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}