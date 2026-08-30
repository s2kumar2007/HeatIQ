import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Flame,
  Thermometer,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Share2,
  WifiOff,
} from 'lucide-react';

// Diurnal time labels for chart x-axis (time strings only, no temperature values)
const CHART_TIME_LABELS = [
  '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
  '12:00', '14:00', '16:00', '18:00', '20:00', '22:00',
];

export const DetailedAnalysis: React.FC = () => {
  const { formatTemp, navigateTo } = useApp();
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'surface' | 'ambient' | 'canopy'>('all');

  // Parcel/diurnal data requires backend endpoints not yet implemented.
  // Rendering honest empty states instead of fabricated numbers.
  const parcels: any[] = [];

  return (
    <div id="screen-detailed-analysis" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              SCREEN #5 • ANALYTICS
            </span>
            <span className="text-slate-400 text-xs font-mono">DIURNAL FLUX &amp; UHI DYNAMICS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Detailed Analysis
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Diurnal thermal flux curves, Urban Heat Island coefficient modeling, and vulnerability demographic correlations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('environmental-deep-dive', 'push_back')}
            data-path="dashboard"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            ← Environmental Deep Dive
          </button>
          <button
            onClick={() => navigateTo('thermal-feed', 'push')}
            data-path="alerts"
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md shadow-red-950 transition-all cursor-pointer"
          >
            Thermal Feed →
          </button>
        </div>
      </div>

      {/* 24-Hour Diurnal Heat Flux Chart */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              24-Hour Diurnal Temperature Profile vs. Canopy Mitigation
            </h2>
            <p className="text-xs text-slate-400">
              Comparing unshaded asphalt surface radiation vs. shaded tree canopy microclimates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-red-400 font-mono font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Surface Asphalt
            </span>
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-mono font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ambient Air
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tree Canopy
            </span>
          </div>
        </div>

        {/* Chart: data unavailable — requires backend diurnal endpoint */}
        <div className="h-64 w-full bg-slate-950 rounded-lg p-4 relative flex flex-col items-center justify-center gap-3">
          <WifiOff className="w-8 h-8 text-slate-600" />
          <div className="text-center space-y-1">
            <p className="text-slate-400 text-sm font-semibold">Diurnal data unavailable</p>
            <p className="text-slate-500 text-xs">
              Requires a <code className="text-orange-400 bg-orange-950/40 px-1 rounded">/analysis/diurnal</code> endpoint from the FastAPI backend.
            </p>
          </div>

          {/* X Axis Time Labels */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-between text-[10px] font-mono text-slate-600 px-3">
            {CHART_TIME_LABELS.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Comparative Analytical Cards — no fabricated data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'UHI INTENSITY FACTOR', color: 'text-amber-300', icon: 'amber' },
          { label: 'CANOPY BUFFER CAPACITY', color: 'text-emerald-400', icon: 'emerald' },
          { label: 'POPULATION HEAT RISK', color: 'text-red-400', icon: 'red' },
        ].map(({ label, color }) => (
          <div key={label} className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-2">
            <span className={`text-[10px] font-mono font-bold uppercase ${color}`}>
              {label}
            </span>
            <div className={`text-xl font-black ${color} opacity-40`}>— data unavailable —</div>
            <p className="text-xs text-slate-500">
              Requires backend analytics endpoint. Connect the FastAPI server to view real metrics.
            </p>
          </div>
        ))}
      </div>

      {/* Sector Vulnerability Breakdown Table */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Municipal Sector Thermal Vulnerability Index
        </h3>
        <div className="overflow-x-auto">
          {parcels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <WifiOff className="w-8 h-8 text-slate-600" />
              <p className="text-slate-400 text-sm">No sector data available</p>
              <p className="text-slate-500 text-xs">
                Connect the FastAPI backend and implement a <code className="text-orange-400 bg-orange-950/40 px-1 rounded">/spatial/parcels</code> endpoint.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2">Sector Parcel</th>
                  <th className="pb-2">Land Classification</th>
                  <th className="pb-2">Surface Temp</th>
                  <th className="pb-2">Canopy %</th>
                  <th className="pb-2">Albedo</th>
                  <th className="pb-2">Vulnerability Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {parcels.map((p: any) => (
                  <tr key={p.parcelId} className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold text-white">{p.name}</td>
                    <td className="py-2.5 text-slate-300">{p.landUse}</td>
                    <td className="py-2.5 text-red-400 font-bold">{formatTemp(p.surfaceTemp)}</td>
                    <td className="py-2.5 text-emerald-400">{p.canopy}%</td>
                    <td className="py-2.5 text-amber-300">{p.albedo}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border bg-slate-800 text-slate-400 border-slate-700">
                        {p.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
