import type { HomeModuleId } from '../domain/home';

export const HOME_PREFERENCES_KEY='glitchbudget_home_preferences_v1';

export const HOME_MODULES: Array<{id:HomeModuleId;label:string}> = [
  {id:'position',label:'Posición'},
  {id:'budget',label:'Presupuesto'},
  {id:'upcoming',label:'Próximos'},
  {id:'goals',label:'Metas'},
  {id:'investments',label:'Inversiones'},
];

export type HomePreferences = {
  order: HomeModuleId[];
  hidden: HomeModuleId[];
  defaultSection: HomeModuleId;
};

export const DEFAULT_HOME_PREFERENCES: HomePreferences = {
  order:HOME_MODULES.map(row=>row.id),
  hidden:[],
  defaultSection:'position',
};

const ids=new Set<HomeModuleId>(HOME_MODULES.map(row=>row.id));

export function normalizeHomePreferences(value: unknown): HomePreferences {
  const input=(value && typeof value==='object' ? value : {}) as Partial<HomePreferences>;
  const seen=new Set<HomeModuleId>();
  const order=(Array.isArray(input.order)?input.order:[])
    .filter((id): id is HomeModuleId=>ids.has(id as HomeModuleId))
    .filter(id=>!seen.has(id) && Boolean(seen.add(id)));
  for(const row of HOME_MODULES) if(!seen.has(row.id)) order.push(row.id);

  const hidden=Array.from(new Set((Array.isArray(input.hidden)?input.hidden:[])
    .filter((id): id is HomeModuleId=>ids.has(id as HomeModuleId))));
  if(hidden.length===HOME_MODULES.length) hidden.splice(hidden.indexOf('position'),1);

  const visible=order.filter(id=>!hidden.includes(id));
  const defaultSection=visible.includes(input.defaultSection as HomeModuleId)
    ? input.defaultSection as HomeModuleId
    : visible[0] || 'position';

  return {order,hidden,defaultSection};
}

export function moveHomeModule(preferences:HomePreferences,id:HomeModuleId,direction:-1|1):HomePreferences {
  if(preferences.hidden.includes(id)) return preferences;
  const visible=preferences.order.filter(value=>!preferences.hidden.includes(value));
  const visibleIndex=visible.indexOf(id);
  const targetVisibleIndex=visibleIndex+direction;
  if(visibleIndex<0 || targetVisibleIndex<0 || targetVisibleIndex>=visible.length) return preferences;

  const targetId=visible[targetVisibleIndex];
  const order=[...preferences.order];
  const index=order.indexOf(id);
  const targetIndex=order.indexOf(targetId);
  [order[index],order[targetIndex]]=[order[targetIndex],order[index]];
  return {...preferences,order};
}
