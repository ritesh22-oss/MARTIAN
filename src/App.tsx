import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { MissionRecordProvider } from './context/MissionRecordContext';
import { WorkspaceProvider, useWorkspace, WorkspaceId } from './context/WorkspaceContext';
import { TerrainAnalysisProvider } from './context/TerrainAnalysisContext';
import BootScreen from './components/BootScreen';
import AppSidebar from './components/shell/AppSidebar';
import AppTopBar from './components/shell/AppTopBar';
import CommandPalette from './components/shell/CommandPalette';

// Workspaces
import OverviewWorkspace from './components/workspaces/OverviewWorkspace';
import MarsNavV4Workspace from './components/workspaces/MarsNavV4Workspace';
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
import NASAImageFeed from './components/NASAImageFeed';
import BaseCampIntelligence from './components/BaseCampIntelligence';
import FieldNotebook from './components/FieldNotebook';

// Modals & Floating Assistants
import SavedMissionsModal from './components/SavedMissionsModal';
import MarsNavGuide from './components/MarsNavGuide';
import OrbitChat from './components/OrbitChat';

import { useNetworkStatus } from './hooks/useNetworkStatus';
import OfflineScreen from './components/OfflineScreen';
import SlowConnectionScreen from './components/SlowConnectionScreen';
import ServiceStatusBanner from './components/ServiceStatusBanner';

// Inline ErrorBoundary to fix production bundling issue
interface ErrorBoundaryProps { children: ReactNode; fallback?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }
class InlinedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };
  public static getDerivedStateFromError(_: Error): ErrorBoundaryState { return { hasError: true }; }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  public render() {
    if (this.state.hasError) return this.props.fallback || <div className="p-8 text-center text-rose-400 bg-rose-950/20 border border-rose-900 rounded-lg">Something went wrong.</div>;
    return this.props.children;
  }
}

function WorkstationMain() {
  const { activeWorkspace, setActiveWorkspace, commandPaletteOpen, setCommandPaletteOpen } = useWorkspace();
  const [missionsModalOpen, setMissionsModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  
  const network = useNetworkStatus();
  const [forceOfflineView, setForceOfflineView] = useState(false);
  const [dismissedSlowLink, setDismissedSlowLink] = useState(false);

  // Auto-show offline screen ONLY if hardware internet connection is lost
  useEffect(() => {
    if (!network.isOnline) {
      setForceOfflineView(true);
    }
  }, [network.isOnline]);

  // Escape key closes open modals (topmost dialog priority)
  useEffect(() => {
    const handleModalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If command palette is open, it has its own priority dismiss
        if (commandPaletteOpen) return;
        if (guideModalOpen) {
          e.preventDefault();
          setGuideModalOpen(false);
          return;
        }
        if (missionsModalOpen) {
          e.preventDefault();
          setMissionsModalOpen(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleModalEscape);
    return () => window.removeEventListener('keydown', handleModalEscape);
  }, [commandPaletteOpen, guideModalOpen, missionsModalOpen]);

  // Render the dedicated engineering tool workspace
  const renderWorkspace = () => {
    switch (activeWorkspace) {
      case 'overview':
        return <OverviewWorkspace />;
      case 'marsnav-v4':
        return <MarsNavV4Workspace />;
      case 'field-notebook':
        return <FieldNotebook />;
      case 'base-camp-intel':
        return <BaseCampIntelligence />;
      case 'nasa-raw-feed':
        return (
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
            <NASAImageFeed onSelectImage={() => setActiveWorkspace('marsnav-v4')} />
          </div>
        );
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
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
            <TerrainAnalysis />
          </div>
        );
      case 'dataset-catalogue':
        return (
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
            <DatasetCatalogue />
          </div>
        );
      case 'hazard-analysis':
        return (
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
            <HazardAnalysisLab />
          </div>
        );
      case 'risk-assessment':
        return <RiskAssessmentWorkspace />;
      case 'route-lab':
        return (
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
            <RoutePlanner onOpenMissions={() => setMissionsModalOpen(true)} />
          </div>
        );
      case 'route-comparison':
        return (
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
            <RouteLaboratory />
          </div>
        );
      case 'scenario-testing':
        return (
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
            <InlinedErrorBoundary fallback={
              <div className="p-8 text-center text-rose-400 bg-rose-950/20 border border-rose-900 rounded-lg">
                <h2 className="text-lg font-bold mb-2">Scenario Testing simulation failed.</h2>
                <p className="text-sm mb-4">The simulation engine encountered an unexpected error.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white rounded font-bold text-xs"
                >
                  Reload Page
                </button>
              </div>
            }>
              <ScenarioTestingLab />
            </InlinedErrorBoundary>
          </div>
        );
      case 'validation-harness':
        return (
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto w-full">
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Floating Application Bar */}
        <div className="pt-4 px-6 shrink-0 z-30">
          <AppTopBar
            onOpenMissions={() => setMissionsModalOpen(true)}
            onOpenGuideModal={() => setGuideModalOpen(true)}
          />
        </div>
        
        {/* Refined Global Search Box - Restored below navbar */}
        <div className="px-6 py-3 shrink-0 z-20">
          <div className="max-w-[1800px] mx-auto">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full h-11 bg-[#0A0E1A]/60 backdrop-blur-xl border border-white/10 hover:border-orange-500/40 rounded-xl px-5 flex items-center justify-between text-slate-400 hover:text-white transition-all shadow-2xl group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <Search className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold tracking-wide">SEARCH MISSIONS, DATASETS, OR ANALYSIS TOOLS...</span>
              </div>
              <div className="flex items-center space-x-2 opacity-60">
                <kbd className="px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono border border-white/10 text-slate-300">⌘ K</kbd>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 shrink-0">
          <ServiceStatusBanner />
        </div>

        {/* Central Active Engineering Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#070913] relative">
          {renderWorkspace()}
        </main>
      </div>

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

      {/* Network Status Overlays */}
      {forceOfflineView && (
        <OfflineScreen 
          onContinueOffline={() => setForceOfflineView(false)} 
        />
      )}

      {network.state === 'SLOW_CONNECTION' && !dismissedSlowLink && !forceOfflineView && (
        <SlowConnectionScreen 
          onContinue={() => setDismissedSlowLink(true)} 
        />
      )}
    </div>
  );
}

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const handleReplay = () => setBooted(false);
    window.addEventListener('marsnav:replay-intro', handleReplay);
    return () => window.removeEventListener('marsnav:replay-intro', handleReplay);
  }, []);

  if (!booted) {
    return <BootScreen onComplete={() => setBooted(true)} />;
  }

  return (
    <AuthProvider>
      <MissionRecordProvider>
        <WorkspaceProvider>
          <TerrainAnalysisProvider>
            <WorkstationMain />
          </TerrainAnalysisProvider>
        </WorkspaceProvider>
      </MissionRecordProvider>
    </AuthProvider>
  );
}
