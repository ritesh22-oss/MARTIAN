import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace, WorkspaceId } from './context/WorkspaceContext';
import BootScreen from './components/BootScreen';
import AppSidebar from './components/shell/AppSidebar';
import AppTopBar from './components/shell/AppTopBar';
import AppInspector from './components/shell/AppInspector';
import CommandPalette from './components/shell/CommandPalette';

// Workspaces
import OverviewWorkspace from './components/workspaces/OverviewWorkspace';
import Explorer3DWorkspace from './components/workspaces/Explorer3DWorkspace';
import { LiveMissionDataWorkspace } from './components/workspaces/LiveMissionDataWorkspace';
import MissionDataWorkspace from './components/workspaces/MissionDataWorkspace';
import ConfigurationWorkspace from './components/workspaces/ConfigurationWorkspace';
import RiskAssessmentWorkspace from './components/workspaces/RiskAssessmentWorkspace';
import ModelEvaluationWorkspace from './components/workspaces/ModelEvaluationWorkspace';
import AnalysisReportsWorkspace from './components/workspaces/AnalysisReportsWorkspace';
import OrbitTerminalWorkspace from './components/workspaces/OrbitTerminalWorkspace';
import SettingsWorkspace from './components/workspaces/SettingsWorkspace';

// Analysis & Navigation Tools
import TerrainAnalysis from './components/TerrainAnalysis';
import DatasetCatalogue from './components/DatasetCatalogue';
import HazardAnalysisLab from './components/HazardAnalysisLab';
import RoutePlanner from './components/RoutePlanner';
import RouteLaboratory from './components/RouteLaboratory';
import ScenarioTestingLab from './components/ScenarioTestingLab';
import ValidationTestHarness from './components/ValidationTestHarness';

// Modals & Floating Assistants
import SavedMissionsModal from './components/SavedMissionsModal';
import MarsNavGuide from './components/MarsNavGuide';
import OrbitChat from './components/OrbitChat';

function WorkstationMain() {
  const { activeWorkspace, setActiveWorkspace, inspectorOpen } = useWorkspace();
  const [missionsModalOpen, setMissionsModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Render the dedicated engineering tool workspace
  const renderWorkspace = () => {
    switch (activeWorkspace) {
      case 'overview':
        return <OverviewWorkspace />;
      case 'explorer-3d':
        return <Explorer3DWorkspace onOpenMissions={() => setMissionsModalOpen(true)} />;
      case 'live-mission-data':
        return <LiveMissionDataWorkspace />;
      case 'mission-data':
        return <MissionDataWorkspace />;
      case 'configuration':
        return <ConfigurationWorkspace />;
      case 'terrain-intelligence':
        return (
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <TerrainAnalysis />
          </div>
        );
      case 'dataset-catalogue':
        return (
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <DatasetCatalogue />
          </div>
        );
      case 'hazard-analysis':
        return (
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <HazardAnalysisLab />
          </div>
        );
      case 'risk-assessment':
        return <RiskAssessmentWorkspace />;
      case 'route-lab':
        return (
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <RoutePlanner onOpenMissions={() => setMissionsModalOpen(true)} />
          </div>
        );
      case 'route-comparison':
        return (
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <RouteLaboratory />
          </div>
        );
      case 'scenario-testing':
        return (
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <ScenarioTestingLab />
          </div>
        );
      case 'validation-harness':
        return (
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <ValidationTestHarness />
          </div>
        );
      case 'model-eval':
        return <ModelEvaluationWorkspace />;
      case 'audit':
        return <AnalysisReportsWorkspace />;
      case 'guide':
        return (
          <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center py-20 space-y-4">
            <h2 className="text-xl font-bold text-white font-sans">MARSNAV Interactive Guide & Operating Manual</h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Open the comprehensive mission guide to explore walkthroughs, key feature tutorials, and operational documentation.
            </p>
            <button
              onClick={() => setGuideModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs tracking-wide cursor-pointer transition-colors"
            >
              Open Interactive Guide
            </button>
          </div>
        );
      case 'orbit-terminal':
        return <OrbitTerminalWorkspace />;
      case 'settings':
        return <SettingsWorkspace />;
      default:
        return <OverviewWorkspace />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#05070E] text-slate-100 overflow-hidden font-sans antialiased">
      {/* 1. Left Persistent Collapsible Navigation Sidebar (220-245px) */}
      <AppSidebar />

      {/* 2. Main Workstation Body (Flexible width taking most space) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Compact Application Bar (48px) */}
        <AppTopBar
          onOpenMissions={() => setMissionsModalOpen(true)}
          onOpenGuideModal={() => setGuideModalOpen(true)}
        />

        {/* Central Active Engineering Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#070913] relative">
          {renderWorkspace()}
        </main>
      </div>

      {/* 3. Contextual Right Inspector Panel (Collapsible) */}
      {inspectorOpen && <AppInspector />}

      {/* Global Utilities & Modals */}
      <CommandPalette />

      <SavedMissionsModal
        isOpen={missionsModalOpen}
        onClose={() => setMissionsModalOpen(false)}
      />

      <MarsNavGuide
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        onStartTour={() => {
          setGuideModalOpen(false);
          setActiveWorkspace('explorer-3d');
        }}
      />

      {/* Floating ORBIT Assistant (always available in any workspace) */}
      <OrbitChat onOpenGuide={() => setGuideModalOpen(true)} />
    </div>
  );
}

export default function App() {
  const [booted, setBooted] = useState(false);

  if (!booted) {
    return <BootScreen onComplete={() => setBooted(true)} />;
  }

  return (
    <AuthProvider>
      <WorkspaceProvider>
        <WorkstationMain />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
