import {
  QUICK_ADD_TEMPLATES_KEY,
  loadQuickAddTemplates,
} from './quick-add-templates';
import {
  SAVED_TRANSACTION_FILTERS_KEY,
  loadSavedTransactionFilters,
} from './saved-transaction-filters';
import {
  TRANSACTION_RULES_KEY,
  loadTransactionRules,
} from './transaction-rules';

type LocalAutomationStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const LOCAL_AUTOMATION_LAYERS = [
  {
    id: 'templates',
    title: 'Templates',
    location: 'Quick Add',
    description: 'Reutilizan datos de un movimiento frecuente sin crear movimientos por sí solas.',
  },
  {
    id: 'saved_filters',
    title: 'Saved filters',
    location: 'Movimientos',
    description: 'Recuperan vistas de búsqueda y filtros; nunca clasifican ni modifican movimientos.',
  },
  {
    id: 'rules',
    title: 'Rules',
    location: 'Ajustes → Automatización',
    description: 'Sugieren categoría o necesidad a partir de la descripción y requieren aceptación explícita.',
  },
] as const;

export type LocalAutomationSummary = {
  templates: number;
  savedFilters: number;
  rules: number;
};

export function loadLocalAutomationSummary(storage: LocalAutomationStorage): LocalAutomationSummary {
  return {
    templates: loadQuickAddTemplates(storage).length,
    savedFilters: loadSavedTransactionFilters(storage).length,
    rules: loadTransactionRules(storage).length,
  };
}

export function clearLocalAutomation(storage: LocalAutomationStorage): void {
  storage.removeItem(QUICK_ADD_TEMPLATES_KEY);
  storage.removeItem(SAVED_TRANSACTION_FILTERS_KEY);
  storage.removeItem(TRANSACTION_RULES_KEY);
}
