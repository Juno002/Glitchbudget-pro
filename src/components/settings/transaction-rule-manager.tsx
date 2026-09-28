'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFinances } from '@/contexts/finance-context';
import { useCategoryResolver } from '@/hooks/use-categories';
import { NECESSITY_LABELS } from '@/domain/transaction-metadata';
import type { TransactionNecessity } from '@/domain/models';
import type { TransactionRule } from '@/domain/rules';
import {
  loadTransactionRules,
  moveTransactionRule,
  removeTransactionRule,
  setTransactionRuleEnabled,
  upsertTransactionRule,
} from '@/lib/transaction-rules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type NecessityDraft = '' | TransactionNecessity;

const emptyDraft = {
  name: '',
  match: '',
  categoryId: '',
  necessity: '' as NecessityDraft,
};

export default function TransactionRuleManager() {
  const { expenseCategories, incomeCategories } = useFinances();
  const getCategoryInfo = useCategoryResolver();
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState(emptyDraft.name);
  const [match, setMatch] = useState(emptyDraft.match);
  const [categoryId, setCategoryId] = useState(emptyDraft.categoryId);
  const [necessity, setNecessity] = useState<NecessityDraft>(emptyDraft.necessity);

  useEffect(() => {
    if (typeof window !== 'undefined') setRules(loadTransactionRules(window.localStorage));
  }, []);

  const categoryOptions = useMemo(() => {
    const ids = [...new Set([...(expenseCategories || []), ...(incomeCategories || [])])];
    return ids.map(id => {
      const info = getCategoryInfo(id);
      const inExpense = expenseCategories?.includes(id);
      const inIncome = incomeCategories?.includes(id);
      const scope = inExpense && inIncome ? 'Gasto e ingreso' : inExpense ? 'Gasto' : 'Ingreso';
      return { id, name: info?.name || id, scope };
    });
  }, [expenseCategories, incomeCategories, getCategoryInfo]);

  const resetDraft = () => {
    setEditingId(null);
    setName('');
    setMatch('');
    setCategoryId('');
    setNecessity('');
  };

  const editRule = (rule: TransactionRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setMatch(rule.condition.value);
    setCategoryId(rule.suggestion.categoryId || '');
    setNecessity(rule.suggestion.necessity || '');
  };

  const saveRule = () => {
    if (typeof window === 'undefined') return;
    const existing = editingId ? rules.find(rule => rule.id === editingId) : undefined;
    const rule: TransactionRule = {
      id: existing?.id || crypto.randomUUID(),
      name,
      enabled: existing?.enabled ?? true,
      condition: {
        field: 'description',
        operator: 'contains',
        value: match,
      },
      suggestion: {
        categoryId: categoryId || undefined,
        necessity: necessity || undefined,
      },
    };

    try {
      setRules(upsertTransactionRule(window.localStorage, rule));
      resetDraft();
    } catch {
      // The form validation below keeps this path exceptional; storage helpers still reject malformed data.
    }
  };

  const updateEnabled = (id: string, enabled: boolean) => {
    if (typeof window === 'undefined') return;
    setRules(setTransactionRuleEnabled(window.localStorage, id, enabled));
  };

  const moveRule = (id: string, direction: 'up' | 'down') => {
    if (typeof window === 'undefined') return;
    setRules(moveTransactionRule(window.localStorage, id, direction));
  };

  const deleteRule = (id: string) => {
    if (typeof window === 'undefined') return;
    setRules(removeTransactionRule(window.localStorage, id));
    if (editingId === id) resetDraft();
  };

  const canSave = name.trim().length > 0
    && match.trim().length > 0
    && Boolean(categoryId || necessity);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4 space-y-4">
        <div>
          <h3 className="font-semibold">{editingId ? 'Editar regla' : 'Crear regla'}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Las reglas solo sugieren clasificación cuando el concepto contiene el texto indicado. Nada se aplica automáticamente.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Nombre</span>
            <Input
              aria-label="Nombre de la regla"
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={80}
              placeholder="Spotify"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Descripción contiene</span>
            <Input
              aria-label="Texto que debe contener la descripción"
              value={match}
              onChange={event => setMatch(event.target.value)}
              maxLength={120}
              placeholder="Spotify"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Sugerir categoría</span>
            <select
              aria-label="Categoría sugerida"
              value={categoryId}
              onChange={event => setCategoryId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sin categoría</option>
              {categoryOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.scope}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Sugerir necesidad</span>
            <select
              aria-label="Necesidad sugerida"
              value={necessity}
              onChange={event => setNecessity(event.target.value as NecessityDraft)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sin necesidad</option>
              {(['must', 'need', 'want'] as const).map(value => (
                <option key={value} value={value}>{NECESSITY_LABELS[value]}</option>
              ))}
            </select>
            <span className="block text-xs text-muted-foreground">La necesidad solo puede aplicarse a gastos.</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveRule} disabled={!canSave}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {editingId ? 'Guardar cambios' : 'Crear regla'}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetDraft}>Cancelar edición</Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">Reglas locales</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            El orden se conserva y también es el orden en que Quick Add presenta coincidencias.
          </p>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Aún no hay reglas. Crea una para recibir sugerencias locales en Quick Add.
          </div>
        ) : rules.map((rule, index) => {
          const category = rule.suggestion.categoryId
            ? getCategoryInfo(rule.suggestion.categoryId)?.name || rule.suggestion.categoryId
            : null;
          const necessityLabel = rule.suggestion.necessity
            ? NECESSITY_LABELS[rule.suggestion.necessity]
            : null;
          const outputs = [category, necessityLabel].filter(Boolean).join(' · ');

          return (
            <div key={rule.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {rule.enabled ? 'Activa' : 'Desactivada'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Si descripción contiene “{rule.condition.value}” → {outputs}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={event => updateEnabled(rule.id, event.target.checked)}
                    aria-label={rule.enabled ? `Desactivar ${rule.name}` : `Activar ${rule.name}`}
                  />
                  Activa
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => moveRule(rule.id, 'up')}
                  aria-label={`Subir ${rule.name}`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === rules.length - 1}
                  onClick={() => moveRule(rule.id, 'down')}
                  aria-label={`Bajar ${rule.name}`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => editRule(rule)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Eliminar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
