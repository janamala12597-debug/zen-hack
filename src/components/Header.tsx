import React from 'react';
import { Shield, Wifi, WifiOff, Globe, RefreshCw, LogOut, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { translations } from '../i18n/translations';
import { Language } from '../types';

interface HeaderProps {
  onOpenHealthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenHealthModal,
}) => {
  const { user, language, setLanguage, logout } = useAuth();
  const { isOnline, offlineQueueCount, isSyncing, triggerManualSync } = useNetwork();
  const t = translations[language];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  AgriShield
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Insurance
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Center / Status indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Online / Offline badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.onlineStatus}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t.offlineStatus}</span>
                </>
              )}
            </div>

            {/* Offline queue indicator */}
            {offlineQueueCount > 0 && (
              <button
                onClick={triggerManualSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition shadow-xs disabled:opacity-50"
                title="Claims waiting for connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{offlineQueueCount} Queued</span>
              </button>
            )}

            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium border border-slate-200">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-md transition ${
                  language === 'en'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('te')}
                className={`px-2 py-1 rounded-md transition ${
                  language === 'te'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                తెలుగు
              </button>
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
                  <span className="text-[10px] text-slate-500 font-medium capitalize">
                    {user.role === 'admin' ? t.adminRole : `${user.crop} Farmer`}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
