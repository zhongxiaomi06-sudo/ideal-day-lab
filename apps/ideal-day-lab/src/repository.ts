import type { Plan } from './domain';
import { MAX_PLANS, validateBlocks } from './domain';

const DB_NAME = 'eazo-ideal-day-lab';
const STORE = 'plans';

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 2);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'planId' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const requestValue = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export async function listPlans(): Promise<Plan[]> {
  const db = await openDatabase();
  const values = await requestValue(db.transaction(STORE, 'readonly').objectStore(STORE).getAll()) as Plan[];
  db.close();
  return values.filter((plan) => plan.schemaVersion === 2 && validateBlocks(plan.blocks).length === 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function savePlan(plan: Plan): Promise<{ ok: true } | { ok: false; code: 'PLAN_LIMIT' }> {
  const existing = await listPlans();
  if (!existing.some((item) => item.planId === plan.planId) && existing.length >= MAX_PLANS) return { ok: false, code: 'PLAN_LIMIT' };
  const db = await openDatabase();
  await requestValue(db.transaction(STORE, 'readwrite').objectStore(STORE).put(plan));
  db.close();
  return { ok: true };
}

export async function removePlan(planId: string) {
  const db = await openDatabase();
  await requestValue(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(planId));
  db.close();
}
