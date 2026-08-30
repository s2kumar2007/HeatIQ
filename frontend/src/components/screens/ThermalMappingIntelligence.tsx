import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThermalMapCanvas } from '../common/ThermalMapCanvas';
import {
  MapPin,
  Layers,
  Palette,
  Crosshair,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Camera,
  Compass,
  ArrowRight,
} from 'lucide-react';

export const ThermalMappingIntelligence: React.FC = () => {
  const { activeColorPalette, setActiveColorPalette, formatTemp, navigateTo } = useApp();
  const [selectedProbe, setSelectedProbe] = useState<{ lat: number; lng: number; temp: number; label: string }>({
    lat: 34.0522,
    lng: -118.2437,
    temp: 43.8,
    label: 'Downtown Radiometric Core',
  });

  const palettes = [
    { id: 'ironbow', label: 'Ironbow' },
    { id: 'inferno', label: 'Inferno' },
    { id: 'turbo', label: 'Turbo' },
    { id: 'rainbow', label: 'Rainbow' },
    { id: 'whiteHot', label: 'White Hot' },
    { id: 'blackHot', label: 'Black Hot' },
  ];

  return (
    <div id="screen-thermal-mapping" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-mono font-bold">
              SCREEN #6 • RADIOMETRIC CARTOGRAPHY
            </span>
            <span className="text-slate-400 text-xs font-mono">FLIR GIS OVERLAY</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Thermal Mapping Intelligence
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            High-resolution radiometric GIS suite with multispectral isolines, spot temperature probes, and area flux modeling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('thermal-gallery', 'push')}
            data-path="gallery"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>FLIR Image Archive →</span>
          </button>
        </div>
      </div>

      {/* Main Map Suite Canvas & Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            {/* Palette & Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-mono text-slate-300 font-bold uppercase">Radiometric Palette:</span>
                <div className="flex gap-1 flex-wrap">
                  {palettes.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveColorPalette(p.id)}
                      className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        activeColorPalette === p.id
                          ? 'bg-orange-600 text-white font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                <span>Active Spot Probe Mode</span>
              </div>
            </div>

            {/* Map Canvas */}
            <ThermalMapCanvas heightClass="h-[480px]" showOverlayLayers={true} />
          </div>
        </div>

        {/* Sidebar Probe & Radiometric Tools */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-mono text-orange-400 font-bold uppercase">
                RADIOMETRIC SPOT PROBE
              </span>
              <h3 className="text-sm font-bold text-white">{selectedProbe.label}</h3>
              <span className="text-xs text-slate-400 font-mono">
                {selectedProbe.lat.toFixed(4)}° N, {selectedProbe.lng.toFixed(4)}° W
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">CALIBRATED EMITTED TEMP</span>
                <span className="text-2xl font-black text-red-400">
                  {formatTemp(selectedProbe.temp)}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">SURFACE EMISSIVITY (ε)</span>
                <span className="text-base font-bold text-amber-300">0.93 (Dense Asphalt)</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ATMOSPHERIC TRANSMITTANCE</span>
                <span className="text-base font-bold text-emerald-400">98.2% (Clear Sky)</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">REFLECTED APPARENT TEMP</span>
                <span className="text-base font-bold text-blue-300">26.5°C</span>
              </div>
            </div>

            <button
              onClick={() => navigateTo('coolest-path-finder', 'push')}
              data-path="coolest-path"
              className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Route Avoidance for this Spot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
