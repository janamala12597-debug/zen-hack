import {
  saveOfflineClaim,
  getOfflineClaimsQueue,
  clearOfflineClaimsQueue,
  cachePolicy,
  getCachedPolicy,
  cacheWeather,
  getCachedWeather,
  cacheUserProfile,
  getCachedUserProfile,
} from '../offline/db';
import { User, Policy, WeatherRecord, Claim, Payout, AuditLog, AdminStats, DeviceSyncStatus } from '../types';

let isSimulatedOfflineMode = false;

export function setSimulatedOfflineState(offline: boolean) {
  isSimulatedOfflineMode = offline;
}

export function getIsSimulatedOffline(): boolean {
  return isSimulatedOfflineMode;
}

function getAuthToken(): string | null {
  return localStorage.getItem('agrishield_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // If simulated offline, throw network error immediately for write/fresh operations
  if (isSimulatedOfflineMode && !options.headers?.hasOwnProperty('X-Allow-Offline-Bypass')) {
    throw new Error('OFFLINE_MODE');
  }

  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    if (!navigator.onLine || err.message === 'Failed to fetch' || err.message === 'OFFLINE_MODE') {
      throw new Error('OFFLINE_MODE');
    }
    throw err;
  }
}

// 1. Auth API
export const api = {
  async register(data: {
    name: string;
    mobile: string;
    location: string;
    state: string;
    district: string;
    crop: string;
    preferred_language: 'en' | 'te';
    password: string;
  }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('agrishield_token', res.token);
    cacheUserProfile(res.user);
    return res;
  },

  async login(identifier: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    localStorage.setItem('agrishield_token', res.token);
    cacheUserProfile(res.user);
    return res;
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await request<{ user: User }>('/api/auth/me');
      cacheUserProfile(res.user);
      return res.user;
    } catch (err: any) {
      if (err.message === 'OFFLINE_MODE') {
        const cached = getCachedUserProfile();
        if (cached) return cached;
      }
      return null;
    }
  },

  // 2. Policy API
  async getPolicies(crop?: string): Promise<Policy[]> {
    try {
      const query = crop ? `?crop=${encodeURIComponent(crop)}` : '';
      const res = await request<{ policies: Policy[] }>(`/api/policies${query}`);
      if (res.policies && res.policies.length > 0) {
        // Cache primary active policy
        cachePolicy(res.policies[0]);
      }
      return res.policies;
    } catch (err: any) {
      if (err.message === 'OFFLINE_MODE') {
        const cached = await getCachedPolicy();
        if (cached) return [cached];
      }
      throw err;
    }
  },

  async createPolicy(policyData: Partial<Policy>): Promise<Policy> {
    const res = await request<{ policy: Policy }>('/api/policies', {
      method: 'POST',
      body: JSON.stringify(policyData),
    });
    return res.policy;
  },

  async updatePolicy(id: string, policyData: Partial<Policy>): Promise<Policy> {
    const res = await request<{ policy: Policy }>(`/api/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(policyData),
    });
    return res.policy;
  },

  async togglePolicyStatus(id: string): Promise<{ id: string; is_active: number }> {
    return await request<{ id: string; is_active: number }>(`/api/policies/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  // 3. Weather API
  async getCurrentWeather(): Promise<WeatherRecord> {
    try {
      const res = await request<{ reading: WeatherRecord }>('/api/weather/current');
      cacheWeather(res.reading);
      return res.reading;
    } catch (err: any) {
      if (err.message === 'OFFLINE_MODE') {
        const cached = await getCachedWeather();
        if (cached) {
          return {
            ...cached,
            isCached: true,
            note: 'Viewing cached weather data. Fresh oracles unavailable in offline mode.',
          };
        }
      }
      throw err;
    }
  },

  async simulateWeather(mode: 'normal' | 'outlier' | 'excessive' | 'drought' | 'custom', customSources?: { source1: number; source2: number; source3: number }): Promise<{ reading: WeatherRecord; evaluation: any }> {
    const res = await request<{ reading: WeatherRecord; evaluation: any }>('/api/weather/simulate', {
      method: 'POST',
      body: JSON.stringify({ mode, ...customSources }),
    });
    cacheWeather(res.reading);
    return res;
  },

  async getWeatherHistory(): Promise<any[]> {
    try {
      const res = await request<{ history: any[] }>('/api/weather/history');
      return res.history;
    } catch (err: any) {
      return [
        { date: 'Jun 05', source_1: 42, source_2: 44, source_3: 41, verified_rainfall: 42, threshold: 100 },
        { date: 'Jun 25', source_1: 58, source_2: 60, source_3: 57, verified_rainfall: 58, threshold: 100 },
        { date: 'Jul 15', source_1: 65, source_2: 66, source_3: 64, verified_rainfall: 65, threshold: 100 },
        { date: 'Aug 05', source_1: 72, source_2: 70, source_3: 73, verified_rainfall: 72, threshold: 100 },
      ];
    }
  },

  // 4. Claims API
  async getClaims(status?: string): Promise<Claim[]> {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await request<{ claims: Claim[] }>(`/api/claims${query}`);
      const offlineQueue = await getOfflineClaimsQueue();
      const mappedOffline: Claim[] = offlineQueue.map((q: any) => ({
        id: q.offline_id,
        claim_number: 'QUEUED-' + q.offline_id.substring(0, 8).toUpperCase(),
        farmer_id: q.farmer_id,
        policy_id: q.policy_id,
        policy_name: q.policy_name || 'AgriShield Rainfall Protection Plan',
        crop: q.crop || 'Paddy',
        location: q.location || 'Local',
        claim_date: q.created_at,
        status: 'saved_offline',
        payout_amount: q.payout_amount || 10000,
        decision_reason: 'Claim saved locally. Awaiting internet restoration for fresh 3-source oracle verification.',
        offline_id: q.offline_id,
        isOfflineQueued: true,
      }));

      return [...mappedOffline, ...res.claims];
    } catch (err: any) {
      if (err.message === 'OFFLINE_MODE') {
        const offlineQueue = await getOfflineClaimsQueue();
        return offlineQueue.map((q: any) => ({
          id: q.offline_id,
          claim_number: 'QUEUED-' + q.offline_id.substring(0, 8).toUpperCase(),
          farmer_id: q.farmer_id,
          policy_id: q.policy_id,
          policy_name: q.policy_name || 'AgriShield Rainfall Protection Plan',
          crop: q.crop || 'Paddy',
          location: q.location || 'Local',
          claim_date: q.created_at,
          status: 'saved_offline',
          payout_amount: q.payout_amount || 10000,
          decision_reason: 'Claim saved offline. It will be verified when connectivity returns.',
          offline_id: q.offline_id,
          isOfflineQueued: true,
        }));
      }
      throw err;
    }
  },

  async submitClaim(claimData: {
    policy_id: string;
    policy_name?: string;
    crop: string;
    location: string;
    farmer_id: string;
  }): Promise<{ claim: Claim; isOffline: boolean; decision?: any; payout?: any }> {
    const isOffline = !navigator.onLine || isSimulatedOfflineMode;

    if (isOffline) {
      const offlineId = 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const offlineItem = {
        ...claimData,
        offline_id: offlineId,
        created_at: new Date().toISOString(),
        status: 'saved_offline',
      };
      await saveOfflineClaim(offlineItem);

      return {
        claim: {
          id: offlineId,
          claim_number: 'OFFLINE-' + offlineId.substring(4, 10).toUpperCase(),
          farmer_id: claimData.farmer_id,
          policy_id: claimData.policy_id,
          policy_name: claimData.policy_name,
          crop: claimData.crop,
          location: claimData.location,
          claim_date: new Date().toISOString(),
          status: 'saved_offline',
          payout_amount: 10000,
          decision_reason: 'Claim saved offline. It will be verified when connectivity returns.',
          offline_id: offlineId,
          isOfflineQueued: true,
        },
        isOffline: true,
      };
    }

    try {
      const res = await request<{ claim: Claim; decision: any; payout: any }>('/api/claims', {
        method: 'POST',
        body: JSON.stringify(claimData),
      });
      return { claim: res.claim, isOffline: false, decision: res.decision, payout: res.payout };
    } catch (err: any) {
      if (err.message === 'OFFLINE_MODE') {
        const offlineId = 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const offlineItem = {
          ...claimData,
          offline_id: offlineId,
          created_at: new Date().toISOString(),
          status: 'saved_offline',
        };
        await saveOfflineClaim(offlineItem);
        return {
          claim: {
            id: offlineId,
            claim_number: 'OFFLINE-' + offlineId.substring(4, 10).toUpperCase(),
            farmer_id: claimData.farmer_id,
            policy_id: claimData.policy_id,
            crop: claimData.crop,
            location: claimData.location,
            claim_date: new Date().toISOString(),
            status: 'saved_offline',
            payout_amount: 10000,
            decision_reason: 'Claim saved offline. It will be verified when connectivity returns.',
            offline_id: offlineId,
            isOfflineQueued: true,
          },
          isOffline: true,
        };
      }
      throw err;
    }
  },

  async syncOfflineClaims(): Promise<any> {
    const queue = await getOfflineClaimsQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, message: 'Queue empty' };
    }

    const deviceId = localStorage.getItem('agrishield_device_id') || 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('agrishield_device_id', deviceId);

    const res = await request<{
      message: string;
      syncedCount: number;
      freshWeather: any;
      results: any[];
      syncPipeline: any[];
    }>('/api/claims/sync', {
      method: 'POST',
      body: JSON.stringify({ claims: queue, device_id: deviceId }),
    });

    await clearOfflineClaimsQueue();
    return res;
  },

  // 5. Payouts API
  async getPayouts(status?: string): Promise<Payout[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await request<{ payouts: Payout[] }>(`/api/payouts${query}`);
    return res.payouts;
  },

  async settlePayout(id: string): Promise<Payout> {
    const res = await request<{ payout: Payout }>(`/api/payouts/${id}/settle`, {
      method: 'POST',
    });
    return res.payout;
  },

  // 6. Admin API
  async getAdminStats(): Promise<AdminStats> {
    const res = await request<{ stats: AdminStats }>('/api/admin/stats');
    return res.stats;
  },

  async getAdminFarmers(): Promise<any[]> {
    const res = await request<{ farmers: any[] }>('/api/admin/farmers');
    return res.farmers;
  },

  async getAdminDevices(): Promise<DeviceSyncStatus[]> {
    const res = await request<{ devices: DeviceSyncStatus[] }>('/api/admin/devices');
    return res.devices;
  },

  // 7. Audit Trail API
  async getAuditTrail(limit = 100): Promise<AuditLog[]> {
    const res = await request<{ logs: AuditLog[] }>(`/api/audit-trail?limit=${limit}`);
    return res.logs;
  },

  // 8. Health & Metrics
  async getHealth(): Promise<any> {
    return await request('/healthz');
  },

  async getMetrics(): Promise<any> {
    return await request('/metrics');
  },
};
