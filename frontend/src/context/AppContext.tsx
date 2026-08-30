import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ScreenId,
  ScreenMetadata,
  TransitionType,
  SensorNode,
  ThermalAlert,
  ThermalImageItem,
  RouteOption,
  UserProfile,
  AlertThresholdSettings,
} from '../types';
import { api } from '../services/api';

// ─── Screen registry (pure UI metadata, no sensor values) ────────────────────
export const ALL_SCREENS: ScreenMetadata[] = [
  {
    id: 'tactical-command-center',
    title: 'HeatIQ | Tactical Command Center Variant',
    shortLabel: 'Tactical Command',
    category: 'Command',
    description: 'Real-time urban microclimate operations, live sensor telemetry matrix, drone thermography feeds, and incident dispatch.',
    dataPaths: ['tactical', 'command', 'tactical-command-center'],
  },
  {
    id: 'spatial-intelligence',
    title: 'HeatIQ | Spatial Intelligence Variant',
    shortLabel: 'Spatial Intelligence',
    category: 'Spatial & Mapping',
    description: '3D GIS morphology, urban canopy density, surface albedo ratings, and building envelope thermal reflection indexes.',
    dataPaths: ['spatial', 'spatial-intelligence', 'gis'],
  },
  {
    id: 'thermal-feed',
    title: 'HeatIQ | Thermal Intelligence Feed',
    shortLabel: 'Thermal Feed',
    category: 'Analytics',
    description: 'Live radiometric event stream, thermal anomaly detections, delta-T spikes, and automated mitigation logs.',
    dataPaths: ['alerts', 'thermal-feed', 'feed', 'notifications'],
  },
  {
    id: 'profile-settings',
    title: 'HeatIQ | Profile Settings',
    shortLabel: 'Profile Settings',
    category: 'System',
    description: 'Operator authentication, tactical shift parameters, notification channels, radiometric palettes, and telemetry preferences.',
    dataPaths: ['settings', 'profile', 'profile-settings', 'config'],
  },
  {
    id: 'detailed-analysis',
    title: 'HeatIQ | Detailed Analysis',
    shortLabel: 'Detailed Analysis',
    category: 'Analytics',
    description: 'In-depth diurnal thermal curves, 30-day Urban Heat Island coefficient modeling, and vulnerability demographic correlations.',
    dataPaths: ['analytics', 'detailed-analysis', 'analysis', 'reports'],
  },
  {
    id: 'thermal-mapping',
    title: 'HeatIQ | Thermal Mapping Intelligence',
    shortLabel: 'Thermal Mapping',
    category: 'Spatial & Mapping',
    description: 'High-res radiometric GIS canvas with multi-palette thermal isolines, spot temperature probes, and area flux calculation.',
    dataPaths: ['thermal-mapping', 'map', 'mapping', 'cartography'],
  },
  {
    id: 'alert-preferences',
    title: 'HeatIQ | Alert Preferences',
    shortLabel: 'Alert Preferences',
    category: 'System',
    description: 'Custom trigger thresholds for WBGT, peak surface temp spikes, geofence radius, and automated misting station dispatches.',
    dataPaths: ['alert-preferences', 'thresholds', 'alert-config'],
  },
  {
    id: 'environmental-deep-dive',
    title: 'HeatIQ | Environmental Deep Dive',
    shortLabel: 'Environmental Deep Dive',
    category: 'Analytics',
    description: 'Atmospheric multi-sensor telemetry: solar irradiance (W/m²), NDVI canopy health, wind stagnation, and heat trapping.',
    dataPaths: ['dashboard', 'environmental', 'environmental-deep-dive', 'atmosphere'],
  },
  {
    id: 'route-planning',
    title: 'HeatIQ | Route Planning',
    shortLabel: 'Route Planning',
    category: 'Navigation',
    description: 'Heat-safe urban route computation, thermal radiation exposure calculator, hydration waypoint integration.',
    dataPaths: ['route-planning', 'routes', 'routing', 'navigation'],
  },
  {
    id: 'dashboard',
    title: 'HeatIQ Dashboard',
    shortLabel: 'Dashboard',
    category: 'Command',
    description: 'Executive citywide thermal health overview, active microclimate alerts, sensor grid uptime, and rapid drill-down links.',
    dataPaths: ['dashboard', 'main-dashboard', 'overview'],
  },
  {
    id: 'thermal-gallery',
    title: 'HeatIQ | Thermal Image Gallery',
    shortLabel: 'Thermal Gallery',
    category: 'Spatial & Mapping',
    description: 'Radiometric image archive from FLIR UAVs, facade heat loss audits, and split-screen RGB vs. Infrared inspector.',
    dataPaths: ['thermal-gallery', 'gallery', 'flir-archive', 'imagery'],
  },
  {
    id: 'route-selection-modal',
    title: 'HeatIQ | Route Selection Modal',
    shortLabel: 'Route Selection',
    category: 'Navigation',
    description: 'Comparative route selector modal evaluating Coolest Corridor vs. Fastest Direct vs. Canopy Greenway with thermal profiles.',
    dataPaths: ['route-selection-modal', 'modal-routes', 'compare-routes'],
  },
  {
    id: 'coolest-path-finder',
    title: 'HeatIQ | Coolest Path Finder',
    shortLabel: 'Coolest Path Finder',
    category: 'Navigation',
    description: 'Real-time shadow modeling engine, dynamic sun azimuth recalculation, and micro-cooling infrastructure routing.',
    dataPaths: ['coolest-path-finder', 'coolest-path', 'shade-routing'],
  },
];

