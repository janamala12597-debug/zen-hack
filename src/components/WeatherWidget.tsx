import React from 'react';
import { CloudRain, AlertTriangle, CheckCircle, Clock, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { WeatherRecord } from '../types';
import { useNetwork } from '../context/NetworkContext';
import { translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';

interface WeatherWidgetProps {
  weather: WeatherRecord | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, isLoading, onRefresh }) => {
  const { isOnline } = useNetwork();
  const { language } = useAuth();
  const t = translations[language];

  if (!weather) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-center min-h-[220px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Retrieving 3-source meteorological consensus...</span>
        </div>
      </div>
    );
  }

  const isCachedMode = !isOnline || weather.isCached;
  const timeFormatted = weather.timestamp
    ? new Date(weather.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '10:30 AM';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div
        className={`px-5 py-3 border-b flex items-center justify-between ${
          isCachedMode
            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-2">
          {isCachedMode ? (
            <Database className="w-4 h-4 text-amber-700" />
          ) : (
            <CloudRain className="w-4 h-4 text-emerald-700" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider">
            {isCachedMode ? t.offlineStatus : t.onlineStatus}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-xs font-medium">
            {isCachedMode ? t.latestWeatherUnavailable : t.freshWeatherData}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 opacity-70" />
          <span>
            {isCachedMode ? `${t.lastSync}: ${timeFormatted}` : `Updated: ${timeFormatted}`}
          </span>
          {onRefresh && isOnline && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="ml-1 p-1 hover:bg-emerald-100 rounded text-emerald-800 transition"
              title="Refresh weather oracles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Block */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              {isCachedMode ? t.lastKnownWeather : 'Current Verified Rainfall'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {weather.verified_rainfall}
              </span>
              <span className="text-lg font-semibold text-slate-500">mm</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ml-1">
                Deterministic Median
              </span>
            </div>
            {isCachedMode && (
              <p className="text-xs font-medium text-amber-700 mt-1">
                ⚠️ Current Live Weather: Unavailable until connectivity returns
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{t.sourcesVerified}</span>
          </div>
        </div>

        {/* 3 Weather Sources breakdown */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Independent Weather Oracles (Aggregation Consensus)</span>
            <span className="text-[11px] text-slate-400">Median Rule</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Source 1 */}
            <div
              className={`p-3 rounded-xl border text-center transition ${
                weather.outlier_source === 'Source 1'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-1">
                <span>Oracle 1 (IMD Station)</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{weather.source_1} mm</p>
              <span className="text-[10px] text-slate-500 font-medium">Ground AWS</span>
            </div>

            {/* Source 2 */}
            <div
              className={`p-3 rounded-xl border text-center transition ${
                weather.outlier_source === 'Source 2'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-1">
                <span>Oracle 2 (Skymet Radar)</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{weather.source_2} mm</p>
              <span className="text-[10px] text-slate-500 font-medium">Doppler Radar</span>
            </div>

            {/* Source 3 */}
            <div
              className={`p-3 rounded-xl border text-center transition ${
                weather.outlier_source === 'Source 3'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-1">
                <span>Oracle 3 (ECMWF Grid)</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{weather.source_3} mm</p>
              <span className="text-[10px] text-slate-500 font-medium">Satellite Mesh</span>
            </div>
          </div>
        </div>

        {/* Outlier Warning Box (Section 12 & 16) */}
        {weather.outlier_detected === 1 && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                {t.outlierDetected}: {weather.outlier_source || 'Discrepancy Detected'}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {weather.outlier_source} {t.outlierWarning}
              </p>
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                Deterministic rule: Outliers do not corrupt payout decisions. Remaining consensus median ({weather.verified_rainfall} mm) protects farmers against oracle failure.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
