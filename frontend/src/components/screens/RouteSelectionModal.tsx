import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Compass,
  ThermometerSnowflake,
  Flame,
  Clock,
  Droplets,
  TreeDeciduous,
  CheckCircle2,
  ArrowRight,
  Shield,
  MapPin,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const RouteSelectionModal: React.FC = () => {
  const { routes, selectedRoute, setSelectedRoute, formatTemp, navigateTo } = useApp();
  const [activeNavStarted, setActiveNavStarted] = useState(false);

  return (
    <div id="screen-route-selection-modal" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
              SCREEN #12 • ROUTE COMPARISON MODAL
            </span>
            <span className="text-slate-400 text-xs font-mono">SELECTION MATRIX</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Route Selection Modal
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Compare calculated route alternatives side-by-side evaluating thermal exposure, tree canopy shade, and active misting infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('route-planning', 'push_back')}
            data-path="routes"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            ← Route Planning
          </button>
          <button
            onClick={() => navigateTo('coolest-path-finder', 'push')}
            data-path="coolest-path"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950 transition-all cursor-pointer"
          >
            <ThermometerSnowflake className="w-3.5 h-3.5" />
            <span>Coolest Path Finder →</span>
          </button>
        </div>
      </div>

      {activeNavStarted && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono animate-pulse">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Active Heat-Safe Guidance Engaged on: {selectedRoute.name}</span>
          </div>
          <button
            onClick={() => navigateTo('coolest-path-finder', 'push')}
            className="underline font-bold text-white cursor-pointer"
          >
            Open Live Turn-by-Turn Engine →
          </button>
        </div>
      )}

      {/* Side-by-Side Route Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {routes.map((route) => {
          const isSelected = selectedRoute.id === route.id;
          const isCoolest = route.id === 'route-coolest';

          return (
            <div
              key={route.id}
              onClick={() => setSelectedRoute(route)}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-orange-950/30 border-orange-500 ring-2 ring-orange-500 shadow-xl shadow-orange-950/40 text-white'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      isCoolest
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : route.id === 'route-fastest'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    }`}
                  >
                    {route.badge}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-orange-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SELECTED
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white">{route.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{route.description}</p>

                {/* Metrics Stack */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Average Temp:</span>
                    <span className="font-bold text-emerald-400">{formatTemp(route.avgTempC)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Tree Canopy Shade:</span>
                    <span className="font-bold text-white">{route.shadePercentage}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Misting Arch Stations:</span>
                    <span className="font-bold text-cyan-400">{route.mistingStations} Active</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Total Distance:</span>
                    <span className="font-bold text-slate-200">{route.distanceKm} km ({route.durationMin}m)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Heat Stress Score:</span>
                    <span
                      className={`font-bold ${
                        route.heatStressScore < 30
                          ? 'text-emerald-400'
                          : route.heatStressScore < 60
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {route.heatStressScore} / 100
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoute(route);
                    setActiveNavStarted(true);
                  }}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  Select &amp; Engage This Route
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Route Waypoint Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-400" />
          Turn-by-Turn Waypoints &amp; Thermal Checkpoints for {selectedRoute.name}
        </h3>

        <div className="space-y-2">
          {selectedRoute.waypoints.map((wp, idx) => (
            <div
              key={wp.name}
              className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                  {idx + 1}
                </span>
                <span className="font-bold text-slate-200">{wp.name}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-slate-400">Shade: {wp.shade}%</span>
                <span className="font-bold text-emerald-400">{formatTemp(wp.tempC)}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                    wp.hazardLevel === 'high'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : wp.hazardLevel === 'moderate'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {wp.hazardLevel} Risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
