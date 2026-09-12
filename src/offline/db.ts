import { openDB, IDBPDatabase } from 'idb';
import { Policy, WeatherRecord, Claim, User } from '../types';

const DB_NAME = 'agrishield_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getIDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('policies')) {
          db.createObjectStore('policies', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('weather')) {
          db.createObjectStore('weather', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline_claims')) {
          db.createObjectStore('offline_claims', { keyPath: 'offline_id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// 1. Offline Claims Queue
export async function saveOfflineClaim(claim: any): Promise<void> {
  const item = {
    ...claim,
    offline_id: claim.offline_id || 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    status: 'saved_offline',
    created_at: claim.created_at || new Date().toISOString(),
  };

  try {
    const idb = await getIDB();
    if (idb) {
      await idb.put('offline_claims', item);
    }
  } catch (e) {
    console.warn('IDB put error, falling back to localStorage:', e);
  }

  // Also sync to localStorage as redundant fallback
  try {
    const currentQueue = getLocalStorageQueue();
    currentQueue.push(item);
    localStorage.setItem('agrishield_offline_claims', JSON.stringify(currentQueue));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

export async function getOfflineClaimsQueue(): Promise<any[]> {
  try {
    const idb = await getIDB();
    if (idb) {
      const items = await idb.getAll('offline_claims');
      if (items && items.length > 0) return items;
    }
  } catch (e) {
    console.warn('IDB read error:', e);
  }

  return getLocalStorageQueue();
}

export async function removeOfflineClaim(offline_id: string): Promise<void> {
  try {
    const idb = await getIDB();
    if (idb) {
      await idb.delete('offline_claims', offline_id);
    }
  } catch (e) {
    console.warn('IDB delete error:', e);
  }

  try {
    const queue = getLocalStorageQueue().filter((c: any) => c.offline_id !== offline_id);
    localStorage.setItem('agrishield_offline_claims', JSON.stringify(queue));
  } catch (e) {
    console.error(e);
  }
}

export async function clearOfflineClaimsQueue(): Promise<void> {
  try {
    const idb = await getIDB();
    if (idb) {
      await idb.clear('offline_claims');
    }
  } catch (e) {
    console.warn(e);
  }
  try {
    localStorage.removeItem('agrishield_offline_claims');
  } catch (e) {
    console.error(e);
  }
}

function getLocalStorageQueue(): any[] {
  try {
    const data = localStorage.getItem('agrishield_offline_claims');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 2. Cached Policy
export async function cachePolicy(policy: Policy): Promise<void> {
  try {
    const idb = await getIDB();
    if (idb) {
      await idb.put('policies', policy);
    }
  } catch (e) {
    console.warn(e);
  }
  try {
    localStorage.setItem('agrishield_cached_policy', JSON.stringify(policy));
  } catch (e) {
    console.error(e);
  }
}

export async function getCachedPolicy(): Promise<Policy | null> {
  try {
    const idb = await getIDB();
    if (idb) {
      const policies = await idb.getAll('policies');
      if (policies && policies.length > 0) return policies[0];
    }
  } catch (e) {
    console.warn(e);
  }

  try {
    const item = localStorage.getItem('agrishield_cached_policy');
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

// 3. Cached Weather (strictly tagged as cached to satisfy Section 5 & 27 UX rules)
export async function cacheWeather(weather: WeatherRecord): Promise<void> {
  const taggedWeather: WeatherRecord = {
    ...weather,
    isCached: true,
    cachedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  try {
    const idb = await getIDB();
    if (idb) {
      await idb.put('weather', taggedWeather);
    }
  } catch (e) {
    console.warn(e);
  }

  try {
    localStorage.setItem('agrishield_cached_weather', JSON.stringify(taggedWeather));
  } catch (e) {
    console.error(e);
  }
}

export async function getCachedWeather(): Promise<WeatherRecord | null> {
  try {
    const idb = await getIDB();
    if (idb) {
      const all = await idb.getAll('weather');
      if (all && all.length > 0) return all[all.length - 1];
    }
  } catch (e) {
    console.warn(e);
  }

  try {
    const item = localStorage.getItem('agrishield_cached_weather');
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

// 4. Cached User Profile
export function cacheUserProfile(user: User): void {
  try {
    localStorage.setItem('agrishield_cached_user', JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }
}

export function getCachedUserProfile(): User | null {
  try {
    const item = localStorage.getItem('agrishield_cached_user');
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}