// ─── UI-only default preferences (not sensor data) ───────────────────────────
const DEFAULT_USER_PROFILE: UserProfile = {
  callsign: 'THERMAL-OPS-01',
  operatorName: 'HeatIQ Operator',
  role: 'Thermal Safety Specialist',
  sector: 'Urban Heat Resilience Division',
  badgeNumber: 'HT-0001-OP',
  tempUnit: 'celsius',
  colorPalette: 'ironbow',
  refreshRateSec: 5,
  highContrastMode: true,
  soundAlerts: true,
  radioBroadcastSync: true,
  emailNotifications: true,
  smsDispatch: true,
  webhookUrl: '',
};

const DEFAULT_THRESHOLDS: AlertThresholdSettings = {
  criticalTempC: 40.0,
  warningTempC: 35.0,
  wbgtCritical: 32.0,
  deltaTTrigger15m: 3.0,
  solarIrradianceLimit: 900,
  autoDispatchCoolingMisters: true,
  autoDispatchEmergencyTeams: true,
  urbanHeatIslandIndexAlert: 4.5,
  geofenceRadiusKm: 15.0,
  quietHoursEnabled: false,
};

// ─── Context shape ────────────────────────────────────────────────────────────
interface AppContextType {
  currentScreen: ScreenId;
  screenHistory: ScreenId[];
  transition: TransitionType;
  navigateTo: (screen: ScreenId, transitionType?: TransitionType) => void;
  navigateBack: () => void;
  navigateToDataPath: (path: string) => void;

  // Data States (populated from backend)
  sensors: SensorNode[];
  alerts: ThermalAlert[];
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  setSelectedRoute: (route: RouteOption) => void;
  thermalImages: ThermalImageItem[];
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  thresholds: AlertThresholdSettings;
  updateThresholds: (settings: Partial<AlertThresholdSettings>) => void;

  // Alerts backend status
  alertsBackendStatus: { unsafe_locations: string[]; tracked_count: number; last_check: string | null; minutes_ago: number | null } | null;
  alertsBackendError: string | null;

  // Real-time & Simulation
  simulatedHour: number; // 0-23
  setSimulatedHour: (hour: number) => void;
  isLiveSimulating: boolean;
  setIsLiveSimulating: (active: boolean) => void;
  activeColorPalette: string;
  setActiveColorPalette: (palette: string) => void;

  // Helper Formatters
  formatTemp: (celsius: number) => string;
  dispatchAlertMitigation: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  triggerNewScan: () => void;

  // Modal toggles
  isScreenSwitcherOpen: boolean;
  setIsScreenSwitcherOpen: (open: boolean) => void;
  isQuickHelpOpen: boolean;
  setIsQuickHelpOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('tactical-command-center');
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>(['tactical-command-center']);
  const [transition, setTransition] = useState<TransitionType>('fade');

  // All sensor/alert/route/image data starts empty — populated from real backend
  const [sensors, setSensors] = useState<SensorNode[]>([]);
  const [alerts, setAlerts] = useState<ThermalAlert[]>([]);
  const [routes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [thermalImages] = useState<ThermalImageItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [thresholds, setThresholds] = useState<AlertThresholdSettings>(DEFAULT_THRESHOLDS);

  // Backend alerts/status polling state
  const [alertsBackendStatus, setAlertsBackendStatus] = useState<AppContextType['alertsBackendStatus']>(null);
  const [alertsBackendError, setAlertsBackendError] = useState<string | null>(null);

  const [simulatedHour, setSimulatedHour] = useState<number>(14);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);
  const [activeColorPalette, setActiveColorPalette] = useState<string>('ironbow');
  const [isScreenSwitcherOpen, setIsScreenSwitcherOpen] = useState<boolean>(false);
  const [isQuickHelpOpen, setIsQuickHelpOpen] = useState<boolean>(false);

  // Poll backend /alerts/status every 30 seconds for real unsafe location data
  const fetchAlertsStatus = useCallback(async () => {
    try {
      const data = await api.getAlertsStatus();
      setAlertsBackendStatus(data);
      setAlertsBackendError(null);
    } catch (err: any) {
      setAlertsBackendError(err?.message || 'Backend unavailable');
      setAlertsBackendStatus(null);
    }
  }, []);

