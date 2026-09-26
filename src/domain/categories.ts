import type { Category } from './models';
export type CategoryDirection = 'expense' | 'income';
const definitions = [
 ['vivienda','Vivienda','home','expense'],['transporte','Transporte','bus','expense'],['alimentacion','Alimentación','utensils','expense'],['servicios','Servicios','bolt','expense'],['salud','Salud','heart-pulse','expense'],['entretenimiento','Entretenimiento','gamepad','expense'],['ropa','Ropa','shirt','expense'],['educacion','Educación','graduation-cap','expense'],['regalos-gastos','Regalos','gift','expense'],['ahorro','Ahorro para Metas','coins','expense'],['sueldo','Sueldo','circle-dollar-sign','income'],['freelance','Freelance','briefcase','income'],['intereses','Intereses','piggy-bank','income'],['regalos-ingresos','Regalos','gift','income'],['otros','Otros','landmark','both'],
] as const;
export const categorySeeds: Category[] = definitions.map(([id,name,iconName,type])=>({id,name,iconName,type,archived:false}));
export const appliesTo = (category: Category, direction: CategoryDirection) => category.type === 'both' || category.type === direction;
export const categoryNameKey = (name: string) => name.trim().replace(/\s+/g,' ').normalize('NFKC').toLocaleLowerCase('es');
export const activeCategories = (rows: Category[], direction: CategoryDirection) => rows.filter(c=>!c.archived && appliesTo(c,direction)).sort((a,b)=>(a[direction === 'expense'?'expenseOrder':'incomeOrder'] ?? Number.MAX_SAFE_INTEGER)-(b[direction === 'expense'?'expenseOrder':'incomeOrder'] ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
export type LegacyCategoryData = {
 settings?: {expenseCategories?: string[]; incomeCategories?: string[]; customCategoryIcons?: Record<string,string>};
 incomes?: {categoryId:string}[]; expenses?: {categoryId:string}[]; plans?: {categoryId:string}[]; recurrents?: {categoryId:string;type:CategoryDirection}[];
};
export function reconstructCategories(data: LegacyCategoryData): Category[] {
 const expenseIds = data.settings?.expenseCategories ?? categorySeeds.filter(c=>appliesTo(c,'expense')).map(c=>c.id);
 const incomeIds = data.settings?.incomeCategories ?? categorySeeds.filter(c=>appliesTo(c,'income')).map(c=>c.id);
 const rows = new Map<string, Category>();
 const add = (id:string, direction:CategoryDirection, active=false, order?:number) => {
  if (!id || typeof id !== 'string') throw new Error('Referencia de categoría inválida.');
  let row=rows.get(id);
  if (!row) {const seed=categorySeeds.find(c=>c.id===id); row={id,name:seed?.name || id.charAt(0).toUpperCase()+id.slice(1).replace(/[-_]+/g,' '),type:id==='otros'?'both':direction,iconName:data.settings?.customCategoryIcons?.[id] || seed?.iconName || 'landmark',archived:true}; rows.set(id,row);}
  if (!appliesTo(row,direction)) row.type='both';
  if (active) row.archived=false;
  const key=direction==='expense'?'expenseOrder':'incomeOrder'; if(order!==undefined && row[key]===undefined) row[key]=order;
 };
 expenseIds.forEach((id,i)=>add(id,'expense',true,i)); incomeIds.forEach((id,i)=>add(id,'income',true,i));
 for(const row of data.incomes || []) add(row.categoryId,'income');
 for(const row of [...(data.expenses || []),...(data.plans || [])]) add(row.categoryId,'expense');
 for(const row of data.recurrents || []) add(row.categoryId,row.type);
 // Preserve removed built-ins as archived entities, never as live user state.
 for(const seed of categorySeeds) if(!rows.has(seed.id)) rows.set(seed.id,{...seed,archived:true,iconName:data.settings?.customCategoryIcons?.[seed.id] || seed.iconName});
 // Legacy names could collide: retain every ID and make selector labels distinguishable.
 const seen:Category[]=[];
 for(const row of rows.values()) {
  const originalName=row.name; let suffix=0;
  while(!row.archived && seen.some(c=>!c.archived && categoryNameKey(c.name)===categoryNameKey(row.name) && (c.type==='both'||row.type==='both'||c.type===row.type))) {
   row.name=originalName+' ('+row.id+(suffix ? ' '+suffix : '')+')'; suffix++;
  }
  seen.push(row);
 }
 return [...rows.values()];
}
export function withoutLegacyCategories<T extends object>(settings:T): T {
 const copy={...settings} as T & {expenseCategories?:unknown;incomeCategories?:unknown;customCategoryIcons?:unknown};
 delete copy.expenseCategories;delete copy.incomeCategories;delete copy.customCategoryIcons;return copy;
}
