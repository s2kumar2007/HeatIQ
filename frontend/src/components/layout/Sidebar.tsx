import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  BarChart3,
  Flame,
  Settings,
  Compass,
  MapPin,
  Camera,
  Layers,
  ThermometerSnowflake,
  Wind,
  Navigation,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  Radio,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentScreen, navigateTo, navigateToDataPath, alerts } = useApp();

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  const navLinks = [
    {
      dataPath: 'tactical',
      screenId: 'tactical-command-center',
      label: 'Tactical Command',
      icon: Flame,
      category: 'Command Core',
      badge: 'LIVE',
      badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    {
      dataPath: 'dashboard',
      screenId: 'environmental-deep-dive',
      label: 'Environmental Deep Dive',
      icon: Wind,
      category: 'Command Core',
      note: 'Atmospheric Telemetry',
    },
    {
      dataPath: 'overview',
      screenId: 'dashboard',
      label: 'Executive Dashboard',
      icon: Globe,
      category: 'Command Core',
    },
    {
      dataPath: 'spatial',
      screenId: 'spatial-intelligence',
      label: 'Spatial Intelligence',
      icon: Layers,
      category: 'GIS & Cartography',
    },
    {
      dataPath: 'mapping',
      screenId: 'thermal-mapping',
      label: 'Thermal Mapping',
      icon: MapPin,
      category: 'GIS & Cartography',
    },
    {
      dataPath: 'gallery',
      screenId: 'thermal-gallery',
      label: 'FLIR Imagery Gallery',
      icon: Camera,
      category: 'GIS & Cartography',
    },
    {
      dataPath: 'analytics',
      screenId: 'detailed-analysis',
      label: 'Detailed Analysis',
      icon: BarChart3,
      category: 'Analytics & Risk',
    },
    {
      dataPath: 'alerts',
      screenId: 'thermal-feed',
      label: 'Thermal Threat Feed',
      icon: ShieldAlert,
      category: 'Analytics & Risk',
      badge: activeAlertCount > 0 ? `${activeAlertCount} Active` : undefined,
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    {
      dataPath: 'routes',
      screenId: 'route-planning',
      label: 'Route Planning',
      icon: Navigation,
      category: 'Heat-Safe Routing',
    },
    {
      dataPath: 'route-selection',
      screenId: 'route-selection-modal',
      label: 'Route Selection Modal',
      icon: Compass,
      category: 'Heat-Safe Routing',
    },
    {
      dataPath: 'coolest-path',
      screenId: 'coolest-path-finder',
      label: 'Coolest Path Finder',
      icon: ThermometerSnowflake,
      category: 'Heat-Safe Routing',
      badge: 'Shadow AI',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      dataPath: 'settings',
      screenId: 'profile-settings',
      label: 'Profile Settings',
      icon: Settings,
      category: 'Configuration',
    },
    {
      dataPath: 'alert-preferences',
      screenId: 'alert-preferences',
      label: 'Alert Preferences',
      icon: SlidersHorizontal,
      category: 'Configuration',
    },
  ];

  // Group links by category
  const categories = Array.from(new Set(navLinks.map((l) => l.category)));

  return (
    <aside
      id="heatiq-sidebar"
      aria-label="HeatIQ Main Navigation Sidebar"
      className="w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-3"
    >
      {/* Tactical Status Pill */}
      <div className="mb-4 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-[11px] font-mono">
            <div className="text-slate-200 font-bold">GRID LINK STABLE</div>
            <div className="text-slate-400">Telemetry: 99.8% nominal</div>
          </div>
        </div>
        <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
        {categories.map((category) => {
          const categoryLinks = navLinks.filter((l) => l.category === category);
          return (
            <div key={category} className="space-y-1">
              <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                {category}
              </div>
              <div className="space-y-0.5">
                {categoryLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.screenId;
                  return (
                    <a
                      key={item.dataPath}
                      id={`nav-link-${item.dataPath}`}
                      data-path={item.dataPath}
                      href={`#${item.dataPath}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (item.dataPath === 'dashboard') {
                          navigateTo('environmental-deep-dive', 'push_back');
                        } else if (item.dataPath === 'analytics') {
                          navigateTo('detailed-analysis', 'push');
                        } else if (item.dataPath === 'alerts') {
                          navigateTo('thermal-feed', 'push');
                        } else if (item.dataPath === 'settings') {
                          navigateTo('profile-settings', 'push');
                        } else {
                          navigateTo(item.screenId as any, 'push');
                        }
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Operator Info */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center justify-between text-slate-300">
          <span>OPERATOR:</span>
          <span className="text-orange-400 font-bold">ALPHA-LEAD</span>
        </div>
        <div className="text-[10px] text-slate-400 truncate mt-0.5">SEC-METRO-HEAT-01</div>
      </div>
    </aside>
  );
};
