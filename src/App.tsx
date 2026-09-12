import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider, useNetwork } from './context/NetworkContext';
import { Header } from './components/Header';
import { SyncProgressModal } from './components/SyncProgressModal';
import { HealthMetricsModal } from './components/HealthMetricsModal';
import { AndroidSnackbar } from './components/AndroidSnackbar';
import { SubmitClaimModal } from './components/SubmitClaimModal';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthPage } from './pages/AuthPage';
import { Activity, Shield } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const { isOnline, offlineQueueCount } = useNetwork();
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('policies');
  const [refreshKey, setRefreshKey] = useState(0);

  // Register Service Worker for offline PWA functionality
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('AgriShield ServiceWorker registered:', reg.scope))
        .catch((err) => console.log('AgriShield ServiceWorker registration failed:', err));
    }
  }, []);

  // Send periodic device heartbeat to admin monitoring
  useEffect(() => {
    const deviceId =
      localStorage.getItem('agrishield_device_id') ||
      'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('agrishield_device_id', deviceId);

    const ping = () => {
      if (isOnline) {
        fetch('/api/admin/devices/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            pending_queue_count: offlineQueueCount,
            device_mode: isOnline ? 'online' : 'offline',
          }),
        }).catch(() => {});
      }
    };

    ping();
    const interval = setInterval(ping, 15000);
    return () => clearInterval(interval);
  }, [isOnline, offlineQueueCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Initializing AgriShield Micro-Insurance App...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      {/* Top Main Navigation Header */}
      <Header
        onOpenHealthModal={() => setIsHealthModalOpen(true)}
      />

      {/* Main Web Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div key={refreshKey}>
          {!user ? (
            <AuthPage />
          ) : user.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <FarmerDashboard
              activeTab={activeMobileTab}
            />
          )}
        </div>
      </main>

      {/* Clean Web Application Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-emerald-200" />
            </div>
            <span className="font-bold text-slate-800">AgriShield Parametric Micro-Insurance</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">3-Oracle Consensus (IMD • OpenWeather • Satellite)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="hover:text-emerald-700 transition flex items-center gap-1"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Consensus Health</span>
            </button>
            <span className="hidden md:inline">Autonomous Zero-Touch DBT Payouts</span>
          </div>
        </div>
      </footer>

      {/* Floating Claim Submission Modal */}
      <SubmitClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onClaimSubmitted={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Offline Claim Sync Pipeline Modal */}
      <SyncProgressModal />

      {/* Health & Metrics Modal */}
      <HealthMetricsModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
      />

      {/* Android Native Snackbar / Toast System */}
      <AndroidSnackbar />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <AppContent />
      </NetworkProvider>
    </AuthProvider>
  );
}
