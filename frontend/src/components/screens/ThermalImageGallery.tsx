import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Camera,
  Layers,
  Thermometer,
  Eye,
  Sliders,
  Maximize2,
  Tag,
  ArrowRight,
  Info,
  Flame,
} from 'lucide-react';

export const ThermalImageGallery: React.FC = () => {
  const { thermalImages, formatTemp, navigateTo } = useApp();
  const [selectedImage, setSelectedImage] = useState(thermalImages[0]);
  const [splitSliderPos, setSplitSliderPos] = useState(50); // 0-100% split

  return (
    <div id="screen-thermal-gallery" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-mono font-bold">
              SCREEN #11 • RADIOMETRIC IMAGERY
            </span>
            <span className="text-slate-400 text-xs font-mono">FLIR UAV ARCHIVE</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Thermal Image Gallery
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Radiometric image catalog from FLIR T1020 UAVs, facade heat leak audits, and optical RGB vs Infrared split inspector.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('thermal-mapping', 'push')}
            data-path="mapping"
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Thermal GIS Mapping →</span>
          </button>
        </div>
      </div>

      {/* Split RGB vs FLIR Infrared Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-400" />
                  {selectedImage.title}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedImage.source} • {selectedImage.timestamp} • {selectedImage.location}
                </span>
              </div>
            </div>

            {/* Split Screen Image Container */}
            <div className="relative h-80 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none">
              {/* Thermal Infrared Layer (Underneath) */}
              <div
                className={`absolute inset-0 bg-gradient-to-tr ${selectedImage.thermalGradient} flex items-center justify-center p-6`}
              >
                <div className="text-center bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-white">
                  <Flame className="w-8 h-8 mx-auto text-amber-300 animate-pulse mb-1" />
                  <span className="font-mono text-xs font-bold uppercase tracking-widest block text-amber-200">
                    FLIR RADIOMETRIC IR LAYER
                  </span>
                  <span className="text-2xl font-black text-white font-mono">
                    Max: {formatTemp(selectedImage.maxTempC)} | Min: {formatTemp(selectedImage.minTempC)}
                  </span>
                </div>
              </div>

              {/* Optical RGB Layer (Clipped via Split Position) */}
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-tr ${selectedImage.rgbGradient} border-r-2 border-white flex items-center justify-center p-6 overflow-hidden`}
                style={{ width: `${splitSliderPos}%` }}
              >
                <div className="text-center bg-black/60 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-slate-200 min-w-[200px]">
                  <Eye className="w-8 h-8 mx-auto text-cyan-300 mb-1" />
                  <span className="font-mono text-xs font-bold uppercase tracking-widest block text-cyan-200">
                    OPTICAL VISUAL SPECTRUM (RGB)
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    Standard Daylight Camera
                  </span>
                </div>
              </div>

              {/* Split Slider Handle Label */}
              <div
                className="absolute top-2 z-10 px-2 py-0.5 rounded bg-slate-950/90 text-white text-[10px] font-mono border border-slate-700 -translate-x-1/2 shadow-lg"
                style={{ left: `${splitSliderPos}%` }}
              >
                RGB ◂ Split ▸ IR ({splitSliderPos}%)
              </div>
            </div>

            {/* Slider Control Bar */}
            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-cyan-400 font-bold">100% Optical RGB</span>
              <input
                type="range"
                min="5"
                max="95"
                value={splitSliderPos}
                onChange={(e) => setSplitSliderPos(Number(e.target.value))}
                className="flex-1 accent-orange-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <span className="text-red-400 font-bold">100% FLIR Infrared</span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <strong className="text-orange-400">Radiometric Field Notes:</strong> {selectedImage.notes}
            </p>
          </div>
        </div>

        {/* Image Radiometric Metadata */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-3">
              Radiometric Calibration
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">MAX HOTSPOT TEMP</span>
                <span className="font-bold text-red-400 text-sm">
                  {formatTemp(selectedImage.maxTempC)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">MIN BASELINE TEMP</span>
                <span className="font-bold text-blue-400 text-sm">
                  {formatTemp(selectedImage.minTempC)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">AVERAGE SCENE TEMP</span>
                <span className="font-bold text-amber-300 text-sm">
                  {formatTemp(selectedImage.avgTempC)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">EMISSIVITY (ε)</span>
                <span className="font-bold text-slate-200">{selectedImage.emissivity}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">REFLECTED TEMP</span>
                <span className="font-bold text-slate-200">
                  {formatTemp(selectedImage.reflectedTempC)}
                </span>
              </div>
            </div>

            {/* Tag List */}
            <div className="pt-2">
              <span className="text-[10px] font-mono text-slate-400 block mb-1.5 uppercase font-bold">
                Classification Tags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedImage.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Catalog Grid */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Radiometric Catalog Captures
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {thermalImages.map((img) => {
            const isSelected = img.id === selectedImage.id;
            return (
              <button
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500 text-white'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className={`h-24 w-full rounded mb-2 bg-gradient-to-tr ${img.thermalGradient} flex items-center justify-center`}>
                  <span className="text-xs font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-white">
                    {formatTemp(img.maxTempC)} Max
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white truncate">{img.title}</h4>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">{img.source}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
