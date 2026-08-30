import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SlidersHorizontal,
  Bell,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Save,
  Radio,
  Droplets,
  RotateCcw,
} from 'lucide-react';

export const AlertPreferences: React.FC = () => {
  const { thresholds, updateThresholds, formatTemp, navigateTo } = useApp();
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div id="screen-alert-preferences" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
              SCREEN #7 • THRESHOLD CONFIG
            </span>
            <span className="text-slate-400 text-xs font-mono">AUTOMATED MITIGATION TRIGGERS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Alert Preferences
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Custom trigger thresholds for WBGT, peak surface temp spikes, geofence radius, and autonomous cooling response policies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('thermal-feed', 'push')}
            data-path="alerts"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            ← Thermal Threat Feed
          </button>
          <button
            onClick={() => navigateTo('profile-settings', 'push')}
            data-path="settings"
            className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer"
          >
            Profile Settings →
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Municipal alert threshold limits and autonomous dispatch rules successfully reconfigured.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radiometric Thresholds */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Flame className="w-4 h-4 text-red-400" />
            <span>Thermal &amp; Atmospheric Trigger Thresholds</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300">CRITICAL SURFACE PEAK TRIGGER:</span>
                <span className="font-bold text-red-400">{formatTemp(thresholds.criticalTempC)}</span>
              </div>
              <input
                type="range"
                min="35"
                max="55"
                step="0.5"
                value={thresholds.criticalTempC}
                onChange={(e) => updateThresholds({ criticalTempC: Number(e.target.value) })}
                className="w-full accent-red-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Fires Priority Tier-1 emergency dispatch when surface sensor surpasses this value.
              </span>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300">WBGT EXTREME HAZARD LIMIT:</span>
                <span className="font-bold text-amber-400">{thresholds.wbgtCritical.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="28"
                max="38"
                step="0.2"
                value={thresholds.wbgtCritical}
                onChange={(e) => updateThresholds({ wbgtCritical: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Wet-Bulb Globe Temperature trigger for public health hazard bulletins.
              </span>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300">DELTA-T SPIKE RATE (15 MIN):</span>
                <span className="font-bold text-orange-400">+{thresholds.deltaTTrigger15m.toFixed(1)}°C / 15m</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.2"
                value={thresholds.deltaTTrigger15m}
                onChange={(e) => updateThresholds({ deltaTTrigger15m: Number(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Detects sudden asphalt heating acceleration due to shade loss or wind stagnation.
              </span>
            </div>
          </div>
        </div>

        {/* Autonomous Mitigation Dispatch Rules */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span>Autonomous Mitigation Policies &amp; Geofencing</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  checked={thresholds.autoDispatchCoolingMisters}
                  onChange={(e) => updateThresholds({ autoDispatchCoolingMisters: e.target.checked })}
                  className="rounded accent-cyan-500"
                />
                <div>
                  <span className="font-bold block text-white">Auto-Engage Municipal Mist Arches</span>
                  <span className="text-[10px] text-slate-400">
                    Triggers automated cooling water mist cannons in sector when WBGT &gt; {thresholds.wbgtCritical}°C.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-slate-200 cursor-pointer p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  checked={thresholds.autoDispatchEmergencyTeams}
                  onChange={(e) => updateThresholds({ autoDispatchEmergencyTeams: e.target.checked })}
                  className="rounded accent-red-500"
                />
                <div>
                  <span className="font-bold block text-white">Auto-Alert Heat Emergency Responders</span>
                  <span className="text-[10px] text-slate-400">
                    Notifies paramedic hydration mobile units when critical alerts persist &gt; 10 min.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300">GEOFENCE RADIUS COVERAGE:</span>
                <span className="font-bold text-blue-400">{thresholds.geofenceRadiusKm.toFixed(0)} km</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={thresholds.geofenceRadiusKm}
                onChange={(e) => updateThresholds({ geofenceRadiusKm: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-950 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Apply Threshold Policies</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
