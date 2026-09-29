export const BALANCE_VISIBILITY_STORAGE_KEY = 'glitchbudget_balances_hidden_v1';
export const APP_LOCK_STORAGE_KEY = 'glitchbudget_app_lock_v1';
export const APP_LOCK_PIN_MIN_LENGTH = 6;
export const APP_LOCK_PIN_MAX_LENGTH = 12;

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
    legacyDefault: 'disabled',
    doesNotProtect: [
      'dexie-at-rest',
      'encrypted-backup',
      'device-file-access',
    ],
  },
  autoLock: {
    status: 'planned-17.3',
    protects: 'ui-session-after-inactivity',
    requires: 'app-lock',
    storage: 'local-only',
    legacyDefault: 'disabled',
    doesNotProtect: [
      'dexie-at-rest',
      'encrypted-backup',
    ],
  },
  encryptedBackup: {
    status: 'planned-17.4-17.5',
    optional: true,
    crypto: 'web-crypto-authenticated',
    normalJsonRemainsAvailable: true,
    passwordStoredRemotely: false,
    passwordTransmitted: false,
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
