import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  readStoragePersistenceState,
  requestPersistentStorage,
  type StoragePersistenceManager,
} from '../src/lib/storage-persistence';

test('20.1 storage persistence reports unsupported without browser support', async () => {
  assert.equal(await readStoragePersistenceState(undefined), 'unsupported');
  assert.equal(await requestPersistentStorage(undefined), 'unsupported');
  assert.equal(await readStoragePersistenceState({}), 'unsupported');
});

test('20.1 storage persistence reads status without requesting permission', async () => {
  let persistCalls = 0;
  const manager: StoragePersistenceManager = {
    persisted: async () => false,
    persist: async () => {
      persistCalls += 1;
      return true;
    },
  };

  assert.equal(await readStoragePersistenceState(manager), 'best-effort');
  assert.equal(persistCalls, 0);
});

test('20.1 storage persistence does not request again when already persistent', async () => {
  let persistCalls = 0;
  const manager: StoragePersistenceManager = {
    persisted: async () => true,
    persist: async () => {
      persistCalls += 1;
      return true;
    },
  };

  assert.equal(await requestPersistentStorage(manager), 'persistent');
  assert.equal(persistCalls, 0);
});

test('20.1 storage persistence distinguishes grant, denial and API errors', async () => {
  const granted: StoragePersistenceManager = {
    persisted: async () => false,
    persist: async () => true,
  };
  const denied: StoragePersistenceManager = {
    persisted: async () => false,
    persist: async () => false,
  };
  const failed: StoragePersistenceManager = {
    persisted: async () => {
      throw new Error('browser denied API access');
    },
    persist: async () => true,
  };

  assert.equal(await requestPersistentStorage(granted), 'persistent');
  assert.equal(await requestPersistentStorage(denied), 'best-effort');
  assert.equal(await requestPersistentStorage(failed), 'error');
});
