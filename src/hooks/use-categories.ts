'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { db } from '@/lib/db';
import { resolveCategory } from '@/lib/categories';
export function useCategoryResolver(){
 const rows=useLiveQuery(()=>db.categories.toArray());
 return useCallback((id:string|undefined)=>resolveCategory(rows || [],id),[rows]);
}
