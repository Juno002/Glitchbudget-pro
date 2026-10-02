export const BALANCE_VISIBILITY_STORAGE_KEY = 'glitchbudget_balances_hidden_v1';
export const APP_LOCK_STORAGE_KEY = 'glitchbudget_app_lock_v1';
export const AUTO_LOCK_STORAGE_KEY = 'glitchbudget_auto_lock_v1';
export const APP_LOCK_PIN_MIN_LENGTH = 6;
export const APP_LOCK_PIN_MAX_LENGTH = 12;
export const AUTO_LOCK_TIMEOUT_OPTIONS = [1, 5, 15, 30] as const;
export const ENCRYPTED_BACKUP_FORMAT = 'GlitchBudget encrypted backup';
export const ENCRYPTED_BACKUP_VERSION = 1;
export const ENCRYPTED_BACKUP_PASSWORD_MIN_LENGTH = 8;
export const ENCRYPTED_BACKUP_PASSWORD_MAX_LENGTH = 128;
export type AutoLockTimeoutMinutes = typeof AUTO_LOCK_TIMEOUT_OPTIONS[number];

export const LOCAL_SECURITY_CONTRACT = {
  privacyFromServers: {
    boundary: 'architecture',
    status: 'guaranteed-local-only',
    description: 'La privacidad frente a servidores depende de la arquitectura local-only y no de App lock.',
  },
  hideAmounts: {
    status: 'implemented',
    protects: 'visual-disclosure',
    storage: 'localStorage',
    storageKey: BALANCE_VISIBILITY_STORAGE_KEY,
    legacyDefault: false,
    doesNotProtect: [
      'dexie-at-rest',
      'exports',
      'developer-tools',
      'device-file-access',
    ],
  },
  appLock: {
    status: 'implemented-17.2',
    protects: 'ui-access',
    storage: 'localStorage',
    storageKey: APP_LOCK_STORAGE_KEY,
    verifier: 'PBKDF2-SHA-256',
    plaintextPinStored: false,
    retryBackoff: 'session-memory-progressive',
    retryBackoffMaxMs: 30_000,
    legacyDefault: 'disabled',
    doesNotProtect: [
      'dexie-at-rest',
      'encrypted-backup',
      'device-file-access',
    ],
  },
  autoLock: {
    status: 'implemented-17.3',
    protects: 'ui-session-after-inactivity',
    requires: 'app-lock',
    storage: 'localStorage',
    storageKey: AUTO_LOCK_STORAGE_KEY,
    timeoutOptionsMinutes: AUTO_LOCK_TIMEOUT_OPTIONS,
    legacyDefault: 'disabled',
    doesNotProtect: [
      'dexie-at-rest',
      'encrypted-backup',
    ],
  },
  encryptedBackup: {
    status: 'implemented-17.5',
    optional: true,
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: 'PBKDF2-SHA-256',
    cipher: 'AES-256-GCM',
    crypto: 'web-crypto-authenticated',
    normalJsonRemainsAvailable: true,
    passwordStoredRemotely: false,
    passwordTransmitted: false,
    restoreStatus: 'implemented-17.5',
  },
} as const;

export type LocalSecurityMechanism = keyof typeof LOCAL_SECURITY_CONTRACT;

export type LocalSecurityLegacyDefaults = {
  hideAmounts: false;
  appLockEnabled: false;
  autoLockEnabled: false;
};

export const LOCAL_SECURITY_LEGACY_DEFAULTS: LocalSecurityLegacyDefaults = {
  hideAmounts: false,
  appLockEnabled: false,
  autoLockEnabled: false,
};