  useEffect(() => {
    fetchAlertsStatus();
    const interval = setInterval(fetchAlertsStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlertsStatus]);

  const navigateTo = (screen: ScreenId, transitionType: TransitionType = 'push') => {
    setTransition(transitionType);
    setScreenHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateBack = () => {
    if (screenHistory.length > 1) {
      setTransition('push_back');
      const newHistory = [...screenHistory];
      newHistory.pop();
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previousScreen);
    } else {
      navigateTo('tactical-command-center', 'push_back');
    }
  };

  const navigateToDataPath = (path: string) => {
    const cleanPath = path.toLowerCase().trim();

    if (cleanPath === 'dashboard') {
      navigateTo('environmental-deep-dive', 'push_back');
    } else if (cleanPath === 'analytics') {
      navigateTo('detailed-analysis', 'push');
    } else if (cleanPath === 'alerts') {
      navigateTo('thermal-feed', 'push');
    } else if (cleanPath === 'settings') {
      navigateTo('profile-settings', 'push');
    } else if (cleanPath === 'tactical' || cleanPath === 'tactical-command-center') {
      navigateTo('tactical-command-center', 'push');
    } else if (cleanPath === 'spatial' || cleanPath === 'spatial-intelligence') {
      navigateTo('spatial-intelligence', 'push');
    } else if (cleanPath === 'mapping' || cleanPath === 'thermal-mapping') {
      navigateTo('thermal-mapping', 'push');
    } else if (cleanPath === 'routes' || cleanPath === 'route-planning') {
      navigateTo('route-planning', 'push');
    } else if (cleanPath === 'gallery' || cleanPath === 'thermal-gallery') {
      navigateTo('thermal-gallery', 'push');
    } else if (cleanPath === 'route-selection' || cleanPath === 'route-selection-modal') {
      navigateTo('route-selection-modal', 'modal');
    } else if (cleanPath === 'coolest-path' || cleanPath === 'coolest-path-finder') {
      navigateTo('coolest-path-finder', 'push');
    } else if (cleanPath === 'alert-preferences') {
      navigateTo('alert-preferences', 'push');
    } else if (cleanPath === 'overview' || cleanPath === 'main-dashboard') {
      navigateTo('dashboard', 'push');
    } else {
      const matched = ALL_SCREENS.find((s) => s.id === cleanPath || s.dataPaths.includes(cleanPath));
      if (matched) {
        navigateTo(matched.id, 'push');
      }
    }
  };

  const updateUserProfile = (patch: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...patch }));
    if (patch.colorPalette) {
      setActiveColorPalette(patch.colorPalette);
    }
  };

  const updateThresholds = (patch: Partial<AlertThresholdSettings>) => {
    setThresholds((prev) => ({ ...prev, ...patch }));
  };

  const formatTemp = (celsius: number): string => {
    if (userProfile.tempUnit === 'fahrenheit') {
      const f = (celsius * 9) / 5 + 32;
      return `${f.toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const dispatchAlertMitigation = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'mitigating' as const,
              recommendedAction: 'Dispatched autonomous misting array & urban cool-crew response.',
            }
          : a
      )
    );
  };

  const resolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'resolved' as const } : a))
    );
  };

  const triggerNewScan = () => {
    // Jitter sensors slightly for live telemetry feel if we have sensor data
    setSensors((prev) =>
      prev.map((s) => ({
        ...s,
        tempC: +(s.tempC + (Math.random() * 0.4 - 0.2)).toFixed(1),
        solarW: Math.min(1050, Math.max(100, s.solarW + Math.floor(Math.random() * 20 - 10))),
      }))
    );
  };

  // Background live telemetry pulse (only meaningful once sensors are loaded from backend)
  useEffect(() => {
    if (!isLiveSimulating) return;
    const interval = setInterval(() => {
      triggerNewScan();
    }, 4000);
    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        screenHistory,
        transition,
        navigateTo,
        navigateBack,
        navigateToDataPath,
        sensors,
        alerts,
        routes,
        selectedRoute,
        setSelectedRoute,
        thermalImages,
        userProfile,
        updateUserProfile,
        thresholds,
        updateThresholds,
        alertsBackendStatus,
        alertsBackendError,
        simulatedHour,
        setSimulatedHour,
        isLiveSimulating,
        setIsLiveSimulating,
        activeColorPalette,
        setActiveColorPalette,
        formatTemp,
        dispatchAlertMitigation,
        resolveAlert,
        triggerNewScan,
        isScreenSwitcherOpen,
        setIsScreenSwitcherOpen,
        isQuickHelpOpen,
        setIsQuickHelpOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
