import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Thermometer,
  Layers,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MapPin,
  Flame,
  Shield,
  Wind,
  Droplets,
  TreeDeciduous,
} from 'lucide-react';

interface ThermalMapCanvasProps {
  interactive?: boolean;
  heightClass?: string;
  showOverlayLayers?: boolean;
  highlightRoute?: boolean;
  onSelectSensor?: (sensorId: string) => void;
}

export const ThermalMapCanvas: React.FC<ThermalMapCanvasProps> = ({
  interactive = true,
  heightClass = 'h-96',
  showOverlayLayers = true,
  highlightRoute = false,
  onSelectSensor,
}) => {
  const { sensors, formatTemp, activeColorPalette, simulatedHour, navigateTo } = useApp();
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; temp: number; name: string } | null>(null);
  const [activeLayers, setActiveLayers] = useState({
    thermal: true,
    canopy: true,
    misters: true,
    sensors: true,
    isolines: true,
  });

  // Calculate simulated thermal intensity shift based on solar azimuth
  const solarFactor = Math.sin(((simulatedHour - 6) / 14) * Math.PI);
  const baseOffset = (solarFactor - 0.5) * 6; // up to +3°C peak at 13-14:00

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const getPaletteGradient = () => {
    switch (activeColorPalette) {
      case 'inferno':
        return 'url(#infernoGrad)';
      case 'turbo':
        return 'url(#turboGrad)';
      case 'rainbow':
        return 'url(#rainbowGrad)';
      case 'whiteHot':
        return 'url(#whiteHotGrad)';
      case 'blackHot':
        return 'url(#blackHotGrad)';
      case 'ironbow':
      default:
        return 'url(#ironbowGrad)';
    }
  };

  return (
    <div className={`relative w-full ${heightClass} bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex flex-col`}>
      {/* Top Map HUD Controls */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 flex-wrap">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg">
          <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
          <span>FLIR Radiometric GIS Feed</span>
          <span className="text-orange-400 font-bold">FOV: 1.4km²</span>
        </div>

        {showOverlayLayers && (
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-md text-[11px] shadow-lg">
            <button
              onClick={() => toggleLayer('thermal')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeLayers.thermal ? 'bg-orange-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IR Heatmap
            </button>
            <button
              onClick={() => toggleLayer('canopy')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeLayers.canopy ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tree Canopy
            </button>
            <button
              onClick={() => toggleLayer('misters')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeLayers.misters ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Misting Arches
            </button>
            <button
              onClick={() => toggleLayer('isolines')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeLayers.isolines ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Isotherms
            </button>
          </div>
        )}
      </div>

      {/* Radiometric Scale Legend (Right) */}
      <div className="absolute top-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-lg text-[10px] font-mono shadow-xl flex flex-col items-center gap-1.5 text-slate-300">
        <span className="font-bold text-red-400">{formatTemp(48.0 + baseOffset)}</span>
        <div
          className="w-3.5 h-32 rounded border border-slate-700 shadow-inner"
          style={{
            background:
              activeColorPalette === 'inferno'
                ? 'linear-gradient(to bottom, #fcffa4, #f98e09, #bc3754, #57106e, #000004)'
                : activeColorPalette === 'whiteHot'
                ? 'linear-gradient(to bottom, #ffffff, #888888, #000000)'
                : activeColorPalette === 'blackHot'
                ? 'linear-gradient(to bottom, #000000, #888888, #ffffff)'
                : 'linear-gradient(to bottom, #fde047, #f97316, #dc2626, #7c3aed, #1e1b4b)',
          }}
        />
        <span className="font-bold text-cyan-400">{formatTemp(24.0 + baseOffset)}</span>
        <span className="text-[9px] text-slate-400 uppercase">Scale IR</span>
      </div>

      {/* SVG Canvas Map Surface */}
      <div className="relative flex-1 w-full h-full cursor-crosshair">
        <svg
          className="w-full h-full"
          viewBox="0 0 800 450"
          preserveAspectRatio="xMidYMid slice"
          onMouseMove={(e) => {
            if (!interactive) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 800;
            const y = ((e.clientY - rect.top) / rect.height) * 450;
            // Simulated temperature calculation based on position
            const distFromHotspot1 = Math.hypot(x - 300, y - 220);
            const distFromHotspot2 = Math.hypot(x - 620, y - 140);
            const distFromPark = Math.hypot(x - 180, y - 320);

            const temp =
              32 +
              Math.max(0, 16 - distFromHotspot1 * 0.08) +
              Math.max(0, 14 - distFromHotspot2 * 0.07) -
              Math.max(0, 8 - distFromPark * 0.06) +
              baseOffset;

            setHoveredPoint({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              temp: Number(temp.toFixed(1)),
              name: distFromPark < 80 ? 'Grand Park Canopy' : distFromHotspot1 < 90 ? 'Industrial Blacktop' : 'Urban Corridor',
            });
          }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {/* Gradients */}
            <radialGradient id="hotspot1" cx="38%" cy="48%" r="45%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
            </radialGradient>

            <radialGradient id="hotspot2" cx="78%" cy="32%" r="35%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.05" />
            </radialGradient>

            <radialGradient id="coolPark" cx="22%" cy="72%" r="30%">
              <stop offset="0%" stopColor="#065f46" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#047857" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
            </radialGradient>

            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,2" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="800" height="450" fill="#090d16" />
          <rect width="800" height="450" fill="url(#grid)" />

          {/* Street Road Grid Outlines */}
          <g stroke="#1e293b" strokeWidth="6" strokeLinecap="round" opacity="0.7">
            <line x1="60" y1="90" x2="740" y2="90" />
            <line x1="40" y1="210" x2="760" y2="210" />
            <line x1="80" y1="340" x2="720" y2="340" />
            <line x1="180" y1="40" x2="180" y2="410" />
            <line x1="380" y1="30" x2="380" y2="420" />
            <line x1="580" y1="40" x2="580" y2="410" />
            <path d="M 120 380 Q 400 280 680 370" fill="none" stroke="#334155" strokeWidth="8" />
          </g>

          {/* Building Footprint Polygons */}
          <g fill="#131b2e" stroke="#334155" strokeWidth="1">
            <rect x="220" y="115" width="60" height="70" rx="3" />
            <rect x="295" y="115" width="50" height="70" rx="3" />
            <rect x="220" y="235" width="125" height="80" rx="3" fill="#1c1917" stroke="#ef4444" strokeWidth="1.5" />
            <rect x="415" y="115" width="130" height="70" rx="3" />
            <rect x="415" y="235" width="55" height="80" rx="3" />
            <rect x="485" y="235" width="60" height="80" rx="3" />
            <rect x="615" y="115" width="110" height="120" rx="3" fill="#261214" stroke="#dc2626" strokeWidth="1.5" />
          </g>

          {/* Thermal Layer Overlays */}
          {activeLayers.thermal && (
            <g>
              <circle cx="300" cy="220" r="180" fill="url(#hotspot1)" />
              <circle cx="620" cy="140" r="140" fill="url(#hotspot2)" />
              <circle cx="180" cy="320" r="130" fill="url(#coolPark)" />
            </g>
          )}

          {/* Isotherm Countour Lines */}
          {activeLayers.isolines && (
            <g fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity="0.6">
              <ellipse cx="300" cy="220" rx="140" ry="110" />
              <ellipse cx="300" cy="220" rx="90" ry="70" stroke="#ef4444" strokeWidth="1.2" />
              <ellipse cx="300" cy="220" rx="40" ry="30" stroke="#f43f5e" strokeWidth="1.5" />
              <ellipse cx="620" cy="140" rx="100" ry="80" stroke="#ef4444" />
              <ellipse cx="180" cy="320" rx="100" ry="80" stroke="#10b981" />
            </g>
          )}

          {/* Tree Canopy Cover Polygon */}
          {activeLayers.canopy && (
            <g fill="#059669" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5">
              <path d="M 100 280 Q 150 240 220 260 Q 260 300 240 370 Q 170 390 120 360 Z" />
              <circle cx="390" cy="170" r="18" />
              <circle cx="430" cy="180" r="15" />
              <circle cx="560" cy="300" r="22" />
            </g>
          )}

          {/* Cooling Misting Arches */}
          {activeLayers.misters && (
            <g>
              <g transform="translate(180, 290)">
                <circle cx="0" cy="0" r="12" fill="#0284c7" fillOpacity="0.3" className="animate-ping" />
                <circle cx="0" cy="0" r="6" fill="#38bdf8" />
              </g>
              <g transform="translate(380, 210)">
                <circle cx="0" cy="0" r="12" fill="#0284c7" fillOpacity="0.3" className="animate-ping" />
                <circle cx="0" cy="0" r="6" fill="#38bdf8" />
              </g>
            </g>
          )}

          {/* Coolest Corridor Highlighted Route */}
          {highlightRoute && (
            <g>
              {/* Shaded Coolest Corridor Route Line */}
              <path
                d="M 120 90 L 180 90 L 180 340 L 400 340 L 580 340 L 580 210"
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeDasharray="6,3"
              />
              {/* Waypoint circles */}
              <circle cx="120" cy="90" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <circle cx="180" cy="220" r="5" fill="#34d399" />
              <circle cx="180" cy="340" r="6" fill="#34d399" />
              <circle cx="580" cy="210" r="7" fill="#059669" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* Sensor Nodes Pins */}
          {activeLayers.sensors &&
            sensors.map((s, idx) => {
              // Projected coords for representation
              const cx = 140 + idx * 105;
              const cy = 120 + (idx % 3) * 110;
              const isCrit = s.status === 'critical';
              const isNom = s.status === 'nominal';

              return (
                <g
                  key={s.id}
                  transform={`translate(${cx}, ${cy})`}
                  className="cursor-pointer group"
                  onClick={() => onSelectSensor?.(s.id)}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r={isCrit ? 14 : 9}
                    fill={isCrit ? '#ef4444' : isNom ? '#10b981' : '#f59e0b'}
                    fillOpacity="0.3"
                    className={isCrit ? 'animate-ping' : ''}
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="5"
                    fill={isCrit ? '#ef4444' : isNom ? '#10b981' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x="8"
                    y="3"
                    fill="#f1f5f9"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {s.id} ({formatTemp(s.tempC)})
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Hover Crosshair Probe Indicator */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 bg-slate-900/95 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono -translate-x-1/2 -translate-y-12 backdrop-blur-md"
            style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
          >
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-bold text-amber-300">{formatTemp(hoveredPoint.temp)}</span>
              <span className="text-slate-400 text-[10px]">({hoveredPoint.name})</span>
            </div>
            <div className="text-[9px] text-slate-400">Radiometric FLIR Spot: Lat 34.05° N</div>
          </div>
        )}
      </div>

      {/* Bottom Map Status Bar */}
      <div className="p-2.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            FLIR Sensor Link: Active
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-400">Radiance: 98.4% SNR</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('thermal-mapping', 'push')}
            data-path="mapping"
            className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
          >
            Open Full GIS Mapping Suite →
          </button>
        </div>
      </div>
    </div>
  );
};
