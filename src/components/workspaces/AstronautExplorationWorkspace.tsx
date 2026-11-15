import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Target,
  Compass,
  Layers,
  ShieldAlert,
  Activity,
  Footprints,
  Sun,
  FileText
} from 'lucide-react';
import {
  AstronautExplorationProvider,
  useAstronautExploration,
  AstronautSubmodule
} from '../../context/AstronautExplorationContext';
import { useWorkspace, WorkspaceId } from '../../context/WorkspaceContext';

import { SurfaceMissionDashboard } from '../astronaut/SurfaceMissionDashboard';
import { MissionSciencePlanner } from '../astronaut/MissionSciencePlanner';
import { MarsSurfaceExplorer } from '../astronaut/MarsSurfaceExplorer';
import { MultilayerScientificMap } from '../astronaut/MultilayerScientificMap';
import { AstronautSafetyMonitoring } from '../astronaut/AstronautSafetyMonitoring';
import { GeologicalTargetExplorer } from '../astronaut/GeologicalTargetExplorer';
import { SuitMobilityAnalysis } from '../astronaut/SuitMobilityAnalysis';
import { AstronautRoutePlanner } from '../astronaut/AstronautRoutePlanner';
import { RadiationSpaceWeather } from '../astronaut/RadiationSpaceWeather';
import FieldNotebook from '../FieldNotebook';

interface SubmoduleTab {
  id: AstronautSubmodule;
  label: string;
  icon: React.ReactNode;
}

const SUBMODULE_TABS: SubmoduleTab[] = [
  { id: 'surface-dashboard', label: '1. Surface Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'science-planner', label: '2. Science Planner', icon: <Target className="w-3.5 h-3.5" /> },
  { id: 'surface-explorer', label: '3. Surface Explorer', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'multilayer-map', label: '4. Multilayer Map', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'safety-monitoring', label: '5. Safety & Environment', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { id: 'geological-targets', label: '6. Geological Targets', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'suit-mobility', label: '7. Suit Mobility', icon: <Footprints className="w-3.5 h-3.5" /> },
  { id: 'astronaut-route-planner', label: '8. Route Planner', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'radiation-monitor', label: '9. Radiation Monitor', icon: <Sun className="w-3.5 h-3.5" /> },
  { id: 'mission-notebook', label: '10. Field Notebook', icon: <FileText className="w-3.5 h-3.5" /> }
];

const VALID_ASTRONAUT_SUBMODULES: AstronautSubmodule[] = [
  'surface-dashboard',
  'science-planner',
  'surface-explorer',
  'multilayer-map',
  'safety-monitoring',
  'geological-targets',
  'suit-mobility',
  'astronaut-route-planner',
  'radiation-monitor',
  'mission-notebook'
];

const AstronautExplorationInner: React.FC = () => {
  const { activeSubmodule, setActiveSubmodule } = useAstronautExploration();
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();

  // Sync sidebar workspace selection with inner submodule state
  useEffect(() => {
    if (activeWorkspace === 'astronaut-exploration') {
      // Keep current activeSubmodule or default
      return;
    }
    if (VALID_ASTRONAUT_SUBMODULES.includes(activeWorkspace as AstronautSubmodule)) {
      setActiveSubmodule(activeWorkspace as AstronautSubmodule);
    }
  }, [activeWorkspace, setActiveSubmodule]);

  const handleTabSelect = (id: AstronautSubmodule) => {
    setActiveSubmodule(id);
    setActiveWorkspace(id as WorkspaceId);
  };

  const renderActiveSubmodule = () => {
    switch (activeSubmodule) {
      case 'surface-dashboard':
        return <SurfaceMissionDashboard />;
      case 'science-planner':
        return <MissionSciencePlanner />;
      case 'surface-explorer':
        return <MarsSurfaceExplorer />;
      case 'multilayer-map':
        return <MultilayerScientificMap />;
      case 'safety-monitoring':
        return <AstronautSafetyMonitoring />;
      case 'geological-targets':
        return <GeologicalTargetExplorer />;
      case 'suit-mobility':
        return <SuitMobilityAnalysis />;
      case 'astronaut-route-planner':
        return <AstronautRoutePlanner />;
      case 'radiation-monitor':
        return <RadiationSpaceWeather />;
      case 'mission-notebook':
        return <FieldNotebook />;
      default:
        return <SurfaceMissionDashboard />;
    }
  };

  return (
    <div
      data-active-workspace={activeSubmodule}
      className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full space-y-6"
    >
      {/* Top 10 Submodules Navigation Ribbon */}
      <div className="bg-[#080B14] border border-slate-800/80 rounded-2xl p-2 shadow-2xl overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {SUBMODULE_TABS.map((tab) => {
            const isActive = activeSubmodule === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600/30 to-amber-600/20 text-orange-300 border border-orange-500/50 shadow-md shadow-orange-950/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submodule Viewport */}
      {renderActiveSubmodule()}
    </div>
  );
};

export const AstronautExplorationWorkspace: React.FC = () => {
  return <AstronautExplorationInner />;
};

export default AstronautExplorationWorkspace;
