import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThermalMapCanvas } from '../common/ThermalMapCanvas';
import {
  ThermometerSnowflake,
  Sun,
  TreeDeciduous,
  Droplets,
  Clock,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export const CoolestPathFinder: React.FC = () => {
  const { selectedRoute, formatTemp, simulatedHour, setSimulatedHour, navigateTo } = useApp();
  const [activeStep, setActiveStep] = useState(0);

  // Dynamic calculations based on sun angle
  const shadowMultiplier = Math.max(0.4, (Math.abs(simulatedHour - 13) * 0.3 + 0.5)).toFixed(1);
  const tempReduction = (7.8 - Math.abs(simulatedHour - 14) * 0.4).toFixed(1);

  return (
    <div id="screen-coolest-path-finder" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              SCREEN #13 • SHADOW &amp; THERMAL NAVIGATION
            </span>
            <span className="text-slate-400 text-xs font-mono">DYNAMIC AZIMUTH ENGINE</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Coolest Path Finder
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Real-time urban shadow modeling, dynamic solar azimuth calculation, and micro-cooling infrastructure routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('route-selection-modal', 'modal')}
            data-path="route-selection"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            ← Compare Routes Modal
          </button>
          <button
            onClick={() => navigateTo('tactical-command-center', 'push_back')}
            data-path="tactical"
            className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer"
          >
            Tactical Command →
          </button>
        </div>
      </div>

      {/* Dynamic Sun & Shadow Engine Controls */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              Dynamic Solar Azimuth &amp; Shadow Projection Engine
            </h2>
            <p className="text-xs text-slate-400">
              Drag the time slider to recalculate building shadows, street canyon shade, and peak thermal radiation loads in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Simulated Hour:</span>
            <span className="text-lg font-bold text-amber-300">{simulatedHour.toString().padStart(2, '0')}:00</span>
            <input
              type="range"
              min="6"
              max="20"
              value={simulatedHour}
              onChange={(e) => setSimulatedHour(Number(e.target.value))}
              className="w-32 accent-orange-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Dynamic Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">NET THERMAL SAVING</span>
            <span className="text-xl font-bold text-emerald-400">-{tempReduction}°C Surface Temp</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">BUILDING SHADOW LENGTH</span>
            <span className="text-xl font-bold text-amber-300">{shadowMultiplier}x Structure Height</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">SOLAR RADIATIVE SHIELDING</span>
            <span className="text-xl font-bold text-cyan-400">74% Shade Coverage</span>
          </div>
        </div>
      </div>

      {/* Coolest Corridor Highlighted Canvas & Guidance Step */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <ThermometerSnowflake className="w-4 h-4 text-emerald-400" />
                Live Shaded Corridor Trajectory Map
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE GUIDANCE
              </span>
            </div>

            <ThermalMapCanvas heightClass="h-[400px]" highlightRoute={true} showOverlayLayers={true} />
          </div>
        </div>

        {/* Turn by Turn Step Guidance */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                STEP-BY-STEP GUIDANCE
              </span>
              <h3 className="text-base font-bold text-white">{selectedRoute.name}</h3>
              <span className="text-xs text-slate-400 font-mono">
                {selectedRoute.distanceKm} km • Est {selectedRoute.durationMin} mins
              </span>
            </div>

            <div className="space-y-2">
              {selectedRoute.waypoints.map((wp, idx) => {
                const isActiveStep = activeStep === idx;
                return (
                  <div
                    key={wp.name}
                    onClick={() => setActiveStep(idx)}
                    className={`p-3 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                      isActiveStep
                        ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white truncate">{wp.name}</span>
                      </div>
                      <span className="text-emerald-400 font-bold shrink-0">{formatTemp(wp.tempC)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pl-7">
                      <span>Shade: {wp.shade}%</span>
                      <span className="text-slate-400 capitalize">{wp.hazardLevel} heat stress</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigateTo('route-planning', 'push_back')}
              data-path="routes"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Modify Route Destination →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
