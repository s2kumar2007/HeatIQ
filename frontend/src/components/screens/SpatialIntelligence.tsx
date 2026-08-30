import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Building2,
  TreeDeciduous,
  Sun,
  Shield,
  ArrowRight,
  Filter,
  CheckCircle2,
  Maximize2,
  MapPin,
  Flame,
  WifiOff,
} from 'lucide-react';

// Parcel data type — will be populated from backend when endpoint is available
interface ParcelData {
  parcelId: string;
  name: string;
  albedo: number;
  canopy: number;
  surfaceTemp: number;
  riskLevel: string;
  landUse: string;
}

export const SpatialIntelligence: React.FC = () => {
  const { formatTemp, navigateTo, simulatedHour } = useApp();
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [activeMetric, setActiveMetric] = useState<'surfaceTemp' | 'canopy' | 'albedo'>('surfaceTemp');

  // Spatial parcel data is not yet available from the backend API.
  // This screen requires a /spatial/parcels endpoint to be implemented.
  const parcels: ParcelData[] = [];

  return (
    <div id="screen-spatial-intelligence" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
              SCREEN #2 • SPATIAL 3D GIS
            </span>
            <span className="text-slate-400 text-xs font-mono">MORPHOLOGY ENGINE</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Spatial Intelligence Variant
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            3D urban canopy density, surface albedo ratings, and building envelope thermal reflection indexes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('tactical-command-center', 'push_back')}
            data-path="tactical"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            ← Tactical Command
          </button>
          <button
            onClick={() => navigateTo('detailed-analysis', 'push')}
            data-path="analytics"
            className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer"
          >
            Detailed Analytics →
          </button>
        </div>
      </div>

      {/* Spatial 3D Microclimate GIS Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-bold text-white">
                3D Urban Heat Island Morphology Grid
              </h2>
            </div>
            {/* Metric Layer Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveMetric('surfaceTemp')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                  activeMetric === 'surfaceTemp'
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Radiant Temp
              </button>
              <button
                onClick={() => setActiveMetric('canopy')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                  activeMetric === 'canopy'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Canopy Density
              </button>
              <button
                onClick={() => setActiveMetric('albedo')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                  activeMetric === 'albedo'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Albedo Index
              </button>
            </div>
          </div>

          {/* Data unavailable notice — GIS endpoint not yet implemented */}
          <div className="relative h-96 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col items-center justify-center gap-4">
            <WifiOff className="w-10 h-10 text-slate-600" />
            <div className="text-center space-y-1 px-8">
              <p className="text-slate-400 text-sm font-semibold">Spatial GIS data unavailable</p>
              <p className="text-slate-500 text-xs">
                This view requires a <code className="text-orange-400 bg-orange-950/40 px-1 rounded">/spatial/parcels</code> endpoint
                from the FastAPI backend. No parcel data has been returned.
              </p>
            </div>

            {/* Sun Azimuth Projection Badge */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 p-2 rounded text-xs font-mono text-slate-300">
              <span className="text-amber-400 font-bold">Solar Azimuth: {simulatedHour}:00</span> | Shadow Length: —
            </div>
          </div>
        </div>

        {/* Parcel Inspector Card */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">
                PARCEL DETAIL AUDIT
              </span>
              {selectedParcel ? (
                <>
                  <h3 className="text-base font-bold text-white">{selectedParcel.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedParcel.parcelId}</span>
                </>
              ) : (
                <p className="text-xs text-slate-500 mt-1 font-mono">No parcel selected</p>
              )}
            </div>

            {selectedParcel ? (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">SURFACE RADIANT TEMP</span>
                  <span className="font-bold text-red-400 text-sm">
                    {formatTemp(selectedParcel.surfaceTemp)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">CANOPY COVER</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {selectedParcel.canopy}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">SOLAR ALBEDO</span>
                  <span className="font-bold text-amber-300 text-sm">
                    {selectedParcel.albedo}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">LAND CLASSIFICATION</span>
                  <span className="font-bold text-slate-200">
                    {selectedParcel.landUse}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <WifiOff className="w-6 h-6 text-slate-600" />
                <p className="text-xs text-slate-500 font-mono">
                  Parcel data requires backend connection
                </p>
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-mono text-slate-400 block">Available Parcels:</span>
              {parcels.length === 0 ? (
                <p className="text-xs text-slate-600 font-mono italic">
                  No parcels loaded — backend endpoint required
                </p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {parcels.map((p) => (
                    <button
                      key={p.parcelId}
                      onClick={() => setSelectedParcel(p)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between font-mono cursor-pointer transition-colors ${
                        selectedParcel?.parcelId === p.parcelId
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="shrink-0">{formatTemp(p.surfaceTemp)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
