import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { api, setSimulatedOfflineState } from '../services/api';
import { getOfflineClaimsQueue } from '../offline/db';

export interface SyncStep {
  id: string;
  label: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'error';
  detail?: string;
}

interface NetworkContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  setSimulatedOffline: (offline: boolean) => void;
  offlineQueueCount: number;
  refreshQueueCount: () => Promise<void>;
  isSyncing: boolean;
  syncModalOpen: boolean;
  closeSyncModal: () => void;
  syncSteps: SyncStep[];
  syncResult: any;
  triggerManualSync: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [browserOnline, setBrowserOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOfflineState] = useState<boolean>(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([
    { id: '1', label: 'SYNCING...', status: 'waiting' },
    { id: '2', label: 'Weather Updated', status: 'waiting' },
    { id: '3', label: 'Policy Verified', status: 'waiting' },
    { id: '4', label: 'Claim Processed', status: 'waiting' },
  ]);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Effective online status: must be true on both browser and simulation toggle
  const isOnline = browserOnline && !isSimulatedOffline;

  const refreshQueueCount = useCallback(async () => {
    try {
      const queue = await getOfflineClaimsQueue();
      setOfflineQueueCount(queue.length);
    } catch {
      setOfflineQueueCount(0);
    }
  }, []);

  const setSimulatedOffline = (offline: boolean) => {
    setIsSimulatedOfflineState(offline);
    setSimulatedOfflineState(offline);
  };

  const closeSyncModal = () => {
    setSyncModalOpen(false);
  };

  const executeSync = useCallback(async () => {
    const queue = await getOfflineClaimsQueue();
    if (queue.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncModalOpen(true);
    setSyncResult(null);

    // Initial state
    setSyncSteps([
      { id: '1', label: 'SYNCING...', status: 'in_progress', detail: `Uploading ${queue.length} offline claim(s) from local queue` },
      { id: '2', label: 'Weather Updated', status: 'waiting', detail: 'Fetching fresh 3-source consensus rainfall' },
      { id: '3', label: 'Policy Verified', status: 'waiting', detail: 'Evaluating parametric threshold conditions' },
      { id: '4', label: 'Claim Processed', status: 'waiting', detail: 'Generating verified payout decision' },
    ]);

    try {
      // Step 1: Connecting
      await new Promise((r) => setTimeout(r, 600));
      setSyncSteps((prev) =>
        prev.map((s) => (s.id === '1' ? { ...s, status: 'completed' } : s.id === '2' ? { ...s, status: 'in_progress' } : s))
      );

      // Step 2: Weather Update
      await new Promise((r) => setTimeout(r, 700));
      const res = await api.syncOfflineClaims();
      setSyncResult(res);

      setSyncSteps((prev) =>
        prev.map((s) =>
          s.id === '2'
            ? { ...s, status: 'completed', detail: `Median verified: ${res.freshWeather?.verifiedMedian || 72} mm (${res.freshWeather?.outlier ? 'Outlier handled' : '3/3 sources consistent'})` }
            : s.id === '3'
            ? { ...s, status: 'in_progress' }
            : s
        )
      );

      // Step 3: Policy Verified
      await new Promise((r) => setTimeout(r, 700));
      setSyncSteps((prev) =>
        prev.map((s) => (s.id === '3' ? { ...s, status: 'completed' } : s.id === '4' ? { ...s, status: 'in_progress' } : s))
      );

      // Step 4: Claim Processed
      await new Promise((r) => setTimeout(r, 600));
      const hasApproved = res.results?.some((r: any) => r.status === 'approved');

      setSyncSteps((prev) =>
        prev.map((s) =>
          s.id === '4'
            ? {
                ...s,
                status: 'completed',
                detail: hasApproved
                  ? `Claim APPROVED! ₹10,000 payout decision generated.`
                  : `Claim evaluated and recorded in audit log.`,
              }
            : s
        )
      );

      if (hasApproved) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {}
      }

      await refreshQueueCount();
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncSteps((prev) =>
        prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error', detail: err.message || 'Sync failed' } : s))
      );
    } finally {
      setIsSyncing(false);
    }
  }, [refreshQueueCount]);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setBrowserOnline(true);
    };
    const handleOffline = () => {
      setBrowserOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshQueueCount]);

  // When returning online, trigger automatic sync if items in queue!
  useEffect(() => {
    if (isOnline) {
      getOfflineClaimsQueue().then((queue) => {
        setOfflineQueueCount(queue.length);
        if (queue.length > 0 && !isSyncing) {
          executeSync();
        }
      });
    }
  }, [isOnline, executeSync, isSyncing]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSimulatedOffline,
        setSimulatedOffline,
        offlineQueueCount,
        refreshQueueCount,
        isSyncing,
        syncModalOpen,
        closeSyncModal,
        syncSteps,
        syncResult,
        triggerManualSync: executeSync,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
