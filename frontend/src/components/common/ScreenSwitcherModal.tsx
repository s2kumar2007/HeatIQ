import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ALL_SCREENS } from '../../context/AppContext';
import { ScreenId } from '../../types';
import {
  X,
  Search,
  Layers,
  ArrowRight,
  Shield,
  Activity,
  Compass,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const ScreenSwitcherModal: React.FC = () => {
  const { isScreenSwitcherOpen, setIsScreenSwitcherOpen, currentScreen, navigateTo } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isScreenSwitcherOpen) return null;

  const filteredScreens = ALL_SCREENS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shortLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['Command', 'Spatial & Mapping', 'Analytics', 'Navigation', 'System'] as const;

  return (
    <div
      id="screen-switcher-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={() => setIsScreenSwitcherOpen(false)}
    >
      <div
        id="screen-switcher-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                HeatIQ System Navigation Matrix
                <span className="text-xs font-mono font-normal text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  13 Prototype Screens
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Directly explore and test all tactical screens, variants, and modals.
              </p>
            </div>
          </div>
          <button
            id="close-screen-switcher-btn"
            onClick={() => setIsScreenSwitcherOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="screen-search-input"
              type="text"
              placeholder="Search screens by name, purpose, category, or data-path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Screens Grid By Category */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {categories.map((cat) => {
            const screensInCat = filteredScreens.filter((s) => s.category === cat);
            if (screensInCat.length === 0) return null;

            return (
              <div key={cat} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                  <span>{cat}</span>
                  <span className="text-slate-500 font-normal">({screensInCat.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {screensInCat.map((screen) => {
                    const isActive = currentScreen === screen.id;
                    return (
                      <button
                        key={screen.id}
                        id={`switch-to-${screen.id}`}
                        data-screen-target={screen.id}
                        data-path={screen.dataPaths[0]}
                        onClick={() => {
                          navigateTo(screen.id, 'fade');
                          setIsScreenSwitcherOpen(false);
                        }}
                        className={`text-left p-3.5 rounded-lg border transition-all flex flex-col justify-between group cursor-pointer ${
                          isActive
                            ? 'bg-orange-950/40 border-orange-500 text-white ring-1 ring-orange-500'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-orange-400">
                              #{ALL_SCREENS.findIndex((s) => s.id === screen.id) + 1}
                            </span>
                            <h3 className="text-sm font-semibold text-white group-hover:text-orange-300">
                              {screen.title}
                            </h3>
                          </div>
                          {isActive && (
                            <span className="text-[10px] bg-orange-500 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {screen.description}
                        </p>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                          <div className="flex gap-1.5 flex-wrap">
                            {screen.dataPaths.slice(0, 2).map((dp) => (
                              <span key={dp} className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                                @data-path='{dp}'
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1 text-orange-400 font-semibold group-hover:translate-x-1 transition-transform">
                            <span>Open View</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>HeatIQ Command Navigation Protocol</span>
          <button
            onClick={() => setIsScreenSwitcherOpen(false)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
