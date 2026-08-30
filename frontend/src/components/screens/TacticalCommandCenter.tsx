import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThermalMapCanvas } from '../common/ThermalMapCanvas';
import { HeatAgentWidget } from '../common/HeatAgentWidget';
import {
  Flame,
  ShieldAlert,
  Radio,
  Layers,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Compass,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export const TacticalCommandCenter: React.FC = () => {
  const {
    sensors,
    alerts,
    formatTemp,
    navigateTo,
    dispatchAlertMitigation,
    triggerNewScan,
    userProfile,
  } = useApp();

  const [selectedSensorId, setSelectedSensorId] = useState<string>('NODE-701');
  const selectedSensor = sensors.find((s) => s.id === selectedSensorId) || sensors[0];

  const criticalSensors = sensors.filter((s) => s.status === 'critical');
  const activeAlerts = alerts.filter((a) => a.status === 'active');

  return (
    <div id="screen-tactical-command-center" className="space-y-6">
      {/* Top Tactical Ops Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-mono font-bold">
              SCREEN #1 • PRIMARY INITIAL
            </span>
            <span className="text-slate-400 text-xs font-mono">SECTOR: METRO CORE</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Tactical Command Center Variant
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Operational tactical grid for municipal heat defense, automated cooling deployments, and sensor telemetry.
          </p>
        </div>

        {/* Quick Action Matrix */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-scan-refresh"
            onClick={triggerNewScan}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Force Telemetry Sync</span>
          </button>

          <button
            id="btn-nav-spatial-variant"
            onClick={() => navigateTo('spatial-intelligence', 'push')}
            data-path="spatial"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Spatial Variant →</span>
          </button>

          <button
            id="btn-nav-coolest-path"
            onClick={() => navigateTo('coolest-path-finder', 'push')}
            data-path="coolest-path"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-950 transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Coolest Path Engine</span>
          </button>
        </div>
      </div>

      {/* KPI Tactical Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>PEAK SURFACE HEAT</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400">
            {formatTemp(44.5)}
          </div>
          <div className="flex items-center gap-1 text-xs text-red-300 mt-2 font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+3.8°C above seasonal baseline</span>
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-12 bg-red-500/10 rounded-tl-full pointer-events-none" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>MAX WBGT STRESS</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            35.1°C
          </div>
          <div className="text-xs text-amber-300 mt-2 font-mono">
            Category 5: Extreme Hazard
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-12 bg-amber-500/10 rounded-tl-full pointer-events-none" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>ACTIVE SENSORS</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {sensors.length} / {sensors.length}
          </div>
          <div className="text-xs text-emerald-300 mt-2 font-mono">
            {criticalSensors.length} Critical Threshold
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-12 bg-emerald-500/10 rounded-tl-full pointer-events-none" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>COOL MISTER CANNONS</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-400">
            18 / 24
          </div>
          <div className="text-xs text-cyan-300 mt-2 font-mono">
            Active cooling in 4 zones
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-12 bg-cyan-500/10 rounded-tl-full pointer-events-none" />
        </div>
      </div>

      {/* Interactive Agent Reasoning Widget from GitHub FortyGuard Repo */}
      <HeatAgentWidget />

      {/* Main Interactive Tactical Map & Live Sensor Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radiometric Thermal Map Component */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h2 className="text-base font-bold text-white">
                  Real-time Tactical Radiometric GIS View
                </h2>
              </div>
              <button
                onClick={() => navigateTo('thermal-mapping', 'push')}
                data-path="mapping"
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
              >
                Detailed Radiometric Suite →
              </button>
            </div>

            <ThermalMapCanvas
              heightClass="h-[420px]"
              showOverlayLayers={true}
              onSelectSensor={(id) => setSelectedSensorId(id)}
            />
          </div>
        </div>

        {/* Selected Sensor Node Telemetry Details */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-orange-400 font-bold uppercase">
                  NODE TELEMETRY
                </span>
                <h3 className="text-sm font-bold text-white">{selectedSensor.name}</h3>
                <span className="text-xs text-slate-400 font-mono">{selectedSensor.zone}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                  selectedSensor.status === 'critical'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : selectedSensor.status === 'elevated'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {selectedSensor.status}
              </span>
            </div>

            {/* Metrics List */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">SURFACE TEMP</span>
                <span className="text-base font-bold text-red-400">
                  {formatTemp(selectedSensor.tempC)}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">WBGT INDEX</span>
                <span className="text-base font-bold text-amber-400">
                  {selectedSensor.wbgt.toFixed(1)}°C
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">SOLAR RADIANCE</span>
                <span className="text-base font-bold text-orange-300">
                  {selectedSensor.solarW} W/m²
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">TREE CANOPY</span>
                <span className="text-base font-bold text-emerald-400">
                  {selectedSensor.canopyCover}%
                </span>
              </div>
            </div>

            {/* Sensor Selection Switcher */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-mono text-slate-400 block">Select Monitored Node:</label>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {sensors.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSensorId(s.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between font-mono cursor-pointer transition-colors ${
                      s.id === selectedSensorId
                        ? 'bg-orange-600 text-white font-bold'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0">{formatTemp(s.tempC)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action dispatch button */}
            <button
              onClick={() => navigateTo('route-planning', 'push')}
              data-path="routes"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              <span>Plan Heat-Safe Ingress Route</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Tactical Alerts & Rapid Mitigations */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white">
              Tactical Thermal Alert Matrix &amp; Instant Dispatch
            </h2>
          </div>
          <button
            onClick={() => navigateTo('thermal-feed', 'push')}
            data-path="alerts"
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
          >
            View Full Incident Feed ({alerts.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className="bg-slate-950 border border-red-900/40 p-4 rounded-lg space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wide">
                    {alert.id} • {alert.timestamp}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{alert.title}</h4>
                  <p className="text-xs text-slate-400">{alert.zone}</p>
                </div>
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold shrink-0">
                  {alert.severity}
                </span>
              </div>

              <p className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                <strong className="text-orange-400">Action:</strong> {alert.recommendedAction}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-mono text-red-400 font-bold">
                  Peak: {formatTemp(alert.tempC)} (ΔT +{alert.deltaT}°C)
                </span>
                <button
                  onClick={() => dispatchAlertMitigation(alert.id)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Deploy Misters &amp; Teams
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
