import React from 'react';
import { useApp } from '../../context/AppContext';
import { ALL_SCREENS } from '../../context/AppContext';
import {
  Flame,
  Activity,
  Layers,
  Clock,
  Radio,
  Sliders,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  AlertTriangle,
} from 'lucide-react';

export const NavigationHeader: React.FC = () => {
  const {
    currentScreen,
    navigateTo,
    formatTemp,
    simulatedHour,
    setSimulatedHour,
    isLiveSimulating,
    setIsLiveSimulating,
    userProfile,
    updateUserProfile,
    triggerNewScan,
    setIsScreenSwitcherOpen,
    alerts,
  } = useApp();

  const currentMeta = ALL_SCREENS.find((s) => s.id === currentScreen) || ALL_SCREENS[0];
  const activeCriticalAlerts = alerts.filter((a) => a.severity === 'critical' && a.status === 'active');

  return (
    <header id="heatiq-main-header" className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Critical Alert Ribbon if active */}
      {activeCriticalAlerts.length > 0 && (
        <div id="critical-alert-banner" className="bg-red-600/90 text-white px-4 py-1 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>CRITICAL THERMAL SPIKE: {activeCriticalAlerts[0].zone} — {activeCriticalAlerts[0].title}</span>
          </div>
          <button
            onClick={() => navigateTo('thermal-feed', 'push')}
            data-path="alerts"
            className="underline text-white hover:text-amber-200 text-xs cursor-pointer font-bold ml-4"
          >
            Review Threat Feed →
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand and Current Screen Indicator */}
        <div className="flex items-center gap-4">
          <button
            id="brand-logo-btn"
            onClick={() => navigateTo('tactical-command-center', 'fade')}
            data-path="tactical"
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 via-rose-600 to-orange-500 p-0.5 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
                  HeatIQ
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  OPS-v4.2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Tactical Microclimate &amp; Coolest Path Command</p>
            </div>
          </button>

          {/* Breadcrumb separator */}
          <ChevronRight className="w-4 h-4 text-slate-600 hidden md:block" />

          {/* Active Screen Tag */}
          <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 px-3 py-1.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-medium text-slate-300 max-w-[220px] truncate">
              {currentMeta.title}
            </span>
          </div>
        </div>

        {/* Global Controls & Telemetry */}
        <div className="flex items-center gap-3">
          {/* Time & Solar Sim Slider */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-md text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-mono">Sun Azimuth:</span>
            <span className="text-amber-300 font-bold font-mono w-12">{simulatedHour.toString().padStart(2, '0')}:00</span>
            <input
              type="range"
              min="6"
              max="20"
              value={simulatedHour}
              onChange={(e) => setSimulatedHour(Number(e.target.value))}
              className="w-20 accent-orange-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              title="Adjust solar time to calculate shadow projection and peak thermal radiation"
            />
          </div>

          {/* Live Simulation Pulse Toggle */}
          <button
            id="toggle-live-sim-btn"
            onClick={() => setIsLiveSimulating(!isLiveSimulating)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isLiveSimulating
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle continuous live sensor stream updates"
          >
            <Activity className={`w-3.5 h-3.5 ${isLiveSimulating ? 'animate-spin' : ''}`} />
            <span>{isLiveSimulating ? 'LIVE STREAM' : 'PAUSED'}</span>
          </button>

          {/* Unit Switcher */}
          <button
            id="unit-toggle-btn"
            onClick={() =>
              updateUserProfile({
                tempUnit: userProfile.tempUnit === 'celsius' ? 'fahrenheit' : 'celsius',
              })
            }
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-xs font-mono text-amber-300 font-semibold cursor-pointer transition-colors"
            title="Toggle between Celsius and Fahrenheit"
          >
            {userProfile.tempUnit === 'celsius' ? '°C' : '°F'}
          </button>

          {/* Master 13-Screen Switcher HUD Button */}
          <button
            id="screen-matrix-switcher-btn"
            onClick={() => setIsScreenSwitcherOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-md shadow-md shadow-orange-950 cursor-pointer transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ALL SCREENS (13)</span>
            <span className="sm:hidden">SCREENS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
