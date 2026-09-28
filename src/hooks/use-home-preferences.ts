'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HomeModuleId } from '@/domain/home';
import {
  DEFAULT_HOME_PREFERENCES,
  HOME_PREFERENCES_KEY,
  moveHomeModule,
  normalizeHomePreferences,
  type HomePreferences,
} from '@/lib/home-preferences';

export function useHomePreferences() {
  const [preferences,setPreferencesState]=useState<HomePreferences>(DEFAULT_HOME_PREFERENCES);
  const [ready,setReady]=useState(false);

  const persist=useCallback((next:HomePreferences)=>{
    const normalized=normalizeHomePreferences(next);
    setPreferencesState(normalized);
    try { localStorage.setItem(HOME_PREFERENCES_KEY,JSON.stringify(normalized)); } catch {}
  },[]);

  useEffect(()=>{
    let next=DEFAULT_HOME_PREFERENCES;
    try {
      const raw=localStorage.getItem(HOME_PREFERENCES_KEY);
      if(raw) next=normalizeHomePreferences(JSON.parse(raw));
    } catch {}
    setPreferencesState(next);
    setReady(true);

    const onStorage=(event:StorageEvent)=>{
      if(event.key!==HOME_PREFERENCES_KEY) return;
      try { setPreferencesState(normalizeHomePreferences(event.newValue ? JSON.parse(event.newValue) : DEFAULT_HOME_PREFERENCES)); }
      catch { setPreferencesState(DEFAULT_HOME_PREFERENCES); }
    };
    window.addEventListener('storage',onStorage);
    return ()=>window.removeEventListener('storage',onStorage);
  },[]);

  const visibleOrder=useMemo(()=>preferences.order.filter(id=>!preferences.hidden.includes(id)),[preferences]);

  const setHidden=useCallback((id:HomeModuleId,hidden:boolean)=>{
    const current=preferences.hidden.includes(id);
    if(current===hidden) return;
    const nextHidden=hidden ? [...preferences.hidden,id] : preferences.hidden.filter(value=>value!==id);
    if(nextHidden.length===preferences.order.length) return;
    persist({...preferences,hidden:nextHidden});
  },[preferences,persist]);

  const move=useCallback((id:HomeModuleId,direction:-1|1)=>persist(moveHomeModule(preferences,id,direction)),[preferences,persist]);
  const setDefaultSection=useCallback((id:HomeModuleId)=>{
    if(preferences.hidden.includes(id)) return;
    persist({...preferences,defaultSection:id});
  },[preferences,persist]);
  const reset=useCallback(()=>persist(DEFAULT_HOME_PREFERENCES),[persist]);

  return {preferences,visibleOrder,ready,setHidden,move,setDefaultSection,reset};
}
