export const REQUIRED_BACKUP_COVERAGE_ROUTES = [
  'export',
  'import',
  'restore',
  'validation',
  'migration-tests',
] as const;

export type BackupCoverageRoute = typeof REQUIRED_BACKUP_COVERAGE_ROUTES[number];

export type BackupTableCoverageEntry = {
  table: string;
  backupKey: string;
  routes: readonly BackupCoverageRoute[];
  migrationTest: string;
};

export const BACKUP_TABLE_COVERAGE = [
  { table:'categories', backupKey:'categories', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'accounts', backupKey:'accounts', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'account_transfers', backupKey:'accountTransfers', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'investments', backupKey:'investments', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'expenses', backupKey:'expenses', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'incomes', backupKey:'incomes', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'goals', backupKey:'goals', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'goal_contributions', backupKey:'goalContributions', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'plans', backupKey:'plans', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'settings', backupKey:'settings', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'periods', backupKey:'periods', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'recurrents', backupKey:'recurrents', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'planned_occurrences', backupKey:'plannedOccurrences', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'debts', backupKey:'debts', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'debt_payments', backupKey:'debtPayments', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
  { table:'fxRates', backupKey:'fxRates', routes:REQUIRED_BACKUP_COVERAGE_ROUTES, migrationTest:'phase-18-2 full-table round-trip' },
] as const satisfies readonly BackupTableCoverageEntry[];

export const BACKUP_TABLE_NAMES = BACKUP_TABLE_COVERAGE.map(entry => entry.table);
export const BACKUP_TABLE_KEYS = BACKUP_TABLE_COVERAGE.map(entry => entry.backupKey);

export function assertBackupTableCoverage(tableNames: readonly string[]): void {
  const live = new Set<string>(tableNames);
  const covered = new Set<string>(BACKUP_TABLE_NAMES);

  const missing = [...live].filter(name => !covered.has(name)).sort();
  const stale = [...covered].filter(name => !live.has(name)).sort();

  if (missing.length) {
    throw new Error(
      'Backup 2.0 no tiene cobertura para las tablas Dexie: ' + missing.join(', ')
      + '. Añade export/import/restore/validation/migration tests antes de continuar.',
    );
  }
  if (stale.length) {
    throw new Error('El inventario de Backup 2.0 contiene tablas inexistentes: ' + stale.join(', '));
  }

  const keys = new Set<string>();
  for (const entry of BACKUP_TABLE_COVERAGE) {
    if (keys.has(entry.backupKey)) {
      throw new Error('Backup 2.0 tiene una clave duplicada: ' + entry.backupKey);
    }
    keys.add(entry.backupKey);

    const routes = new Set(entry.routes);
    for (const route of REQUIRED_BACKUP_COVERAGE_ROUTES) {
      if (!routes.has(route)) {
        throw new Error(`La tabla ${entry.table} no declara cobertura de ${route}.`);
      }
    }
    if (!entry.migrationTest.trim()) {
      throw new Error('La tabla ' + entry.table + ' no declara migration test.');
    }
  }
}
