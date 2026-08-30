import React from 'react';
import { useApp } from '../../context/AppContext';
import { ThermalMapCanvas } from '../common/ThermalMapCanvas';
import {
  Globe,
  Flame,
  ShieldAlert,
  BarChart3,
  Settings,
  Wind,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Droplets,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const { sensors, alerts, formatTemp, navigateTo } = useApp();

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;
  const criticalSensors = sensors.filter((s) => s.status === 'critical').length;

  return (
    <div id="screen-heatiq-dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-mono font-bold">
              SCREEN #10 • EXECUTIVE COMMAND
            </span>
            <span className="text-slate-400 text-xs font-mono">MUNICIPAL OVERVIEW</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ Dashboard
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Executive command dashboard: citywide microclimate health, sensor network reliability, and active thermal defenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigateTo('environmental-deep-dive', 'push_back')}
            data-path="dashboard"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Wind className="w-3.5 h-3.5 text-emerald-400" />
            <span>Environmental Deep Dive →</span>
          </button>
          <button
            onClick={() => navigateTo('detailed-analysis', 'push')}
            data-path="analytics"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Detailed Analysis →</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigateTo('detailed-analysis', 'push')}
          data-path="analytics"
          className="bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 p-4 rounded-xl space-y-2 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>CITY THERMAL INDEX</span>
            <Flame className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-orange-400">{formatTemp(41.8)}</div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Peak Downtown Core</span>
            <ArrowRight className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigateTo('thermal-feed', 'push')}
          data-path="alerts"
          className="bg-slate-900/90 border border-slate-800 hover:border-red-500/50 p-4 rounded-xl space-y-2 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>ACTIVE INCIDENTS</span>
            <ShieldAlert className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-red-400">{activeAlertCount} Warnings</div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>{criticalSensors} Critical Sensors</span>
            <ArrowRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigateTo('environmental-deep-dive', 'push_back')}
          data-path="dashboard"
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl space-y-2 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>CANOPY COOLING</span>
            <Wind className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-emerald-400">-12.6°C</div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Park Greenway Buffer</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigateTo('profile-settings', 'push')}
          data-path="settings"
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl space-y-2 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>SYSTEM RELIABILITY</span>
            <Settings className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-blue-400">99.8%</div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Sensor Grid Online</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-400" />
              Metropolitan Thermal Risk Overview
            </h2>
            <button
              onClick={() => navigateTo('tactical-command-center', 'push')}
              data-path="tactical"
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
            >
              Open Tactical Command →
            </button>
          </div>

          <ThermalMapCanvas heightClass="h-80" showOverlayLayers={false} />
        </div>

        {/* Quick Nav Drilldowns */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Core Operation Channels
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => navigateTo('environmental-deep-dive', 'push_back')}
                data-path="dashboard"
                className="w-full text-left p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400">
                    Environmental Deep Dive
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Atmospheric pressure &amp; solar flux
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigateTo('detailed-analysis', 'push')}
                data-path="analytics"
                className="w-full text-left p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-400">
                    Detailed Analysis
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Diurnal modeling &amp; UHI factor
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigateTo('thermal-feed', 'push')}
                data-path="alerts"
                className="w-full text-left p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-red-400">
                    Thermal Threat Feed
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Active anomaly stream &amp; mitigation
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigateTo('profile-settings', 'push')}
                data-path="settings"
                className="w-full text-left p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-400">
                    Profile Settings
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Operator role &amp; palettes
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
