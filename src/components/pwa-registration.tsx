'use client';
import { useEffect } from 'react';

export function PWARegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .catch(error => console.warn('No se pudo preparar el modo sin conexión.', error));
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
