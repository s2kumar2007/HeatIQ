export type ScreenId =
  | 'tactical-command-center' // Screen 1: HeatIQ | Tactical Command Center Variant (Initial Screen)
  | 'spatial-intelligence'    // Screen 2: HeatIQ | Spatial Intelligence Variant
  | 'thermal-feed'            // Screen 3: HeatIQ | Thermal Intelligence Feed
  | 'profile-settings'        // Screen 4: HeatIQ | Profile Settings
  | 'detailed-analysis'       // Screen 5: HeatIQ | Detailed Analysis
  | 'thermal-mapping'         // Screen 6: HeatIQ | Thermal Mapping Intelligence
  | 'alert-preferences'       // Screen 7: HeatIQ | Alert Preferences
  | 'environmental-deep-dive' // Screen 8: HeatIQ | Environmental Deep Dive
  | 'route-planning'          // Screen 9: HeatIQ | Route Planning
  | 'dashboard'               // Screen 10: HeatIQ Dashboard
  | 'thermal-gallery'         // Screen 11: HeatIQ | Thermal Image Gallery
  | 'route-selection-modal'   // Screen 12: HeatIQ | Route Selection Modal
  | 'coolest-path-finder';    // Screen 13: HeatIQ | Coolest Path Finder

export type TransitionType = 'push' | 'push_back' | 'modal' | 'fade' | 'slide_up';

export interface ScreenMetadata {
  id: ScreenId;
  title: string;
  shortLabel: string;
  category: 'Command' | 'Spatial & Mapping' | 'Analytics' | 'Navigation' | 'System';
  description: string;
  dataPaths: string[];
}

export interface SensorNode {
  id: string;
  name: string;
  zone: string;
  tempC: number;
  humidity: number;
  wbgt: number;
  solarW: number;
  status: 'nominal' | 'elevated' | 'critical' | 'offline';
  trend: 'up' | 'down' | 'stable';
  lat: number;
  lng: number;
  canopyCover: number;
  albedo: number;
}

export interface ThermalAlert {
  id: string;
  timestamp: string;
  zone: string;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  tempC: number;
  deltaT: number;
  cause: string;
  status: 'active' | 'mitigating' | 'resolved';
  recommendedAction: string;
  sectorId: string;
  coordinates: [number, number];
}

export interface ThermalImageItem {
  id: string;
  title: string;
  source: 'FLIR T1020 UAV' | 'Orbital Multispectral' | 'Street Radiometric Scan' | 'Facade Inspector Drone';
  timestamp: string;
  location: string;
  minTempC: number;
  maxTempC: number;
  avgTempC: number;
  emissivity: number;
  reflectedTempC: number;
  tags: string[];
  rgbGradient: string;
  thermalGradient: string;
  notes: string;
}

export interface RouteOption {
  id: string;
  name: string;
  badge: string;
  distanceKm: number;
  durationMin: number;
  avgTempC: number;
  maxExposureTempC: number;
  shadePercentage: number;
  uvIndex: number;
  heatStressScore: number; // 0-100 (lower is cooler)
  hydrationStops: number;
  mistingStations: number;
  treeCanopyRating: 'High' | 'Moderate' | 'Low';
  description: string;
  color: string;
  waypoints: {
    name: string;
    tempC: number;
    shade: number;
    hazardLevel: 'low' | 'moderate' | 'high';
  }[];
}

export interface UserProfile {
  callsign: string;
  operatorName: string;
  role: string;
  sector: string;
  badgeNumber: string;
  tempUnit: 'celsius' | 'fahrenheit';
  colorPalette: 'ironbow' | 'inferno' | 'turbo' | 'rainbow' | 'whiteHot' | 'blackHot';
  refreshRateSec: number;
  highContrastMode: boolean;
  soundAlerts: boolean;
  radioBroadcastSync: boolean;
  emailNotifications: boolean;
  smsDispatch: boolean;
  webhookUrl: string;
}

export interface AlertThresholdSettings {
  criticalTempC: number;
  warningTempC: number;
  wbgtCritical: number;
  deltaTTrigger15m: number;
  solarIrradianceLimit: number;
  autoDispatchCoolingMisters: boolean;
  autoDispatchEmergencyTeams: boolean;
  urbanHeatIslandIndexAlert: number;
  geofenceRadiusKm: number;
  quietHoursEnabled: boolean;
}
