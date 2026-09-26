import { z } from 'zod';
import { db } from './db';
import type { Category, Plan } from '../domain/models';
import { reconstructCategories, appliesTo, categoryNameKey, categorySeeds, type CategoryDirection } from '../domain/categories';
export const categorySchema=z.object({id:z.string().min(1),name:z.string().refine(value=>value.trim().length>0),type:z.enum(['expense','income','both']),iconName:z.string().min(1),archived:z.boolean(),expenseOrder:z.number().int().nonnegative().optional(),incomeOrder:z.number().int().nonnegative().optional()});
export function validateCategorySet(rows: Category[]) {
 const ids=new Set<string>();
 for(const row of rows){categorySchema.parse(row);if(ids.has(row.id))throw new Error('ID de categoría duplicado.');ids.add(row.id);}
 for(let i=0;i<rows.length;i++) for(let j=0;j<i;j++) if(!rows[i].archived && !rows[j].archived && categoryNameKey(rows[i].name)===categoryNameKey(rows[j].name) && (rows[i].type==='both'||rows[j].type==='both'||rows[i].type===rows[j].type)) throw new Error('Ya existe una categoría activa con ese nombre.');
}
export async function requireCategory(id:string,direction:CategoryDirection,previousId?:string){
 const category=await db.categories.get(id);
 if(!category)throw new Error('La categoría no existe.');
 if(!appliesTo(category,direction))throw new Error('La categoría no corresponde a este tipo de movimiento.');
 if(category.archived && id!==previousId)throw new Error('La categoría está archivada. Selecciona una activa.');
 return category;
}
export async function createCategory(name:string,type:Category['type'],iconName='landmark'){
 return db.transaction('rw',db.categories,async()=>{
 const rows=await db.categories.toArray();
 const next=(key:'expenseOrder'|'incomeOrder')=>Math.max(-1,...rows.map(c=>c[key]??-1))+1;
 const category=categorySchema.parse({id:crypto.randomUUID(),name:name.trim().replace(/\s+/g,' '),type,iconName,archived:false,expenseOrder:type!=='income'?next('expenseOrder'):undefined,incomeOrder:type!=='expense'?next('incomeOrder'):undefined});
 validateCategorySet([...rows,category]);await db.categories.add(category);return category;
 });
}
export async function updateCategory(id:string,patch:Partial<Omit<Category,'id'>>){
 return db.transaction('rw',db.categories,async()=>{
 const existing=await db.categories.get(id);if(!existing)throw new Error('Categoría no encontrada.');
 const row=categorySchema.parse({...existing,...patch,...(patch.name!==undefined?{name:patch.name.trim().replace(/\s+/g,' ')}:{}),id});
 if(row.type!==existing.type && row.type!=='both')throw new Error('No se puede retirar un ámbito de una categoría.');
 validateCategorySet([...(await db.categories.toArray()).filter(c=>c.id!==id),row]);await db.categories.put(row);return row;
 });
}
export const archiveCategory=(id:string)=>updateCategory(id,{archived:true});
export const reactivateCategory=(id:string)=>updateCategory(id,{archived:false});
export async function resetCategories(direction:CategoryDirection){
 return db.transaction('rw',db.categories,async()=>{
 const rows=await db.categories.toArray();
 // A both-category is never removed from the opposite selector by resetting one scope.
 const next=rows.map(c=>({...c,archived:c.type===direction?true:c.archived}));
 categorySeeds.filter(c=>appliesTo(c,direction)).forEach((seed,index)=>{
 const old=next.find(c=>c.id===seed.id);const row={...seed,...old,type:old&&!appliesTo(old,direction)?'both' as const:(old?.type??seed.type),archived:false,[direction==='expense'?'expenseOrder':'incomeOrder']:index};
 if(old)Object.assign(old,row);else next.push(row);
 });validateCategorySet(next);await db.categories.bulkPut(next);
 });
}
export async function savePlans(rows:Plan[]){return db.transaction('rw',db.categories,db.plans,async()=>{
 for(const row of rows){const old=await db.plans.get([row.month,row.categoryId]);await requireCategory(row.categoryId,'expense',old?.categoryId);}await db.plans.bulkPut(rows);
 });}

/** CSV lacks category definitions. Preserve unknown historical IDs as archived placeholders. */
export async function preserveImportedCategories(rows:{categoryId:string}[],direction:CategoryDirection){
 const candidates=reconstructCategories({settings:{expenseCategories:[],incomeCategories:[]},[direction==='expense'?'expenses':'incomes']:rows});
 for(const id of new Set(rows.map(r=>r.categoryId))){const old=await db.categories.get(id);if(old){if(!appliesTo(old,direction))throw new Error('Categoría incompatible en el CSV: '+id);}else await db.categories.add(candidates.find(c=>c.id===id)!);}
}
