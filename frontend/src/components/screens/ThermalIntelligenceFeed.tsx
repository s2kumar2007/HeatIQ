import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Send,
  Radio,
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const ThermalIntelligenceFeed: React.FC = () => {
  const { alerts, formatTemp, dispatchAlertMitigation, resolveAlert, navigateTo } = useApp();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'active') return a.status === 'active';
    if (filterSeverity === 'resolved') return a.status === 'resolved';
    return a.severity === filterSeverity;
  });

  return (
    <div id="screen-thermal-feed" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
              SCREEN #3 • INCIDENT FEED
            </span>
            <span className="text-slate-400 text-xs font-mono">AUTOMATED MITIGATION ENGINE</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Thermal Intelligence Feed
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Real-time thermal threat event stream, rapid responder dispatches, and radiometric threshold violations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('alert-preferences', 'push')}
            data-path="alert-preferences"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Alert Preferences →</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'critical', 'high', 'moderate', 'active', 'resolved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilterSeverity(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-bold tracking-wider cursor-pointer transition-colors ${
              filterSeverity === f
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {f} {f === 'all' ? `(${alerts.length})` : ''}
          </button>
        ))}
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => {
          const isCrit = alert.severity === 'critical';
          const isHigh = alert.severity === 'high';
          const isResolved = alert.status === 'resolved';

          return (
            <div
              key={alert.id}
              className={`p-5 rounded-xl border transition-all ${
                isResolved
                  ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                  : isCrit
                  ? 'bg-slate-900 border-red-800/60 shadow-lg shadow-red-950/30'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-orange-400">
                      {alert.id}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-300 font-medium">{alert.zone}</span>
                  </div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {isCrit && <Flame className="w-4 h-4 text-red-500 shrink-0" />}
                    {alert.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded border uppercase ${
                      isCrit
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded border uppercase ${
                      isResolved
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : alert.status === 'mitigating'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        : 'bg-red-500/20 text-red-400 border-red-500/40'
                    }`}
                  >
                    {alert.status}
                  </span>
                </div>
              </div>

              {/* Cause & Action Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono my-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Primary Anomaly Vector:
                  </span>
                  <span className="text-slate-300">{alert.cause}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-orange-400 block text-[10px] uppercase font-bold">
                    Operational Directive:
                  </span>
                  <span className="text-slate-200">{alert.recommendedAction}</span>
                </div>
              </div>

              {/* Telemetry Footer & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-red-400 font-bold">
                    Surface Peak: {formatTemp(alert.tempC)}
                  </span>
                  <span className="text-amber-400">
                    ΔT (15m): +{alert.deltaT}°C
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => dispatchAlertMitigation(alert.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      Dispatch Mitigation Unit
                    </button>
                  )}
                  {alert.status === 'mitigating' && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
