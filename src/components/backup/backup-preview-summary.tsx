'use client';

import type { BackupImportPreview } from '@/lib/backup-json';

const ITEMS: Array<{ key: keyof Pick<BackupImportPreview, 'accounts' | 'transactions' | 'budgets' | 'goals' | 'cards' | 'investments'>; singular: string; plural: string }> = [
  { key:'accounts', singular:'cuenta', plural:'cuentas' },
  { key:'transactions', singular:'movimiento', plural:'movimientos' },
  { key:'budgets', singular:'presupuesto', plural:'presupuestos' },
  { key:'goals', singular:'meta', plural:'metas' },
  { key:'cards', singular:'tarjeta', plural:'tarjetas' },
  { key:'investments', singular:'inversión', plural:'inversiones' },
];

export function BackupPreviewSummary({ preview }: { preview: BackupImportPreview }) {
  return (
    <div className="rounded-[var(--radius-card)] border bg-muted/20 p-3 shadow-[var(--shadow-control)]" aria-label="Resumen del backup" data-backup-preview="prisma">
      <p className="text-sm font-medium">Este archivo contiene</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ITEMS.map(item => {
          const value = preview[item.key];
          return (
            <div key={item.key} className="rounded-[var(--radius-interactive)] border bg-background px-3 py-2">
              <p className="text-lg font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{value === 1 ? item.singular : item.plural}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Backup JSON v{preview.formatVersion}
        {preview.schemaVersion ? ' · schema ' + preview.schemaVersion : ''}
        {preview.appVersion ? ' · app ' + preview.appVersion : ''}
      </p>
    </div>
  );
}