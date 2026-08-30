import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wind,
  Sun,
  Droplets,
  TreeDeciduous,
  Activity,
  Compass,
  ArrowRight,
  TrendingUp,
  Thermometer,
  ShieldAlert,
} from 'lucide-react';

export const EnvironmentalDeepDive: React.FC = () => {
  const { formatTemp, navigateTo, simulatedHour } = useApp();

  return (
    <div id="screen-environmental-deep-dive" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              SCREEN #8 • ENVIRONMENTAL TELEMETRY
            </span>
            <span className="text-slate-400 text-xs font-mono">DATA-PATH: DASHBOARD</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Environmental Deep Dive
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Multi-variable atmospheric telemetry: solar irradiance, vegetation NDVI index, wind stagnation vectors, and thermal dome trapping.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('detailed-analysis', 'push')}
            data-path="analytics"
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer"
          >
            <span>Detailed Analytics →</span>
          </button>
        </div>
      </div>

      {/* Atmospheric KPI Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>SOLAR IRRADIANCE</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">940 W/m²</div>
          <p className="text-xs text-slate-400 font-mono">Peak direct solar flux at {simulatedHour}:00</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>WIND VECTOR / SPEED</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-400">0.8 m/s</div>
          <p className="text-xs text-red-400 font-mono">Near Stagnant (High Heat Trapping)</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>RELATIVE HUMIDITY</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-400">36%</div>
          <p className="text-xs text-slate-400 font-mono">Dew point at 15.2°C</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>URBAN NDVI CANOPY</span>
            <TreeDeciduous className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">0.42</div>
          <p className="text-xs text-emerald-300 font-mono">Moderate vegetation index</p>
        </div>
      </div>

      {/* Atmospheric Physics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            Atmospheric Boundary Layer &amp; Inversion Model
          </h2>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Surface Boundary Layer Height:</span>
              <span className="font-bold text-white">420 meters</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Sensible Heat Flux (H):</span>
              <span className="font-bold text-red-400">385 W/m²</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Latent Heat Evapotranspiration (LE):</span>
              <span className="font-bold text-emerald-400">92 W/m²</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Bowen Ratio (H / LE):</span>
              <span className="font-bold text-amber-400">4.18 (Extreme Urban Aridity)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            Solar Radiation Angle &amp; Street Canyon Reflection
          </h2>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Sky View Factor (SVF):</span>
              <span className="font-bold text-white">0.34 (Deep Urban Canyon)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Multiple Radiative Reflections:</span>
              <span className="font-bold text-red-400">+4.8°C Sidewalk Heating</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Direct UV Index:</span>
              <span className="font-bold text-purple-400">10.2 (Very High)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Thermal Comfort Class:</span>
              <span className="font-bold text-red-500 uppercase">Extreme Heat Stress</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
