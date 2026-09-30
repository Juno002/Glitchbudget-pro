'use client';

import { useEffect, useState } from 'react';
import { HardDrive, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  readStoragePersistenceState,
  requestPersistentStorage,
  type StoragePersistenceState,
} from '@/lib/storage-persistence';

type ViewState = StoragePersistenceState | 'checking' | 'requesting';

const copy: Record<Exclude<ViewState, 'checking' | 'requesting'>, {
  title: string;
  description: string;
}> = {
  persistent: {
    title: 'Almacenamiento persistente activo',
    description: 'El navegador confirmó que intentará conservar los datos locales incluso bajo presión de almacenamiento.',
  },
  'best-effort': {
    title: 'Almacenamiento en modo normal',
    description: 'Tus datos siguen siendo locales, pero el navegador podría desalojarlos bajo presión de almacenamiento.',
  },
  unsupported: {
    title: 'Persistencia no disponible',
    description: 'Este navegador no expone el control de persistencia. Mantén backups externos periódicos.',
  },
  error: {
    title: 'No se pudo comprobar la persistencia',
    description: 'Tus datos no se modificaron. Puedes volver a intentarlo o continuar usando backups externos.',
  },
};

export default function PersistentStorageSettings() {
  const [state, setState] = useState<ViewState>('checking');

  useEffect(() => {
    let active = true;
    void readStoragePersistenceState().then(next => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const request = async () => {
    setState('requesting');
    setState(await requestPersistentStorage());
  };

  const settled = state === 'checking' || state === 'requesting' ? null : state;
  const details = settled ? copy[settled] : null;
  const Icon = settled === 'persistent' ? ShieldCheck : settled === 'best-effort' ? ShieldAlert : HardDrive;

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border bg-card p-4 shadow-[var(--shadow-control)]" data-persistent-storage-settings="prisma" aria-label="Persistencia del almacenamiento local">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">Persistencia del navegador</p>
          {details ? (
            <>
              <p className="mt-1 text-sm">{details.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{details.description}</p>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {state === 'requesting' ? 'Solicitando protección al navegador…' : 'Comprobando protección del almacenamiento…'}
            </p>
          )}
        </div>
      </div>

      {(settled === 'best-effort' || settled === 'error') && (
        <Button type="button" variant="outline" size="sm" onClick={() => void request()}>
          Proteger almacenamiento local
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Esta protección depende del navegador y no sustituye un backup descargado fuera del sitio.
      </p>
    </section>
  );
}
