import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Navigation,
  MapPin,
  Compass,
  ThermometerSnowflake,
  Flame,
  Clock,
  Droplets,
  Layers,
  ArrowRight,
  ShieldCheck,
  Footprints,
  Bike,
  Ambulance,
} from 'lucide-react';

export const RoutePlanning: React.FC = () => {
  const { routes, selectedRoute, setSelectedRoute, formatTemp, navigateTo } = useApp();
  const [origin, setOrigin] = useState('Grand Central Market, Downtown');
  const [destination, setDestination] = useState('Metropolitan Botanical Gate, West Park');
  const [transportMode, setTransportMode] = useState<'walk' | 'bike' | 'dispatch'>('walk');

  return (
    <div id="screen-route-planning" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              SCREEN #9 • NAVIGATION
            </span>
            <span className="text-slate-400 text-xs font-mono">HEAT-SAFE ROUTING ENGINE</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Route Planning
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Pedestrian &amp; dispatch route calculation minimizing solar radiation load, utilizing shaded tree canopies and mist arches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('route-selection-modal', 'modal')}
            data-path="route-selection"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>Route Selection Modal →</span>
          </button>
          <button
            onClick={() => navigateTo('coolest-path-finder', 'push')}
            data-path="coolest-path"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer"
          >
            <ThermometerSnowflake className="w-3.5 h-3.5" />
            <span>Coolest Path Finder →</span>
          </button>
        </div>
      </div>

      {/* Input Parameters & Mode Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Navigation className="w-4 h-4 text-orange-400" />
            Origin &amp; Destination Points
          </h2>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">ORIGIN POINT</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">DESTINATION POINT</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-red-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Travel Mode */}
            <div className="pt-2">
              <label className="text-slate-400 block mb-1.5">TRAVEL DISPATCH MODE</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTransportMode('walk')}
                  className={`py-2 rounded flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    transportMode === 'walk'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Footprints className="w-4 h-4" />
                  <span className="text-[10px]">Pedestrian</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('bike')}
                  className={`py-2 rounded flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    transportMode === 'bike'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span className="text-[10px]">Micro-Mobility</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('dispatch')}
                  className={`py-2 rounded flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    transportMode === 'dispatch'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Ambulance className="w-4 h-4" />
                  <span className="text-[10px]">Emergency Unit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Available Heat-Safe Route Profiles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ThermometerSnowflake className="w-4 h-4 text-emerald-400" />
                Calculated Route Profiles &amp; Solar Shielding
              </h2>
              <button
                onClick={() => navigateTo('route-selection-modal', 'modal')}
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
              >
                Compare Side-by-Side Modal →
              </button>
            </div>

            <div className="space-y-3">
              {routes.map((route) => {
                const isSelected = selectedRoute.id === route.id;
                const isCoolest = route.id === 'route-coolest';

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-950/40 border-orange-500 ring-1 ring-orange-500 text-white'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: route.color }}
                          />
                          <h3 className="text-sm font-bold text-white">{route.name}</h3>
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5 block">{route.description}</span>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                          isCoolest
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : route.id === 'route-fastest'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        }`}
                      >
                        {route.badge}
                      </span>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">AVG TEMP</span>
                        <span className="font-bold text-emerald-400">{formatTemp(route.avgTempC)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">SHADE COVER</span>
                        <span className="font-bold text-white">{route.shadePercentage}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">DISTANCE</span>
                        <span className="font-bold text-slate-200">{route.distanceKm} km ({route.durationMin}m)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">MISTERS</span>
                        <span className="font-bold text-cyan-400">{route.mistingStations} Arches</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
