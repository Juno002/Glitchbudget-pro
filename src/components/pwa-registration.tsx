'use client';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export function PWARegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    let notified = false;
    const cleanups: (() => void)[] = [];
    const announce = () => {
      if (cancelled || notified) return;
      notified = true;
      toast({ title: 'Actualización disponible', description: 'Guarda lo que estés editando y cierra todas las ventanas de GlitchBudget. La nueva versión se activará al volver a abrirla.', duration: 12000 });
    };
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
        if (cancelled) return;
        if (registration.waiting) announce();
        const watch = () => {
          const worker = registration.installing;
          if (!worker) return;
          const changed = () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(); };
          worker.addEventListener('statechange', changed);
          cleanups.push(() => worker.removeEventListener('statechange', changed));
        };
        registration.addEventListener('updatefound', watch);
        cleanups.push(() => registration.removeEventListener('updatefound', watch));
        watch();
        const onVisible = () => { if (document.visibilityState === 'visible') void registration.update().catch(() => {}); };
        document.addEventListener('visibilitychange', onVisible);
        cleanups.push(() => document.removeEventListener('visibilitychange', onVisible));
      } catch (error) {
        console.warn('No se pudo preparar el modo sin conexión.', error);
      }
    };
    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', register, { once: true });
    return () => { cancelled = true; window.removeEventListener('load', register); cleanups.forEach(cleanup => cleanup()); };
  }, []);
  return null;
}
