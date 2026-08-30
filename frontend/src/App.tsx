import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { NavigationHeader } from './components/layout/NavigationHeader';
import { Sidebar } from './components/layout/Sidebar';
import { ScreenSwitcherModal } from './components/common/ScreenSwitcherModal';

// 13 Screen Components
import { TacticalCommandCenter } from './components/screens/TacticalCommandCenter';
import { SpatialIntelligence } from './components/screens/SpatialIntelligence';
import { ThermalIntelligenceFeed } from './components/screens/ThermalIntelligenceFeed';
import { ProfileSettings } from './components/screens/ProfileSettings';
import { DetailedAnalysis } from './components/screens/DetailedAnalysis';
import { ThermalMappingIntelligence } from './components/screens/ThermalMappingIntelligence';
import { AlertPreferences } from './components/screens/AlertPreferences';
import { EnvironmentalDeepDive } from './components/screens/EnvironmentalDeepDive';
import { RoutePlanning } from './components/screens/RoutePlanning';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { ThermalImageGallery } from './components/screens/ThermalImageGallery';
import { RouteSelectionModal } from './components/screens/RouteSelectionModal';
import { CoolestPathFinder } from './components/screens/CoolestPathFinder';

const MainScreenRouter: React.FC = () => {
  const { currentScreen } = useApp();

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'tactical-command-center':
        return <TacticalCommandCenter />;
      case 'spatial-intelligence':
        return <SpatialIntelligence />;
      case 'thermal-feed':
        return <ThermalIntelligenceFeed />;
      case 'profile-settings':
        return <ProfileSettings />;
      case 'detailed-analysis':
        return <DetailedAnalysis />;
      case 'thermal-mapping':
        return <ThermalMappingIntelligence />;
      case 'alert-preferences':
        return <AlertPreferences />;
      case 'environmental-deep-dive':
        return <EnvironmentalDeepDive />;
      case 'route-planning':
        return <RoutePlanning />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'thermal-gallery':
        return <ThermalImageGallery />;
      case 'route-selection-modal':
        return <RouteSelectionModal />;
      case 'coolest-path-finder':
        return <CoolestPathFinder />;
      default:
        return <TacticalCommandCenter />;
    }
  };

  return (
    <main
      id="heatiq-main-content"
      className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto"
    >
      {renderActiveScreen()}
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div id="heatiq-app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
        {/* Universal Top Header */}
        <NavigationHeader />

        {/* Layout with Sidebar & Active Screen View */}
        <div className="flex-1 flex flex-col md:flex-row">
          <Sidebar />
          <MainScreenRouter />
        </div>

        {/* 13-Screen Navigation Switcher Modal */}
        <ScreenSwitcherModal />
      </div>
    </AppProvider>
  );
}
