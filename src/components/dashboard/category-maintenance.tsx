'use client';
import { useState } from 'react';
import { useCategoriesData } from '@/hooks/use-finance-queries';
import { appliesTo, type CategoryDirection } from '@/domain/categories';
import { updateCategory } from '@/lib/category-service';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import IconPicker from './icon-picker';
export default function CategoryMaintenance({direction}:{direction:CategoryDirection}) {
 const rows=useCategoriesData();const [id,setId]=useState('');const [name,setName]=useState('');const [icon,setIcon]=useState('landmark');const [busy,setBusy]=useState(false);const {toast}=useToast();
 const row=rows?.find(c=>c.id===id);
 async function save(archive?:boolean){if(busy||!row)return;setBusy(true);try{await updateCategory(id,archive===undefined?{name,iconName:icon}:{archived:archive});toast({title:archive===undefined?'Categoría actualizada':archive?'Categoría archivada':'Categoría reactivada'});}catch(error){toast({title:'No se guardó el cambio',description:friendlyError(error),variant:'destructive'});}finally{setBusy(false);}}
 return <div className="mt-4 space-y-3 border-t pt-4"><label className="block text-sm">Editar categoría<select disabled={busy} className="mt-1 w-full rounded-lg border bg-background p-2" value={id} onChange={e=>{setId(e.target.value);const c=rows?.find(c=>c.id===e.target.value);setName(c?.name || '');setIcon(c?.iconName || 'landmark');}}><option value="">Selecciona una categoría</option>{rows?.filter(c=>appliesTo(c,direction)).map(c=><option key={c.id} value={c.id}>{c.name}{c.archived?' (archivada)':''}</option>)}</select></label>{row && <fieldset disabled={busy} className="space-y-2"><div className="flex gap-2"><IconPicker value={icon} onChange={setIcon}/><Input aria-label="Nombre de categoría" maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></div><div className="flex flex-wrap gap-2"><Button onClick={()=>void save()}>Guardar cambios</Button><Button variant="outline" onClick={()=>void save(!row.archived)}>{row.archived?'Reactivar':'Archivar'}</Button></div><p className="text-xs text-muted-foreground">El historial conserva esta categoría aunque cambies su nombre o la archives.{row.type==='both'?' Se utiliza en ingresos y gastos.':''}</p></fieldset>}</div>;
}
