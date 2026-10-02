export const PRIMARY_AREAS = ['summary', 'movements', 'planning', 'reports'] as const;
export type PrimaryArea = typeof PRIMARY_AREAS[number];

export const PLANNING_AREAS = ['budgets', 'goals', 'subscriptions'] as const;
export type PlanningArea = typeof PLANNING_AREAS[number];

export const MOVEMENT_SECTIONS = ['history', 'accounts', 'investments'] as const;
export type MovementSection = typeof MOVEMENT_SECTIONS[number];

export type NavigationLocation = {
  area: PrimaryArea;
  planningTab: PlanningArea;
  movementSection: MovementSection | null;
};

function includesValue<T extends readonly string[]>(values: T, value: string | null): value is T[number] {
  return value !== null && values.includes(value as T[number]);
}

export function parseNavigationSearch(search: string): NavigationLocation {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const tab = params.get('tab');
  const plan = params.get('plan');
  const section = params.get('section');

  const area: PrimaryArea = includesValue(PRIMARY_AREAS, tab) ? tab : 'summary';
  const planningTab: PlanningArea = includesValue(PLANNING_AREAS, plan) ? plan : 'budgets';
  const movementSection = area === 'movements' && includesValue(MOVEMENT_SECTIONS, section)
    ? section
    : null;

  return { area, planningTab, movementSection };
}

export function navigationSearch(location: NavigationLocation): string {
  const params = new URLSearchParams();

  if (location.area !== 'summary') params.set('tab', location.area);
  if (location.area === 'planning') params.set('plan', location.planningTab);
  if (location.area === 'movements' && location.movementSection) {
    params.set('section', location.movementSection);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}
