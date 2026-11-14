import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  X,
  Compass,
  Cpu,
  Database,
  ShieldAlert,
  ShieldCheck,
  Navigation,
  Route,
  Activity,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ExternalLink,
  Sparkles,
  Layers,
  Terminal,
  BookMarked,
  Check,
  Zap,
  Info,
  LayoutDashboard,
  Sliders,
  AlertOctagon,
  BarChart3,
  FileSpreadsheet,
  Bot,
  Settings,
  Radio,
  ArrowRight,
  Shield,
  FileText,
  SlidersHorizontal,
  Flame,
  Clock,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  GitCommit,
  Workflow,
  Footprints,
  Sun,
  Target,
  BoxSelect,
  Grid,
  Maximize2
} from 'lucide-react';

interface MarsNavGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateWorkspace?: (workspaceId: string) => void;
  onStartTour?: () => void;
}

// 12-Step Primary Rover Mission Traversal Pipeline
interface WorkflowStep {
  step: number;
  id: string;
  phase: string;
  phaseColor: string;
  title: string;
  shortDesc: string;
  status: 'READY' | 'ACTIVE' | 'VERIFIED' | 'OPTIMIZED';
  iconName: string;
}

export const ROVER_WORKFLOW_STEPS: WorkflowStep[] = [
  { step: 1, id: 'configuration', phase: 'INGESTION & SETUP', phaseColor: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30', title: 'Mission Configuration', shortDesc: 'Rover profile, mass, battery capacity & max slope limits', status: 'ACTIVE', iconName: 'Sliders' },
  { step: 2, id: 'nasa-raw-feed', phase: 'INGESTION & SETUP', phaseColor: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30', title: 'NASA Raw Image Feed', shortDesc: 'Downlink Martian Navcam & Hazcam imagery from JPL', status: 'READY', iconName: 'Radio' },
  { step: 3, id: 'dataset-catalogue', phase: 'INGESTION & SETUP', phaseColor: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30', title: 'Dataset Catalogue', shortDesc: 'Calibrate PDS HiRISE orthophotos & MOLA elevation DTMs', status: 'VERIFIED', iconName: 'Database' },
  { step: 4, id: 'terrain-intelligence', phase: 'TERRAIN & SAFETY', phaseColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30', title: 'Terrain Intelligence', shortDesc: 'Automated CV classification: edge, slope & obstacle detection', status: 'ACTIVE', iconName: 'Cpu' },
  { step: 5, id: 'hazard-analysis', phase: 'TERRAIN & SAFETY', phaseColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30', title: 'Hazard Analysis', shortDesc: 'Quantify rock density, pit perimeters & 2-28px safety buffers', status: 'OPTIMIZED', iconName: 'ShieldAlert' },
  { step: 6, id: 'risk-assessment', phase: 'TERRAIN & SAFETY', phaseColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30', title: 'Risk Assessment', shortDesc: 'Calculate multi-factor terrain safety score & slip probability', status: 'VERIFIED', iconName: 'ShieldCheck' },
  { step: 7, id: 'route-lab', phase: 'PATH COMPUTATION', phaseColor: 'from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30', title: 'Route Laboratory', shortDesc: 'Interactive A* pathfinding, waypoint editing & trajectory optimization', status: 'ACTIVE', iconName: 'Navigation' },
  { step: 8, id: 'route-comparison', phase: 'PATH COMPUTATION', phaseColor: 'from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30', title: 'Route Comparison', shortDesc: 'Multi-route trade-offs: Alpha (shortest) vs Gamma (safest)', status: 'OPTIMIZED', iconName: 'Route' },
  { step: 9, id: 'scenario-testing', phase: 'PATH COMPUTATION', phaseColor: 'from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30', title: 'Scenario Testing', shortDesc: 'Simulate dust storms, sensor dropouts & battery anomalies', status: 'READY', iconName: 'AlertOctagon' },
  { step: 10, id: 'validation-harness', phase: 'VERIFICATION & AUDIT', phaseColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30', title: 'Validation Harness', shortDesc: 'Run automated diagnostics across math solvers & coordinates', status: 'VERIFIED', iconName: 'Terminal' },
  { step: 11, id: 'model-eval', phase: 'VERIFICATION & AUDIT', phaseColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30', title: 'Model Evaluation', shortDesc: 'Benchmark CV precision, recall, and false-positive rates', status: 'OPTIMIZED', iconName: 'BarChart3' },
  { step: 12, id: 'audit', phase: 'VERIFICATION & AUDIT', phaseColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30', title: 'Mission Audit', shortDesc: 'Compile complete operational dossier & export one-click PDF', status: 'VERIFIED', iconName: 'FileSpreadsheet' }
];

// 12-Step Astronaut Surface Exploration Workflow
export const ASTRONAUT_WORKFLOW_STEPS: WorkflowStep[] = [
  { step: 1, id: 'surface-dashboard', phase: 'OPERATIONS & TELEMETRY', phaseColor: 'from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30', title: 'Mission Initialization & Telemetry Sync', shortDesc: 'EVA clock, suit vitals, life support reserves & DSN telemetry link', status: 'ACTIVE', iconName: 'LayoutDashboard' },
  { step: 2, id: 'marsnav-v4', phase: 'INGESTION & FIELD OPS', phaseColor: 'from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30', title: 'Surface Observation & Image Downlink', shortDesc: 'Downlink high-res Mastcam/Navcam frames or field photography', status: 'ACTIVE', iconName: 'Radio' },
  { step: 3, id: 'science-planner', phase: 'SCIENCE & OBJECTIVES', phaseColor: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30', title: 'Science Target Planning', shortDesc: 'Prioritize geological objectives, instrument allocations & EVA sequence', status: 'VERIFIED', iconName: 'Target' },
  { step: 4, id: 'surface-explorer', phase: 'TERRAIN EXPLORATION', phaseColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30', title: 'Terrain Surface Exploration', shortDesc: '3D/2D orbital inspection of Jezero Delta, scarps & crater landing basin', status: 'READY', iconName: 'Compass' },
  { step: 5, id: 'geological-targets', phase: 'GEOLOGICAL INVESTIGATION', phaseColor: 'from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30', title: 'Geological Target Identification', shortDesc: 'Astrobiology mineral classification (clays, carbonates, sulfates)', status: 'ACTIVE', iconName: 'Activity' },
  { step: 6, id: 'multilayer-map', phase: 'MULTISPECTRAL FUSION', phaseColor: 'from-cyan-500/20 to-teal-500/20 text-cyan-300 border-cyan-500/30', title: 'Multilayer Orbital & Geological Data Fusion', shortDesc: 'Correlate surface detections with MRO CTX, THEMIS & USGS SIM 3292', status: 'OPTIMIZED', iconName: 'Layers' },
  { step: 7, id: 'safety-monitoring', phase: 'HAZARD & ENVIRONMENT', phaseColor: 'from-red-500/20 to-amber-500/20 text-amber-400 border-amber-500/30', title: 'Environmental Safety Assessment', shortDesc: 'Monitor dust optical depth (Tau), thermal stress & storm proximity', status: 'VERIFIED', iconName: 'ShieldAlert' },
  { step: 8, id: 'radiation-monitor', phase: 'SPACE WEATHER', phaseColor: 'from-amber-500/20 to-yellow-500/20 text-yellow-400 border-yellow-500/30', title: 'Radiation & Space Weather Monitoring', shortDesc: 'NOAA SWPC solar proton flux, GOES X-ray flares & ALARA cumulative dose', status: 'OPTIMIZED', iconName: 'Sun' },
  { step: 9, id: 'suit-mobility', phase: 'ASTRONAUT MOBILITY', phaseColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30', title: 'Suit Mobility & Terrain Penalty Evaluation', shortDesc: 'Model xEMU joint mobility, metabolic expenditure & slope fatigue penalties', status: 'READY', iconName: 'Footprints' },
  { step: 10, id: 'astronaut-route-planner', phase: 'TRAVERSAL PLANNING', phaseColor: 'from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30', title: 'Astronaut Route & Traversal Planning', shortDesc: 'Generate obstacle-aware walking paths with turn radius & scarp buffers', status: 'ACTIVE', iconName: 'Navigation' },
  { step: 11, id: 'field-notebook', phase: 'FIELD SAMPLE LOGGING', phaseColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30', title: 'MarsWalk Field Operations & Sample Logging', shortDesc: 'Log sample tubes, drill cores & geological waypoints with image coordinates', status: 'VERIFIED', iconName: 'FileText' },
  { step: 12, id: 'audit', phase: 'MISSION REVIEW & ARCHIVE', phaseColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30', title: 'Mission Data Review & PDS Ingestion', shortDesc: 'Validate telemetry completeness, audit trail & NASA PDS compliant archiving', status: 'VERIFIED', iconName: 'FileSpreadsheet' }
];

export default function MarsNavGuide({ isOpen, onClose, onNavigateWorkspace, onStartTour }: MarsNavGuideProps) {
  // Navigation & View States
  const [currentView, setCurrentView] = useState<'flowchart' | 'index' | 'map' | 'quickref'>('flowchart');
  const [activeWorkflowPipeline, setActiveWorkflowPipeline] = useState<'rover' | 'astronaut'>('rover');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('route-lab');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [simulatedClock, setSimulatedClock] = useState<string>('08:42:19 UTC');

  // Interactive Demonstration Mini-Widget States
  // 1. Route Lab Interactive A* Grid Simulator
  const [gridObstacles, setGridObstacles] = useState<number[]>([12, 13, 23, 24, 35, 45, 55, 62, 63, 64]);
  const [activeRoutePath, setActiveRoutePath] = useState<number[]>([0, 1, 2, 11, 21, 31, 41, 42, 43, 53, 54, 65, 75, 86, 87, 88]);
  const [isSolvingRoute, setIsSolvingRoute] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<'Alpha' | 'Beta' | 'Gamma' | 'Delta'>('Gamma');

  // 2. Hazard Analysis Buffer Radar
  const [safetyBufferPx, setSafetyBufferPx] = useState<number>(14);

  // 3. Mission Configuration Rover Parameters
  const [roverMaxSlope, setRoverMaxSlope] = useState<number>(14);
  const [roverBatteryWh, setRoverBatteryWh] = useState<number>(2400);

  // 4. Terrain Intelligence Computer Vision Filter
  const [activeCvFilter, setActiveCvFilter] = useState<'edge' | 'slope' | 'contour' | 'raw'>('edge');

  // 5. Validation Harness Diagnostic Execution
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticDone, setDiagnosticDone] = useState(true);

  // --- ASTRONAUT EXPLORATION DEMO STATES ---
  // A. Surface Mission Dashboard Demo
  const [evaDurationSec, setEvaDurationSec] = useState<number>(4320); // 1h 12m
  const [evaIsRunning, setEvaIsRunning] = useState<boolean>(true);
  const [astronautHeartRate, setAstronautHeartRate] = useState<number>(76);
  const [astronautSuitO2, setAstronautSuitO2] = useState<number>(94);

  // B. Mission Science Planner Demo
  const [selectedScienceTarget, setSelectedScienceTarget] = useState<'delta_fan' | 'crater_rim' | 'sulfate_margin'>('delta_fan');
  const [sciencePriority, setSciencePriority] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [scienceInstrument, setScienceInstrument] = useState<'SuperCam' | 'SHERLOC' | 'PIXL'>('SuperCam');
  const [sciencePlanGenerated, setSciencePlanGenerated] = useState<boolean>(false);

  // C. Mars Surface Explorer Demo
  const [surfaceZoom, setSurfaceZoom] = useState<number>(1.0);
  const [selectedPoiName, setSelectedPoiName] = useState<string>('Kodiak Butte');

  // D. Multilayer Orbital & Geological Data Fusion Demo
  const [demoLayerTrek, setDemoLayerTrek] = useState<boolean>(true);
  const [demoLayerHillshade, setDemoLayerHillshade] = useState<boolean>(true);
  const [demoLayerThemis, setDemoLayerThemis] = useState<boolean>(false);
  const [demoLayerGeology, setDemoLayerGeology] = useState<boolean>(true);
  const [demoLayerDetections, setDemoLayerDetections] = useState<boolean>(true);
  const [demoFusionOpacity, setDemoFusionOpacity] = useState<number>(0.65);

  // E. Safety & Environment Demo
  const [demoDustTau, setDemoDustTau] = useState<number>(0.42);
  const [demoAtmosTemp, setDemoAtmosTemp] = useState<number>(-55);

  // F. Geological Targets Demo
  const [selectedMineralTarget, setSelectedMineralTarget] = useState<'smectite_clay' | 'magnesite_carb' | 'hydrated_sulfate'>('smectite_clay');
  const [targetInvestigationStatus, setTargetInvestigationStatus] = useState<'Identified' | 'In Progress' | 'Sample Cached'>('Identified');

  // G. Suit Mobility Demo
  const [suitSlopeDeg, setSuitSlopeDeg] = useState<number>(8);
  const [astronautPaceKmH, setAstronautPaceKmH] = useState<number>(3.2);

  // H. Astronaut Route Planner Demo
  const [astronautWaypoints, setAstronautWaypoints] = useState<Array<{ x: number; y: number }>>([
    { x: 10, y: 80 },
    { x: 30, y: 65 },
    { x: 55, y: 40 },
    { x: 80, y: 20 }
  ]);
  const [avoidanceBufferM, setAvoidanceBufferM] = useState<number>(4.0);

  // I. Radiation & Space Weather Demo
  const [speAlertActive, setSpeAlertActive] = useState<boolean>(false);
  const [solarFlareClass, setSolarFlareClass] = useState<'C1.2' | 'M2.4' | 'X1.1'>('C1.2');

  // J. MarsWalk Ops Field Demo
  const [marsWalkStep, setMarsWalkStep] = useState<number>(1);
  const [marsWalkPlaying, setMarsWalkPlaying] = useState<boolean>(false);

  // Sol clock tick simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSimulatedClock(now.toTimeString().split(' ')[0] + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // EVA timer simulation for Surface Mission Dashboard Demo
  useEffect(() => {
    if (!evaIsRunning) return;
    const interval = setInterval(() => {
      setEvaDurationSec(prev => prev + 1);
      // Subtle vital drift simulation
      setAstronautHeartRate(prev => 74 + Math.floor(Math.sin(Date.now() / 3000) * 4));
    }, 1000);
    return () => clearInterval(interval);
  }, [evaIsRunning]);

  // MarsWalk Ops step forward animation
  useEffect(() => {
    if (!marsWalkPlaying) return;
    const timer = setInterval(() => {
      setMarsWalkStep(prev => (prev >= 4 ? 1 : prev + 1));
    }, 2200);
    return () => clearInterval(timer);
  }, [marsWalkPlaying]);

  // Active workflow steps based on selected pipeline
  const currentWorkflowSteps = activeWorkflowPipeline === 'rover' ? ROVER_WORKFLOW_STEPS : ASTRONAUT_WORKFLOW_STEPS;

  // Comprehensive manual entries covering all 32 modules
  const manualSections = useMemo(() => [
    // =========================================================================
    // CATEGORY 1: ASTRONAUT SURFACE OPERATIONS
    // =========================================================================
    {
      id: 'astronaut-exploration',
      category: 'ASTRONAUT SURFACE OPERATIONS',
      workflowStep: 1,
      title: 'Astronaut Surface Operations',
      subtitle: 'Integrated Human Planetary Exploration Hub',
      icon: <Footprints className="w-5 h-5 text-orange-400" />,
      badge: 'HUMAN EXPLORATION',
      summary: 'The primary command suite for human extravehicular activity (EVA) on Mars, coordinating navigation, environmental safety, suit biomechanics, and field science.',
      whatIsIt: 'Astronaut Surface Operations is MARSNAV\'s dedicated workstation for human planetary explorers. While robotic rovers traverse autonomously, astronauts require real-time suit biotelemetry, life support tracking, walking stability analysis, and high-tempo field sample triage.',
      whyImportant: 'Surface EVAs involve severe environmental hazards including vacuum-equivalent atmospheric pressure, unshielded galactic cosmic rays, subzero temperatures, and rough terrain. This module centralizes human-critical safeguards.',
      coreCapabilities: [
        'Centralized switching across 10 specialized astronaut exploration submodules.',
        'Real-time biotelemetry and life support consumable tracking.',
        'Seamless handoff between field photography (MarsWalk Ops) and scientific data fusion.',
        'Emergency abort and retreat trajectory generation toward the Base Habitat.'
      ],
      howToUse: [
        'Open Astronaut Exploration from the main workspace navigation ribbon.',
        'Review active EVA duration, oxygen consumption rate, and DSN signal link on the top status ribbon.',
        'Select desired submodule tab (e.g. Surface Dashboard, Multilayer Map, Suit Mobility).',
        'Inspect synchronized terrain and scientific records generated by active field observations.'
      ],
      toolsAndControls: [
        'Submodule Ribbon: 10 one-click launchers covering the full astronaut exploration spectrum.',
        'EVA Telemetry Bar: Live display of Sol clock, metabolic energy expenditure, and consumable reserves.',
        'DSN Link Status: Displays signal latency (approx. 14 min round-trip) and uplink bandwidth.',
        'Emergency Retreat Trigger: Generates the fastest safe walking path back to the landing base.'
      ],
      expectedOutput: 'Synchronized human mission status, verified safety thresholds, and active science traversal logs.',
      realWorkflow: 'Before egressing the airlock on Sol 412, Commander Vance verifies suit pressure and space weather radiation margins in this hub before initiating traverse toward Delta Scarp.',
      relatedModules: ['Surface Mission Dashboard', 'Suit Mobility Analysis', 'Radiation & Space Weather', 'MarsWalk Ops']
    },
    {
      id: 'surface-dashboard',
      category: 'ASTRONAUT SURFACE OPERATIONS',
      workflowStep: 1,
      title: 'Surface Mission Dashboard',
      subtitle: 'Astronaut EVA Status & Life Support Telemetry',
      icon: <LayoutDashboard className="w-5 h-5 text-orange-400" />,
      badge: 'BIOTELEMETRY',
      summary: 'Operational telemetry dashboard tracking astronaut suit pressure, metabolic rate, oxygen reserve levels, mission duration, and immediate terrain hazards.',
      whatIsIt: 'The Surface Mission Dashboard provides a high-tempo tactical overview tailored for the astronaut in the field and the Mission Operations Director. It visualizes consumable burn rates, walk velocity, battery SoC, and environmental stress.',
      whyImportant: 'Human life support systems have rigid margins. If metabolic rates spike on steep inclines or oxygen reserves fall below safety thresholds (typically 20%), the mission must order an immediate walk abort.',
      coreCapabilities: [
        'Live metabolic load calculation (kcal/hr) based on slope and suit mass.',
        'Real-time oxygen (O2) and battery reserve exhaustion countdown.',
        'Continuous environmental risk indexing incorporating atmospheric pressure and temperature.',
        'Audible and visual alerts for high-radiation or dust-storm encroachment.'
      ],
      howToUse: [
        'Open Surface Mission Dashboard upon beginning an EVA traversal.',
        'Monitor the Primary Suit Status card for pressure integrity (nominal 29.6 kPa pure O2).',
        'Observe the Consumable Reserves card to ensure walking radius does not exceed return margins.',
        'Verify that all 4 mission hazard indicators (Thermal, Radiation, Dust, Terrain) remain NOMINAL.'
      ],
      toolsAndControls: [
        'EVA Mission Timer: Tracks elapsed walk time against maximum 6.5-hour suit limits.',
        'Metabolic Expenditure Gauge: Real-time readout of astronaut exertion in kcal/hr.',
        'Consumable Reserves Gauges: Graphical rings for O2, Battery, and Cooling Water.',
        'Hazard State Badges: Color-coded indicators (Green = Nominal, Amber = Caution, Red = Abort).'
      ],
      expectedOutput: 'Instantaneous confirmation of astronaut safety, consumable duration, and mission pacing.',
      realWorkflow: 'During a traverse across boulder field BF-04, the astronaut observes a metabolic spike to 480 kcal/hr on a 14° scarp. The dashboard recommends a 3-minute breather to restore respiration margins.',
      relatedModules: ['Astronaut Surface Operations', 'Safety & Environment', 'Suit Mobility Analysis']
    },
    {
      id: 'science-planner',
      category: 'ASTRONAUT SURFACE OPERATIONS',
      workflowStep: 3,
      title: 'Mission Science Planner',
      subtitle: 'Strategic Science Activity & Timeline Sequencer',
      icon: <Target className="w-5 h-5 text-purple-400" />,
      badge: 'SCIENCE PLANNING',
      summary: 'Science sequencing tool for prioritizing geological waypoints, scheduling spectrometer observations, allocating sample collection tubes, and optimizing field time.',
      whatIsIt: 'Mission Science Planner translates broad planetary science questions (e.g. "Did lacustrine clays in Jezero preserve biosignatures?") into concrete, timed operational actions for astronauts during a surface sortie.',
      whyImportant: 'Astronaut EVA time is strictly limited by consumable reserves. Every minute spent inspecting an unpromising basalt block is a minute lost examining layered delta mudstones.',
      coreCapabilities: [
        'Target prioritization scoring based on astrobiology and geological potential.',
        'Instrument allocation tool (SuperCam LIBS, SHERLOC Raman, PIXL XRF, Coring Drill).',
        'Activity timeline generation with realistic setup and analysis durations.',
        'Sample cache container tracking (43 hermetic titanium sample tubes).'
      ],
      howToUse: [
        'Select a candidate outcrop or boulder from the geological target list.',
        'Assign scientific priority (Primary Research Goal vs. Secondary Target of Opportunity).',
        'Select intended analytical instruments and specify whether core sampling is required.',
        'Click "Generate Science Timeline" to produce the optimized sequence within EVA time limits.'
      ],
      toolsAndControls: [
        'Target Selector: Interactive list of candidate formations identified by orbital imaging.',
        'Instrument Checklist: Toggle SuperCam, PIXL, SHERLOC, and Abrasion/Coring tools.',
        'Duration Estimator: Dynamically calculates observation and core drilling time.',
        'Sequence View: Visual Gantt timeline displaying planned activities across the Sol.'
      ],
      expectedOutput: 'A verified, conflict-free Science Activity Schedule ready for field execution.',
      realWorkflow: 'Mission scientists schedule a 25-minute Raman spectroscopy scan at the Kodiak Delta Scarp, followed by a 40-minute sample core extraction into Sample Tube #14.',
      relatedModules: ['Geological Targets', 'Multilayer Orbital & Geological Data Fusion', 'Spatial Field Notebook']
    },

    // =========================================================================
    // CATEGORY 2: MARS ENVIRONMENT & SCIENCE
    // =========================================================================
    {
      id: 'surface-explorer',
      category: 'MARS ENVIRONMENT & SCIENCE',
      workflowStep: 4,
      title: 'Mars Surface Explorer',
      subtitle: '2D/3D Planetary Surface GIS & Waypoint Inspector',
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      badge: 'PLANETARY GIS',
      summary: 'Interactive geospatial surface viewer combining MRO HiRISE orthophotos, MGS MOLA elevation DTMs, and verified Jezero points of interest (POIs).',
      whatIsIt: 'Mars Surface Explorer allows mission planners and astronauts to explore the planetary surface with authentic satellite basemaps. It provides smooth zoom, pan, coordinate readouts in Planetocentric East-positive coordinates, and POI inspector cards.',
      whyImportant: 'Understanding regional topography (crater rims, delta channels, drop-offs) is essential for situational awareness before setting foot on the Martian regolith.',
      coreCapabilities: [
        'Interactive map canvas rendered in IAU2000:49900 Mars coordinate reference system.',
        'Pre-calibrated science POIs across Jezero Crater (Delta Fan, Kodiak Butte, Belva Crater Rim).',
        'MOLA absolute elevation interpolation at any cursor position.',
        'Direct link to NASA PDS archive records and University of Arizona HiRISE products.'
      ],
      howToUse: [
        'Use mouse wheel or zoom controls to inspect terrain from regional to meter-scale resolution.',
        'Click on any marked POI icon to view historical formation context and elevation profile.',
        'Click anywhere on the map to set candidate destination coordinates for route calculation.'
      ],
      toolsAndControls: [
        'Zoom & Pan Controls: Seamless navigation across the Jezero study basin.',
        'POI Inspector: Displays geological classification, elevation, and latitude/longitude.',
        'Coordinate HUD: Real-time Planetocentric coordinates (East-positive convention).',
        'MOLA Elevation Gauge: Displays absolute elevation relative to the Mars Areoid datum.'
      ],
      expectedOutput: 'Accurate spatial orientation and topographical context for surface missions.',
      realWorkflow: 'Astronauts review the steep 28% grade along the Belva Crater rim before committing a traversal path, selecting an alternate gentle ingress route discovered in the Explorer.',
      relatedModules: ['Multilayer Orbital & Geological Data Fusion', 'Astronaut Route Planner', '3D Terrain Explorer']
    },
    {
      id: 'multilayer-map',
      category: 'MARS ENVIRONMENT & SCIENCE',
      workflowStep: 6,
      title: 'Multilayer Orbital & Geological Data Fusion',
      subtitle: 'Multispectral Orbital Overlays & Surface CV Localizer',
      icon: <Layers className="w-5 h-5 text-cyan-300" />,
      badge: 'DATA FUSION',
      summary: 'Advanced multispectral GIS fusing MRO CTX optical imagery, THEMIS Day/Night thermal infrared, HRSC hillshades, USGS SIM 3292 geology, and active surface computer-vision detections.',
      whatIsIt: 'This module is the core data fusion workstation of MARSNAV. It superimposes orbital remote sensing datasets with surface rover/astronaut photography, featuring computer-vision object detection, bounding boxes, category filtering, and clustering.',
      whyImportant: 'Orbital imaging gives regional context, while surface photography gives centimeter-scale obstacle clarity. Fusing both without fabricating false coordinates provides the ultimate tactical decision tool.',
      coreCapabilities: [
        'Image-space object detection with bounding boxes and unique IDs (DET-001, DET-002, ...).',
        'Clean legend with 9 distinct geological categories (Boulders, Bedrock, Regolith, Fractures).',
        'Automatic object clustering when zoomed out to prevent overlapping label clutter.',
        'NASA JPL Mars Trek WMTS and USGS WMS live tile integration with opacity and split-screen sliders.',
        'Independent coordinate space handling for unreferenced surface photographs.'
      ],
      howToUse: [
        'Switch between "Surface CV Map", "NASA Orbital Fusion", and "Dual Comparison" modes.',
        'In Surface CV Map, zoom in to inspect individual detected rocks, boulders, and bedrock patches.',
        'Click any detection box to inspect pixel dimensions, confidence score, and estimated physical bounds.',
        'Use category pills to isolate specific features (e.g. Large Boulders or Exposed Bedrock).',
        'Toggle "Annotations: ON/OFF" to inspect the raw Martian photograph.'
      ],
      toolsAndControls: [
        'View Mode Toggle: Surface CV Map, NASA Orbital Fusion, and Dual Comparison.',
        'Annotation Mode: Bounding Boxes, Density Heatmap, or Both.',
        'Zoom & Pan Stage: Smooth 1x to 4x image-space scaling with zero coordinate drift.',
        'Detection List Panel: Searchable catalogue of all localized features with confidence badges.',
        'Orbital Layer Stack: Independent opacity sliders for CTX, HRSC Hillshade, THEMIS IR, and SIM 3292.'
      ],
      expectedOutput: 'An uncluttered, scientifically rigorous map displaying detected surface obstacles and verified orbital layers.',
      realWorkflow: 'When Perseverance downlinks a Navcam frame of an unvisited ripple field, this module localizes 18 rocks, highlights a bedrock pavement pathway, and correlates it with USGS SIM 3292 unit mNhm.',
      relatedModules: ['Mars Surface Explorer', 'Geological Targets', 'MarsWalk Ops']
    },
    {
      id: 'safety-monitoring',
      category: 'MARS ENVIRONMENT & SCIENCE',
      workflowStep: 7,
      title: 'Safety & Environment Monitoring',
      subtitle: 'Martian Meteorology, Dust Storms & Hazard Indexing',
      icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
      badge: 'ENVIRONMENTAL SAFETY',
      summary: 'Monitors real Martian surface atmospheric pressure, diurnal air temperature, wind velocity, and dust optical depth (Tau) derived from NASA InSight and PDS baselines.',
      whatIsIt: 'Safety & Environment provides atmospheric and meteorological monitoring for human exploration. It combines real archived in-situ observations from the NASA InSight weather archive with peer-reviewed PDS baselines for Perseverance MEDA and Curiosity REMS.',
      whyImportant: 'Mars experiences extreme diurnal temperature swings (-84°C to +8°C), ferocious dust storms that cut solar insolation and coat radiators, and low pressures (700-850 Pa) that dictate EVA suit cooling efficiency.',
      coreCapabilities: [
        'Real InSight lander atmospheric pressure, temperature, and wind records from NASA PDS.',
        'Dust Optical Depth (Tau) tracking for solar array and visibility forecasting.',
        'Thermal stress indexing for astronaut suit cooling and heater duty cycles.',
        'Honest missing-data reporting with explicit DATA UNAVAILABLE markers for active Sols.'
      ],
      howToUse: [
        'Review current InSight Sol observations in the Primary Meteorology card.',
        'Check the Atmospheric Pressure readout to verify ambient gas density (nominal 740 Pa).',
        'Inspect the Dust Opacity (Tau) meter to anticipate impending dust storm fronts.',
        'Verify that all environmental safety scores remain above the 70/100 nominal threshold.'
      ],
      toolsAndControls: [
        'TWINS Air Temp Gauge: Displays diurnal min, max, and mean air temperature in °C.',
        'Pressure Sensor Readout: Displays surface barometric pressure in Pascals (Pa).',
        'Wind Vector Monitor: Displays horizontal wind speed (m/s) and dominant direction.',
        'Dust Tau Indicator: Opacity rating (Tau < 0.5 = Clear, Tau > 1.5 = Regional Dust Event).'
      ],
      expectedOutput: 'Reliable, unmanufactured environmental observations with clear data provenance.',
      realWorkflow: 'Prior to a 5 km rover traverse, operators verify that dust Tau is 0.42 (clear sky) and atmospheric pressure is 742 Pa, confirming nominal cooling tower performance for the habitat.',
      relatedModules: ['Surface Mission Dashboard', 'Radiation & Space Weather', 'Suit Mobility Analysis']
    },
    {
      id: 'geological-targets',
      category: 'MARS ENVIRONMENT & SCIENCE',
      workflowStep: 5,
      title: 'Geological Targets & Astrobiology',
      subtitle: 'Rock Classification & Sample Prioritization',
      icon: <Activity className="w-5 h-5 text-pink-400" />,
      badge: 'ASTROBIOLOGY',
      summary: 'Catalogues and scores candidate rock formations, sedimentary layers, and mineral outcrops for biosignature preservation potential and sample caching.',
      whatIsIt: 'This module is the scientific sample curation center of MARSNAV. It classifies rocks into distinct mineralogical families (Fe/Mg phyllosilicates, hydrated carbonates, basaltic volcanics) and calculates sample prioritization scores.',
      whyImportant: 'The primary goal of the Mars 2020 mission and future human explorers is astrobiology: finding ancient signs of microbial life. Prioritizing rocks with fine-grained mudstones or carbonate cements maximizes science return.',
      coreCapabilities: [
        'Mineralogical classification according to CRISM and SuperCam spectroscopy libraries.',
        'Sample Prioritization Scoring Matrix (Astrobiology, Organic Preservation, Accessibility).',
        'Tracking of investigation status: Identified -> In Progress -> Sample Cached.',
        'Cross-referencing with USGS SIM 3292 geological units.'
      ],
      howToUse: [
        'Browse the list of identified geological targets discovered in the Jezero crater basin.',
        'Filter by mineralogy class (e.g. Clays, Carbonates, Sulfates, or Basalts).',
        'Select a target to review its scientific justification and recommended investigation instruments.',
        'Update target status when field observations or sample coring is completed.'
      ],
      toolsAndControls: [
        'Target Matrix Cards: Displays mineral composition, location, and astrobiological score.',
        'Spectroscopy Filter: Sort by clay, carbonate, sulfate, or basaltic signatures.',
        'Investigation Status Toggles: Mark targets as Investigated, Sampled, or Skipped.',
        'Sample Tube Linker: Binds sample core tube serial numbers to specific targets.'
      ],
      expectedOutput: 'A structured, peer-reviewed geological inventory driving field sampling decisions.',
      realWorkflow: 'Astronauts identify an olivine-carbonate outcrop at the Delta scarp base, run SuperCam laser spectroscopy, score it at 96% priority, and extract Core Sample #09.',
      relatedModules: ['Mission Science Planner', 'Multilayer Orbital & Geological Data Fusion', 'Spatial Field Notebook']
    },
    {
      id: 'radiation-monitor',
      category: 'MARS ENVIRONMENT & SCIENCE',
      workflowStep: 8,
      title: 'Radiation & Space Weather Monitoring',
      subtitle: 'Solar Flares, Cosmic Rays & Astronaut ALARA Exposure',
      icon: <Sun className="w-5 h-5 text-yellow-400" />,
      badge: 'DOSIMETRY',
      summary: 'Space weather monitoring hub incorporating live NOAA SWPC GOES X-ray flux, solar energetic protons (>=10 MeV), NASA DONKI coronal flare alerts, and MSL RAD baselines.',
      whatIsIt: 'Radiation & Space Weather tracks ionizing radiation hazards for astronauts on Mars. Because Mars lacks a global magnetic field and has a thin atmosphere, it is exposed to continuous Galactic Cosmic Rays (GCR) and sporadic Solar Particle Events (SPE).',
      whyImportant: 'An unshielded Solar Particle Event (SPE) can deliver lethal radiation doses (>1-2 Sv) in hours. Continuous monitoring and rapid shelter alerts keep astronaut exposure within NASA ALARA (As Low As Reasonably Achievable) standards.',
      coreCapabilities: [
        'Real-time ingestion of NOAA SWPC primary GOES X-ray fluxes (0.1–0.8 nm).',
        'High-energy solar proton monitor (>=10 MeV and >=100 MeV flux).',
        'NASA DONKI space weather alert feeds for coronal mass ejections and interplanetary shocks.',
        'MSL RAD peer-reviewed Martian surface baseline (0.64 mGy/day GCR dose rate).',
        'Astronaut cumulative 30-day and career dose tracking against NASA 250 mSv career limits.'
      ],
      howToUse: [
        'Inspect the NOAA GOES Solar Flare Monitor for recent M-class or X-class flares.',
        'Check the High Energy Proton Flux gauge; any reading >10 pfu triggers a radiation advisory.',
        'Review the Astronaut Cumulative Dose gauge to ensure 30-day ALARA limits are respected.',
        'If an SPE alert triggers, immediately execute the emergency storm shelter protocol.'
      ],
      toolsAndControls: [
        'GOES X-Ray Flux Chart: Live 3-day satellite stream classifying A, B, C, M, and X flares.',
        'Proton Flux Gauge: Monitors solar particle intensities capable of penetrating suit shielding.',
        'MSL RAD Surface Dosimetry: Peer-reviewed baseline GCR dose rate (0.64 mGy/day).',
        'ALARA Dose Gauge: Cumulative astronaut exposure tracking against 30-day limits.'
      ],
      expectedOutput: 'Continuous ionizing radiation situational awareness with verified satellite telemetry.',
      realWorkflow: 'NOAA SWPC detects an X1.4 class flare on the Earth-Sun-Mars line. Space weather officers alert the EVA team 45 minutes prior to proton arrival, allowing astronauts to shelter inside the habitat regolith bunker.',
      relatedModules: ['Safety & Environment', 'Surface Mission Dashboard', 'Mission Audit']
    },

    // =========================================================================
    // CATEGORY 3: ASTRONAUT MOBILITY & NAVIGATION
    // =========================================================================
    {
      id: 'suit-mobility',
      category: 'ASTRONAUT MOBILITY & NAVIGATION',
      workflowStep: 9,
      title: 'Suit Mobility Analysis & Biomechanics',
      subtitle: 'Extravehicular Pressure Suit Kinematics & Metabolic Load',
      icon: <Footprints className="w-5 h-5 text-emerald-400" />,
      badge: 'BIOMECHANICS',
      summary: 'Biomechanical mobility analysis calculating astronaut walking speed, joint torque limits, metabolic heat generation, and slope fatigue in pressurized EVA suits.',
      whatIsIt: 'Suit Mobility Analysis models the physical constraints of walking in a pressurized Extravehicular Mobility Unit (xEMU). It accounts for Martian gravity (0.38g), suit mass (~140 kg), joint bearing friction, and slope grade penalties.',
      whyImportant: 'Unlike robotic wheels, human walking speed drops steeply on loose sand and upward slopes. Walking up a 15° slope in a pressurized suit triples metabolic rate, risking suit cooling exhaustion.',
      coreCapabilities: [
        'Terrain slope vs. walking velocity curves based on NASA Apollo/Desert RATS field data.',
        'Metabolic energy consumption calculation (kcal/hr) as a function of pace and incline.',
        'Suit joint mobility index and center-of-mass tipping margin estimation.',
        'Fatigue recovery rest interval recommendations.'
      ],
      howToUse: [
        'Select the active suit configuration (e.g. Standard Planetary xEMU vs. Lightweight Exosuit).',
        'Adjust the terrain slope slider to observe the direct penalty on astronaut velocity.',
        'Inspect the metabolic heat load readout to verify it remains within suit sublimation cooling limits (max 500 kcal/hr).',
        'Use recommended walking speeds to constrain downstream route planning algorithms.'
      ],
      toolsAndControls: [
        'Suit Profile Selector: Configures suit mass, pressure, and mobility characteristics.',
        'Incline Grade Slider: Dynamically simulates slopes from 0° (flat) to 30° (critical scarp).',
        'Locomotion Velocity Readout: Displays realistic walking pace (0.5 to 3.8 km/h).',
        'Metabolic Workload Gauge: Real-time calculation of caloric expenditure per hour.'
      ],
      expectedOutput: 'Physically realistic walking speeds and metabolic constraints for safe route generation.',
      realWorkflow: 'Route planners discover that traversing a 12° slope requires 420 kcal/hr, reducing astronaut speed to 1.8 km/h. They re-route around the slope base, increasing distance by 40m but cutting total transit time by 8 minutes.',
      relatedModules: ['Astronaut Route Planner', 'Surface Mission Dashboard', 'Terrain Intelligence']
    },
    {
      id: 'astronaut-route-planner',
      category: 'ASTRONAUT MOBILITY & NAVIGATION',
      workflowStep: 10,
      title: 'Astronaut Route Planner',
      subtitle: 'Human Traversal Pathfinding & Obstacle Bypass',
      icon: <Navigation className="w-5 h-5 text-orange-400" />,
      badge: 'PATH PLANNING',
      summary: 'Terrain-aware walking path planner generating safe astronaut walking trajectories around large boulders, steep scarps, and loose sand dunes with turnaround buffers.',
      whatIsIt: 'Astronaut Route Planner adapts MARSNAV\'s high-performance A* pathfinding engine specifically for suited human locomotion. It enforces human turn radii, walking clearance envelopes, slope limits, and emergency retreat waypoints.',
      whyImportant: 'Robotic rovers can climb steep boulders with rock-bogie suspensions, but astronauts in bulky suits can trip or puncture suit fabric on sharp rocks. Safe, verified walking corridors are mandatory.',
      coreCapabilities: [
        'A* pathfinding with human turning radii and 4-meter rock buffer zones.',
        'Slope penalty weighting: routes actively avoid grades exceeding 15°.',
        'Turnaround radius enforcement: ensures astronauts never encounter dead-end box canyons.',
        'Distance, walking duration, and metabolic calorie total calculations.'
      ],
      howToUse: [
        'Set Start [A] at the rover location or airlock portal.',
        'Set Destination [B] at the desired geological science waypoint.',
        'Select Traversal Strategy: Route Gamma (Maximum Clearance) or Route Alpha (Fastest Direct).',
        'Click "Compute Astronaut Path" to generate the footprint-verified walking corridor.'
      ],
      toolsAndControls: [
        'Start / Destination Selectors: Set waypoints directly on the interactive map.',
        'Strategy Switcher: Alpha (Direct), Beta (Low Energy), Gamma (Maximum Rock Clearance).',
        'Obstacle Avoidance Radius: Set custom safety envelopes around detected boulders (2m to 8m).',
        'Route Metrics Card: Total walking meters, estimated minutes, and safety clearance score.'
      ],
      expectedOutput: 'An optimized, collision-free walking trajectory with sequenced astronaut waypoints.',
      realWorkflow: 'Astronauts plan a 320m traverse from the rover to a stratified clay outcrop. The planner bypasses a cluster of 1.2m boulders, guiding the crew along a smooth bedrock pavement.',
      relatedModules: ['Suit Mobility Analysis', 'Multilayer Orbital & Geological Data Fusion', 'MarsWalk Ops']
    },

    // =========================================================================
    // CATEGORY 4: MISSION DATA & FIELD OPERATIONS
    // =========================================================================
    {
      id: 'marsnav-v4',
      category: 'MISSION DATA & FIELD OPERATIONS',
      workflowStep: 2,
      title: 'MarsWalk Ops / EVA Field Console',
      subtitle: 'Interactive Martian Surface Walk & Image Analysis Console',
      icon: <Footprints className="w-5 h-5 text-orange-400" />,
      badge: 'FIELD CONSOLE',
      summary: 'The primary field operations console where Martian surface photographs are uploaded or fetched from NASA, segmented via computer vision, and turned into active exploration sessions.',
      whatIsIt: 'MarsWalk Ops is the frontline interface between raw Martian imagery and downstream mission intelligence. When an astronaut or operator uploads a photo or downlinks a NASA JPL rover frame, this console processes pixels, extracts obstacles, and generates footprint corridors.',
      whyImportant: 'Without actual surface observation frames, mission planning remains abstract. MarsWalk Ops provides the real ground-truth imagery driving terrain intelligence, obstacle classification, and spatial navigation.',
      coreCapabilities: [
        'Ingests local user uploads or live NASA JPL Mastcam/Navcam raw images.',
        'Automated execution of the fused OpenCV + Gemini Vision segmentation pipeline.',
        'Generates sequential astronaut footprint waypoints with alternating left/right strides.',
        'Directly updates the authoritative shared exploration store across all MarsNav workspaces.'
      ],
      howToUse: [
        'Upload an image from local storage or click "Load NASA Frame" to fetch a real JPL Mars observation.',
        'Observe the computer vision localizer detect boulders, bedrock, and sand dunes in real time.',
        'Click "Run MarsWalk Trajectory" to generate a step-by-step astronaut walking route.',
        'Open Multilayer Map or Surface Explorer to inspect the newly analyzed scene across other modules.'
      ],
      toolsAndControls: [
        'Image Ingestion Button: Supports PNG/JPG/WebP uploads and NASA API queries.',
        'CV Feature Overlay Toggle: Displays green/yellow/red obstacle bounding boxes.',
        'Footprint Generator: Computes 0.7m human walking strides along the planned route.',
        'Sync Status Indicator: Confirms synchronization with the global exploration store.'
      ],
      expectedOutput: 'A fully segmented, obstacle-mapped surface scene published to all MarsNav modules.',
      realWorkflow: 'Astronaut Vance takes a wide-angle surface photo of a fractured boulder field. Within 8 seconds, MarsWalk Ops classifies 14 obstacles and plots a safe 45-footprint corridor through the gap.',
      relatedModules: ['Multilayer Orbital & Geological Data Fusion', 'Spatial Field Notebook', 'Astronaut Route Planner']
    },
    {
      id: 'field-notebook',
      category: 'MISSION DATA & FIELD OPERATIONS',
      workflowStep: 11,
      title: 'Spatial Field Notebook',
      subtitle: 'Geological Sample Logging & Map Coordinates',
      icon: <FileText className="w-5 h-5 text-cyan-400" />,
      badge: 'SAMPLE LOGGING',
      summary: 'Digital geological field notebook allowing astronauts to log rock samples, recorded observations, audio memos, and pin entries directly to image coordinates.',
      whatIsIt: 'Spatial Field Notebook is the digital field log of human Mars exploration. It replaces traditional paper field notebooks with a map-linked database where every sample entry stores timestamp, mineralogy, photo coordinates, and geological notes.',
      whyImportant: 'Sample return is meaningless if scientific context is lost. Pinning sample tubes to exact pixel and spatial coordinates preserves geological provenance for Earth laboratory analysis.',
      coreCapabilities: [
        'Log rock samples with unique serial numbers, photos, and mineral classifications.',
        'Direct spatial binding: pins sample locations to specific pixel coordinates on active images.',
        'Filterable notes timeline categorized by Sol, target name, and sample status.',
        'Exportable scientific field dossier formatted for NASA PDS ingestion.'
      ],
      howToUse: [
        'Click "Add Field Entry" when inspecting an interesting rock or collecting a core sample.',
        'Click on the surface image to place a precise sample waypoint marker.',
        'Enter mineralogical notes, sample tube ID (e.g. ST-2026-08), and astrobiological significance.',
        'Review logged entries in the chronological Sol timeline.'
      ],
      toolsAndControls: [
        'Pin Tool: Interactively drops numbered sample pins onto the active photograph.',
        'Sample Registry: Table of cached tubes, sample weight, and collection Sol.',
        'Category Tags: Tag entries as Lithology, Astrobiology, Atmospheric, or Hazard.',
        'Export Log: Downloads a complete JSON/CSV field notebook dossier.'
      ],
      expectedOutput: 'A complete, geographically referenced record of all scientific field collections.',
      realWorkflow: 'Commander Vance extracts a 5cm core from a phyllosilicate mudstone, registers it as Tube #04, and notes fine laminar bedding and silica nodules in the field log.',
      relatedModules: ['MarsWalk Ops', 'Geological Targets', 'Mission Science Planner']
    },

    // =========================================================================
    // CATEGORY 5: ROVER NAVIGATION & COMPUTATION
    // =========================================================================
    {
      id: 'overview',
      category: 'ROVER NAVIGATION',
      workflowStep: null,
      title: 'Mission Overview',
      subtitle: 'Command Center Dashboard & Telemetry Hub',
      icon: <LayoutDashboard className="w-5 h-5 text-orange-400" />,
      badge: 'DASHBOARD',
      summary: 'The primary command dashboard providing high-level operational telemetry, active mission status, battery reserves, and quick-launch shortcuts.',
      whatIsIt: 'Mission Overview serves as the top-level telemetry and status hub of MARSNAV. It aggregates real-time system health, active traversal progress, active rover profile, and recent activity logs into a unified mission control screen.',
      whyImportant: 'Operators need an immediate, bird-eye view of mission health, active target coordinates, and system readiness before executing surface maneuvers.',
      coreCapabilities: ['Real-time telemetry aggregation', 'Rover battery and motor health monitoring', 'Quick-action shortcuts to all tools'],
      howToUse: ['Review status upon system boot', 'Verify backend connection and battery state', 'Use quick-action cards to jump directly to tools'],
      toolsAndControls: ['Active Mission Card', 'System Health Monitor', 'Quick Action Launchers', 'Real-Time Telemetry Ticker'],
      expectedOutput: 'An instantaneous operational snapshot of mission readiness with zero latency.',
      realWorkflow: 'Mission planners begin every Sol by inspecting Overview telemetry to ensure battery reserves and traverse clearances are fully nominal.',
      relatedModules: ['MarsWalk Ops', 'Mission Configuration', 'Spatial Field Notebook']
    },
    {
      id: 'explorer-3d',
      category: 'ROVER NAVIGATION',
      workflowStep: null,
      title: '3D Terrain Explorer',
      subtitle: 'Interactive Three.js Digital Elevation Mesh',
      icon: <Maximize2 className="w-5 h-5 text-cyan-400" />,
      badge: '3D TOPOGRAPHY',
      summary: 'High-fidelity 3D topography visualizer rendering real MRO HiRISE 1m DTMs and MGS MOLA elevation meshes with orbital hypsometric tints.',
      whatIsIt: '3D Terrain Explorer renders Martian surface relief in full interactive 3D using Three.js and WebGL. It provides realistic lighting, exaggerated hillshades, slope visualization, and rover scale models.',
      whyImportant: '2D flat maps fail to convey true topographic slope, crater rims, and ravines. 3D visualization gives navigators true depth perception of traversal obstacles.',
      coreCapabilities: ['3D digital elevation model rendering', 'Interactive orbit, pan, and zoom controls', 'Slope gradient hypsometric coloring'],
      howToUse: ['Rotate canvas with left mouse click', 'Pan with right mouse click', 'Toggle elevation contours and slope color maps'],
      toolsAndControls: ['Orbit Controls', 'Elevation Exaggeration Slider', 'Hypsometric Shading Toggle', 'Rover Scale Placer'],
      expectedOutput: 'Interactive 3D elevation mesh displaying true Martian relief.',
      realWorkflow: 'Navigators rotate the 3D mesh around a delta channel to identify low-slope ingress ramps with grades below 12°.',
      relatedModules: ['Mars Surface Explorer', 'Multilayer Orbital & Geological Data Fusion']
    },
    {
      id: 'live-mission-data',
      category: 'ROVER NAVIGATION',
      workflowStep: null,
      title: 'Live NASA Stream',
      subtitle: 'Atmospheric Opacity & Environmental Telemetry',
      icon: <Radio className="w-5 h-5 text-emerald-400" />,
      badge: 'NASA TELEMETRY',
      summary: 'Continuous environmental telemetry feed displaying atmospheric pressure, temperature, and dust optical depth (Tau) from NASA planetary missions.',
      whatIsIt: 'Live NASA Stream connects directly to NASA planetary weather feeds to stream real atmospheric observations into the MARSNAV navigation engine.',
      whyImportant: 'Atmospheric opacity and temperature directly govern solar power generation and rover mechanical lubrication viscosity.',
      coreCapabilities: ['NASA API stream ingestion', 'Diurnal temperature profiling', 'Dust opacity forecasting'],
      howToUse: ['Review incoming Sol meteorological records', 'Verify dust opacity remains within solar array operating limits'],
      toolsAndControls: ['Stream Status Pill', 'Atmospheric Sensor Readouts', 'Tau Gauge'],
      expectedOutput: 'Live atmospheric observations refreshed continuously.',
      realWorkflow: 'Engineers inspect dust optical depth prior to morning rover wake-up to calibrate daily solar energy budgets.',
      relatedModules: ['Safety & Environment', 'Radiation & Space Weather']
    },
    {
      id: 'mission-data',
      category: 'ROVER NAVIGATION',
      workflowStep: null,
      title: 'Mission Data & DEM',
      subtitle: 'HiRISE DTM Scale & Elevation Datums',
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      badge: 'PDS REPOSITORIES',
      summary: 'Scientific repository interface detailing official NASA Planetary Data System (PDS) product labels, resolution checksums, and reference datums.',
      whatIsIt: 'Mission Data & DEM provides rigorous documentation of all geospatial datasets ingested into MARSNAV, verifying coordinate reference systems and elevation datums against NASA PDS standards.',
      whyImportant: 'Planetary science requires absolute data provenance. Navigators must verify whether elevation is relative to the MOLA Areoid or local rover datum.',
      coreCapabilities: ['PDS3 and PDS4 label inspector', 'Elevation datum conversion', 'Dataset resolution checksum verification'],
      howToUse: ['Inspect ingested raster products', 'Verify datum standards (Mars Aeroid MOLA datum)', 'Cross-check spatial resolution in meters per pixel'],
      toolsAndControls: ['Dataset Metadata Table', 'PDS Header Viewer', 'Datum Selector'],
      expectedOutput: 'Verified dataset provenance meeting NASA planetary science publication standards.',
      realWorkflow: 'Mission archivists verify that imported HiRISE DTM PSP_001414_1780 matches the equirectangular projection centered on Jezero Crater.',
      relatedModules: ['Dataset Catalogue', 'Multilayer Orbital & Geological Data Fusion']
    },
    {
      id: 'configuration',
      category: 'ROVER NAVIGATION',
      workflowStep: 1,
      title: 'Step 01: Mission Configuration',
      subtitle: 'Rover Profile, Battery Reserves & Max Slope Constraints',
      icon: <Sliders className="w-5 h-5 text-orange-400" />,
      badge: 'INGESTION & SETUP',
      summary: 'Configures rover physical mass, wheel diameter, motor torque, battery energy capacity, and critical tipping slope thresholds.',
      whatIsIt: 'Mission Configuration sets the foundational boundary constraints for all downstream pathfinding and safety calculations in MARSNAV.',
      whyImportant: 'A path that is safe for a lightweight rover may cause wheel trenching or power exhaustion in a 1,025 kg vehicle like Perseverance.',
      coreCapabilities: ['Rover kinematic profiling', 'Battery energy budget configuration', 'Maximum slope angle thresholding'],
      howToUse: ['Select vehicle profile (e.g. Perseverance vs Curiosity)', 'Adjust battery capacity slider', 'Set maximum slope limit between 8° and 20°'],
      toolsAndControls: ['Rover Profile Dropdown', 'Slope Limit Slider', 'Battery Capacity Gauge', 'Motor Torque Selector'],
      expectedOutput: 'A verified vehicle kinematic profile governing pathfinding algorithms.',
      realWorkflow: 'Operators set max slope to 14° and battery reserve to 2,400 Wh before planning Sol 340 traverse across the delta rim.',
      relatedModules: ['Terrain Intelligence', 'Route Laboratory']
    },
    {
      id: 'base-camp-intel',
      category: 'ROVER NAVIGATION',
      workflowStep: null,
      title: 'Base Camp Intelligence',
      subtitle: 'Landing Site Slope & Communication LOS',
      icon: <Shield className="w-5 h-5 text-blue-400" />,
      badge: 'HABITAT INTEL',
      summary: 'Analyzes base camp location stability, line-of-sight communication coverage, and terrain hazards around the primary landing habitat.',
      whatIsIt: 'Base Camp Intelligence evaluates the security and operational connectivity of the primary habitat or lander touchdown zone.',
      whyImportant: 'Habitats require low-slope terrain (<5°), firm bedrock foundations, and unobstructed radio line-of-sight to orbiting relay satellites.',
      coreCapabilities: ['Touchdown slope evaluation', 'Line-of-sight (LOS) radio coverage mapping', 'Hab perimeter hazard perimeter buffers'],
      howToUse: ['Select habitat coordinates', 'Review LOS comms coverage across surrounding terrain', 'Verify terrain flatness within 100m radius'],
      toolsAndControls: ['LOS Radar View', 'Slope Stability Meter', 'Foundation Analysis Card'],
      expectedOutput: 'Verified habitat foundation stability and radio connectivity map.',
      realWorkflow: 'Mission planners verify that the Octavia E. Butler landing site has unobstructed UHF communications with the Mars Reconnaissance Orbiter.',
      relatedModules: ['Surface Explorer', 'Safety & Environment']
    },
    {
      id: 'nasa-raw-feed',
      category: 'ROVER NAVIGATION',
      workflowStep: 2,
      title: 'Step 02: NASA Raw Image Feed',
      subtitle: 'JPL Mars 2020 Navcam & Hazcam Downlink',
      icon: <Radio className="w-5 h-5 text-orange-400" />,
      badge: 'INGESTION & SETUP',
      summary: 'Directly downlinks and parses real raw image feeds from Perseverance, Curiosity, Opportunity, and Spirit rover cameras via NASA JPL APIs.',
      whatIsIt: 'This module is the authentic imagery ingestion conduit of MARSNAV, retrieving raw engineering Navcam and Hazcam frames directly from NASA JPL RSS feeds.',
      whyImportant: 'Navigators cannot plan safe traverses from orbital images alone; meter-scale rock hazards are only resolved in surface camera frames.',
      coreCapabilities: ['Multi-rover support (Perseverance, Curiosity, Opportunity, Spirit)', 'Camera filtering (Navcam, Hazcam, Mastcam)', 'Automatic Sol and pagination indexing'],
      howToUse: ['Select rover mission and Sol number', 'Filter by camera type (e.g. NAVCAM_LEFT)', 'Click any thumbnail to inspect metadata and load into MarsWalk Ops'],
      toolsAndControls: ['Mission Selector', 'Sol Search Bar', 'Camera Filter Dropdown', 'Raw Frame Gallery'],
      expectedOutput: 'Authentic Martian surface frames loaded into the active exploration session.',
      realWorkflow: 'Navigators downlink 6 Navcam stereo frames from Sol 680 to inspect a field of angular basalt boulders blocking the northern path.',
      relatedModules: ['MarsWalk Ops', 'Terrain Intelligence']
    },
    {
      id: 'dataset-catalogue',
      category: 'ROVER NAVIGATION',
      workflowStep: 3,
      title: 'Step 03: Dataset Catalogue',
      subtitle: 'PDS Compliance & Resolution Checksums',
      icon: <Database className="w-5 h-5 text-orange-400" />,
      badge: 'INGESTION & SETUP',
      summary: 'Verifies calibration headers, pixel checksums, and geodetic reference datums for all imported orbital rasters and terrain models.',
      whatIsIt: 'Dataset Catalogue is the data governance module ensuring that all raster DEMs and orthomosaics adhere to NASA Planetary Data System compliance.',
      whyImportant: 'Importing unverified or improperly projected rasters leads to catastrophic navigation errors in the field.',
      coreCapabilities: ['PDS3/PDS4 label parsing', 'Resolution checksum validation', 'Projection CRS verification'],
      howToUse: ['Inspect the list of registered datasets', 'Verify status is marked VERIFIED or PARTIALLY COMPATIBLE', 'Click source link to open NASA PDS catalogue records'],
      toolsAndControls: ['Dataset Grid', 'CRS Validator', 'PDS Record Linker'],
      expectedOutput: 'Guaranteed compliance with NASA cartographic and elevation standards.',
      realWorkflow: 'Engineers cross-check the resolution checksum of HiRISE DTM PSP_001414_1780 before initializing automated hazard detection.',
      relatedModules: ['Mission Data & DEM', 'Terrain Intelligence']
    },
    {
      id: 'terrain-intelligence',
      category: 'ROVER NAVIGATION',
      workflowStep: 4,
      title: 'Step 04: Terrain Intelligence',
      subtitle: 'Sobel Edge Detection & Contour Polygons',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      badge: 'TERRAIN & SAFETY',
      summary: 'Automated computer vision engine running edge gradients, contour extraction, and texture roughness scoring to identify obstacles.',
      whatIsIt: 'Terrain Intelligence executes real-time computer vision algorithms on surface photographs, extracting discrete rock contours and sandy regolith textures.',
      whyImportant: 'Manual identification of thousands of rocks is impossible in high-tempo missions. Automated CV extracts obstacles in milliseconds.',
      coreCapabilities: ['Sobel luminance gradient edge detection', 'Polygon contour generation around rocks', 'Surface roughness index scoring'],
      howToUse: ['Select filter mode (Sobel Edge, Slope Heatmap, Contour Polygons)', 'Observe extracted hazard polygons', 'Review detection count and confidence statistics'],
      toolsAndControls: ['Filter Mode Selector', 'Roughness Meter', 'Contour Vector Overlay'],
      expectedOutput: 'Vectorized obstacle polygons with quantified dimensions and spatial coordinates.',
      realWorkflow: 'The CV pipeline processes a 1024x1024 Navcam frame in 14ms, localizing 18 rocks exceeding the 15cm rover belly pan clearance limit.',
      relatedModules: ['Hazard Analysis', 'Route Laboratory']
    },
    {
      id: 'hazard-analysis',
      category: 'ROVER NAVIGATION',
      workflowStep: 5,
      title: 'Step 05: Hazard Analysis',
      subtitle: 'Adjustable Safety Buffers (2px to 28px)',
      icon: <ShieldAlert className="w-5 h-5 text-cyan-400" />,
      badge: 'TERRAIN & SAFETY',
      summary: 'Expands dynamic exclusion envelopes around detected obstacles to safeguard wheels and chassis from sharp rocks and pit perimeters.',
      whatIsIt: 'Hazard Analysis converts raw rock detections into buffered non-traversable exclusion zones based on rover geometry and wheel clearance margins.',
      whyImportant: 'Passing too close to a jagged rock risks wheel tearing or high-centering. Safety buffers enforce minimum bypass distances.',
      coreCapabilities: ['Configurable buffer margins (2px to 28px)', 'Exclusion zone area percentage calculation', 'Safe travel corridor quantification'],
      howToUse: ['Adjust the Safety Buffer slider between 2px and 28px', 'Observe exclusion envelopes expand around rock nodes on the radar canvas', 'Verify safe corridor area remains above 75%'],
      toolsAndControls: ['Buffer Margin Slider', 'Interactive Radar Canvas', 'Safe Travel Corridor Meter'],
      expectedOutput: 'A binary costmap where obstacles and buffer envelopes are marked strictly impassable.',
      realWorkflow: 'Navigators set an 18px buffer margin across the rocky Jezero crater floor, ensuring the rover stays at least 1.5m away from any sharp rock face.',
      relatedModules: ['Risk Assessment', 'Route Laboratory']
    },
    {
      id: 'risk-assessment',
      category: 'ROVER NAVIGATION',
      workflowStep: 6,
      title: 'Step 06: Risk Assessment',
      subtitle: 'Multi-Factor Traversal Safety Index',
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
      badge: 'TERRAIN & SAFETY',
      summary: 'Calculates multi-factor traversal safety scores incorporating slope gradient, wheel slip probability, rock density, and sun illumination angle.',
      whatIsIt: 'Risk Assessment synthesizes terrain roughness, slope steepness, and soil mechanics into a single quantitative Traversal Safety Score (0–100).',
      whyImportant: 'Navigators must weigh complex multi-factor risks before committing expensive flight hardware to a path.',
      coreCapabilities: ['Multi-factor risk weighting', 'Wheel slip probability modeling', 'Unified Traversal Safety Score (0-100)'],
      howToUse: ['Review the unified safety score across candidate corridors', 'Check individual risk factors (Slope Risk, Slip Risk, Rock Density)', 'Ensure total safety score exceeds 80 before proceeding to route computation'],
      toolsAndControls: ['Safety Score Gauge', 'Risk Breakdown Radar', 'Slip Probability Meter'],
      expectedOutput: 'A quantified risk assessment score verifying traverse feasibility.',
      realWorkflow: 'The algorithm evaluates a direct path across a sand ripple field at 64/100 (high slip risk), prompting navigators to choose a firmer 89/100 bedrock route.',
      relatedModules: ['Route Laboratory', 'Route Comparison']
    },
    {
      id: 'route-lab',
      category: 'ROVER NAVIGATION',
      workflowStep: 7,
      title: 'Step 07: Route Laboratory',
      subtitle: 'Interactive A* Pathfinding & Waypoint Editing',
      icon: <Navigation className="w-5 h-5 text-orange-400" />,
      badge: 'PATH COMPUTATION',
      summary: 'The primary algorithmic pathfinding laboratory in MARSNAV, computing collision-free A* trajectories across costmaps with strategy trade-offs.',
      whatIsIt: 'Route Laboratory is the computational pathfinding core of MARSNAV. It executes modified A* search across 8-connected grid matrices, finding optimal paths while avoiding obstacles and maximizing clearances.',
      whyImportant: 'Manual waypoint placement often misses tight obstacle gaps or takes unnecessarily long routes. Algorithmic A* pathfinding guarantees mathematically optimal solutions.',
      coreCapabilities: ['A* search with 4 distinct strategies (Alpha, Beta, Gamma, Delta)', 'Interactive Start and Goal waypoint placement', 'Real-time traverse distance, energy, and Sol duration calculations'],
      howToUse: ['Select Strategy (e.g. Route Gamma for maximum clearance, Route Alpha for shortest distance)', 'Click "Run Pathfinding" to execute the solver', 'Inspect the resulting green trajectory and waypoint matrix'],
      toolsAndControls: ['Strategy Selector (Alpha/Beta/Gamma/Delta)', 'Solve Button', 'Interactive 10x10 Grid Simulator', 'Telemetry Readouts'],
      expectedOutput: 'A verified, collision-free waypoint sequence optimized for rover kinematics.',
      realWorkflow: 'Engineers select Route Gamma to bypass a dangerous sand trap, generating a 158.4m path with a maximum collision margin of 24px.',
      relatedModules: ['Route Comparison', 'Scenario Testing']
    },
    {
      id: 'route-comparison',
      category: 'ROVER NAVIGATION',
      workflowStep: 8,
      title: 'Step 08: Route Comparison',
      subtitle: 'Distance vs Energy vs Safety Trade-Offs',
      icon: <Route className="w-5 h-5 text-orange-400" />,
      badge: 'PATH COMPUTATION',
      summary: 'Compares multiple candidate trajectories side-by-side, evaluating trade-offs between path length, watt-hour consumption, and collision safety margins.',
      whatIsIt: 'Route Comparison provides a multi-criteria decision matrix allowing flight directors to evaluate 4 distinct route strategies before transmission.',
      whyImportant: 'The shortest path is rarely the safest. Decision-makers need clear visual trade-offs between transit time, battery drain, and rock proximity.',
      coreCapabilities: ['Side-by-side route metrics comparison', 'Energy expenditure trade-off analysis', 'Safety margin vs traverse distance scoring'],
      howToUse: ['Review the 4-column comparison table', 'Compare Route Alpha (Shortest) against Route Gamma (Safest)', 'Select the winning trajectory to submit for validation'],
      toolsAndControls: ['Trade-Off Matrix Table', 'Metric Comparison Bars', 'Select Strategy Button'],
      expectedOutput: 'Clear quantitative justification for the selected traversal trajectory.',
      realWorkflow: 'Mission planners choose Route Gamma over Route Alpha because spending an extra 16 Wh of battery reduces obstacle collision probability by 78%.',
      relatedModules: ['Route Laboratory', 'Scenario Testing']
    },
    {
      id: 'scenario-testing',
      category: 'ROVER NAVIGATION',
      workflowStep: 9,
      title: 'Step 09: Scenario Testing',
      subtitle: 'Dust Storm & Anomaly Emergency Injection',
      icon: <AlertOctagon className="w-5 h-5 text-orange-400" />,
      badge: 'PATH COMPUTATION',
      summary: 'Injects simulated emergencies (sudden dust storms, wheel actuator jams, sensor dropouts) to stress-test path resilience.',
      whatIsIt: 'Scenario Testing is the stress-testing harness where mission planners simulate unexpected anomalies along a planned trajectory.',
      whyImportant: 'Mars is unpredictable. Verifying that a route has safe turnaround spots during a sudden dust storm or communication loss prevents mission loss.',
      coreCapabilities: ['Anomaly injection engine (Dust storm, Wheel lock, Low battery)', 'Dynamic path re-planning under degraded conditions', 'Emergency shelter waypoint identification'],
      howToUse: ['Select anomaly scenario to inject', 'Observe the algorithm recalculate emergency abort paths', 'Verify that the rover can reach a safe parking orientation'],
      toolsAndControls: ['Scenario Injector Buttons', 'Degraded Telemetry View', 'Emergency Abort Path Generator'],
      expectedOutput: 'Demonstrated trajectory resilience under severe operational anomalies.',
      realWorkflow: 'Navigators simulate a 50% battery dropout mid-traverse, verifying that the rover automatically redirects to a south-facing slope for emergency solar recharging.',
      relatedModules: ['Validation Harness', 'Mission Audit']
    },

    // =========================================================================
    // CATEGORY 6: VERIFICATION & AUDIT
    // =========================================================================
    {
      id: 'validation-harness',
      category: 'VERIFICATION & AUDIT',
      workflowStep: 10,
      title: 'Step 10: Validation Harness',
      subtitle: 'Automated Unit Test Diagnostics',
      icon: <Terminal className="w-5 h-5 text-emerald-400" />,
      badge: 'VERIFICATION & AUDIT',
      summary: 'Executes automated diagnostic test suites verifying mathematical solver convergence, coordinate conversions, and buffer envelope generation.',
      whatIsIt: 'Validation Harness is the automated software testing framework of MARSNAV, running unit tests across mathematical solvers, API connections, and coordinate transforms.',
      whyImportant: 'Software regressions or math rounding errors in mission control software can lead directly to rover collisions.',
      coreCapabilities: ['Automated diagnostic test execution', 'Sub-millisecond solver latency profiling', 'Coordinate conversion accuracy verification'],
      howToUse: ['Click "Run Diagnostics"', 'Review test results (PASS/FAIL) across all 4 core sub-engines', 'Verify total execution time is under 20ms'],
      toolsAndControls: ['Diagnostic Runner Button', 'Test Output Matrix', 'Latency Profiler'],
      expectedOutput: 'Green confirmation that all mathematical models are operating with 100% precision.',
      realWorkflow: 'Prior to daily uplink, operators run the validation harness to verify that the A* matrix solver passes all 14 regression benchmarks.',
      relatedModules: ['Model Evaluation', 'Mission Audit']
    },
    {
      id: 'model-eval',
      category: 'VERIFICATION & AUDIT',
      workflowStep: 11,
      title: 'Step 11: Model Evaluation',
      subtitle: 'Precision, Recall & CV Benchmarks',
      icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
      badge: 'VERIFICATION & AUDIT',
      summary: 'Benchmarks computer vision obstacle detection against verified NASA JPL AI4Mars ground-truth labeled datasets.',
      whatIsIt: 'Model Evaluation scores the machine learning and computer vision detectors against ground-truth datasets hand-labeled by NASA scientists.',
      whyImportant: 'Navigators need to know the exact false-positive and false-negative rates of the rock detector before trusting autonomous traversal.',
      coreCapabilities: ['Precision, recall, and F1-score calculation', 'Confusion matrix visualization', 'Benchmarking against AI4Mars verified ground truth'],
      howToUse: ['Inspect the model evaluation metrics card', 'Review precision (>95%) and recall (>90%) benchmarks', 'Check false-positive rates on sandy terrain'],
      toolsAndControls: ['Confusion Matrix Display', 'Precision/Recall Gauges', 'AI4Mars Benchmark Selector'],
      expectedOutput: 'Empirical verification of computer-vision reliability on Martian terrain.',
      realWorkflow: 'The CV team validates that the terrain segmenter achieves a 98.4% precision rate on Jezero delta conglomerate rocks.',
      relatedModules: ['Validation Harness', 'Mission Audit']
    },
    {
      id: 'audit',
      category: 'VERIFICATION & AUDIT',
      workflowStep: 12,
      title: 'Step 12: Mission Audit',
      subtitle: 'Compiled Dossier & One-Click PDF Report',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
      badge: 'VERIFICATION & AUDIT',
      summary: 'Compiles the complete operational dossier including route metrics, hazard logs, diagnostic checksums, and exports a one-click mission PDF report.',
      whatIsIt: 'Mission Audit is the final stage of the traversal pipeline. It compiles all inputs, telemetry, route waypoints, risk scores, and test logs into a certified mission document.',
      whyImportant: 'Every command sent to Mars must be archived in an immutable audit trail for NASA planetary mission records.',
      coreCapabilities: ['Automated operational dossier generation', 'Complete mathematical and coordinate checksums', 'One-click client-side PDF export'],
      howToUse: ['Review the compiled dossier summary cards', 'Verify that all 12 pipeline steps are marked VERIFIED', 'Click "Export Mission PDF Dossier" to download the report'],
      toolsAndControls: ['Dossier Summary Cards', 'PDF Export Generator', 'Mission Checksum Validator'],
      expectedOutput: 'A certified multi-page PDF operational dossier ready for flight authorization.',
      realWorkflow: 'The Lead Flight Director reviews the compiled Sol 340 dossier and signs off on telecommand uplink to the Deep Space Network.',
      relatedModules: ['Mission Overview', 'Validation Harness']
    },

    // =========================================================================
    // CATEGORY 7: SYSTEM & AI ASSISTANCE
    // =========================================================================
    {
      id: 'guide',
      category: 'SYSTEM & AI',
      workflowStep: null,
      title: 'Mission Manual',
      subtitle: 'Interactive Operating Manual & Learning Center',
      icon: <BookOpen className="w-5 h-5 text-cyan-400" />,
      badge: 'OPERATING MANUAL',
      summary: 'Comprehensive interactive operating manual, architectural map, and live simulator for all 32 MARSNAV exploration and navigation modules.',
      whatIsIt: 'This manual itself! It provides operators, engineers, and scientists with complete operational workflows, technical explanations, and interactive simulators.',
      whyImportant: 'Complex planetary exploration software requires thorough, accessible documentation to ensure mission personnel understand every tool and constraint.',
      coreCapabilities: ['Interactive workflow flowchart', 'Searchable 32-module documentation library', 'Embedded interactive hardware simulators'],
      howToUse: ['Browse the 12-Step Traversal Pipeline or Astronaut Exploration Workflow', 'Use the search bar to find specific algorithms or tools', 'Operate embedded interactive simulators'],
      toolsAndControls: ['Flowchart Tab', 'Modules Library', 'Architecture Map', 'Quick Reference'],
      expectedOutput: 'Complete mastery of MARSNAV flight software capabilities.',
      realWorkflow: 'New rover navigators spend their first week in the Mission Manual running interactive A* simulators before handling flight consoles.',
      relatedModules: ['Mission Overview', 'ORBIT AI Assistant']
    },
    {
      id: 'orbit-terminal',
      category: 'SYSTEM & AI',
      workflowStep: null,
      title: 'ORBIT AI Assistant',
      subtitle: 'Google Gemini Planetary Robotics Terminal',
      icon: <Bot className="w-5 h-5 text-purple-400" />,
      badge: 'AI ASSISTANT',
      summary: 'Conversational mission assistant powered by Google Gemini, answering complex questions on rover kinematics, Jezero mineralogy, and path safety.',
      whatIsIt: 'ORBIT is the intelligent mission assistant of MARSNAV. Connected to Google Gemini with autonomous fallback knowledge, it assists operators with expert engineering advice.',
      whyImportant: 'Having an instant expert capable of synthesizing rover telemetry with published planetary science literature speeds up tactical decision-making.',
      coreCapabilities: ['Conversational AI interface powered by Gemini 2.5 Flash', 'Planetary science and rover kinematics knowledge base', 'Autonomous fallback engine when offline'],
      howToUse: ['Type natural language questions in the chat terminal', 'Ask about slope slip limits, CRISM mineral signatures, or A* algorithm details', 'Receive instant, structured engineering recommendations'],
      toolsAndControls: ['Chat Input Bar', 'Conversation History Log', 'Model Selector', 'Clear Memory Button'],
      expectedOutput: 'Actionable, scientifically grounded engineering recommendations.',
      realWorkflow: 'An operator asks: "What is the slip probability of 14° sand dunes at Jezero Delta?", and ORBIT returns empirical wheel-soil interaction equations.',
      relatedModules: ['Mission Manual', 'Mission Overview']
    },
    {
      id: 'settings',
      category: 'SYSTEM & AI',
      workflowStep: null,
      title: 'System Settings',
      subtitle: 'Workstation Preferences & Display Cache',
      icon: <Settings className="w-5 h-5 text-slate-400" />,
      badge: 'SYSTEM CONFIG',
      summary: 'Configures client display preferences, map rendering quality, audio feedback, unit systems (metric/imperial), and clears local storage caches.',
      whatIsIt: 'System Settings manages the personal preferences, rendering options, and local caching behavior of the MARSNAV workstation.',
      whyImportant: 'Different operators require tailored interface contrasts, audio alert volumes, and cache management for high-stress mission shifts.',
      coreCapabilities: ['Display theme and contrast toggles', 'Unit preference selector', 'Audio alert controls', 'Cache purge utility'],
      howToUse: ['Adjust audio volume for mission alarms', 'Configure preferred coordinate formats', 'Clear local storage cache if required'],
      toolsAndControls: ['Theme Toggles', 'Unit Selector', 'Audio Volume Sliders', 'Cache Reset Utility'],
      expectedOutput: 'Persisted user preferences applied across the workstation.',
      realWorkflow: 'Operators adjust interface contrast and alarm volume during night-shift operations in the mission control room.',
      relatedModules: ['Mission Overview', 'Mission Configuration']
    }
  ], []);

  // Filtered manual sections for search & categories
  const filteredSections = useMemo(() => {
    return manualSections.filter(sec => {
      const matchesSearch = searchQuery.trim() === '' ||
        sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.whatIsIt.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategoryFilter === 'ALL' || sec.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [manualSections, searchQuery, selectedCategoryFilter]);

  // Active section resolution
  const activeSection = useMemo(() => {
    return manualSections.find(s => s.id === selectedSectionId) || manualSections[0];
  }, [manualSections, selectedSectionId]);

  // Active workflow step info if applicable
  const activeWorkflowStep = useMemo(() => {
    return currentWorkflowSteps.find(s => s.id === selectedSectionId) || null;
  }, [currentWorkflowSteps, selectedSectionId]);

  // Previous and next workflow steps for navigation
  const prevWorkflowStep = useMemo(() => {
    if (!activeWorkflowStep) return null;
    const currentIndex = currentWorkflowSteps.findIndex(s => s.step === activeWorkflowStep.step);
    return currentIndex > 0 ? currentWorkflowSteps[currentIndex - 1] : null;
  }, [activeWorkflowStep, currentWorkflowSteps]);

  const nextWorkflowStep = useMemo(() => {
    if (!activeWorkflowStep) return null;
    const currentIndex = currentWorkflowSteps.findIndex(s => s.step === activeWorkflowStep.step);
    return currentIndex < currentWorkflowSteps.length - 1 ? currentWorkflowSteps[currentIndex + 1] : null;
  }, [activeWorkflowStep, currentWorkflowSteps]);

  // Helper to run simulated A* path calculation
  const handleSolveRoute = () => {
    setIsSolvingRoute(true);
    setTimeout(() => {
      if (selectedStrategy === 'Alpha') {
        setActiveRoutePath([0, 1, 2, 3, 14, 25, 36, 47, 58, 69, 79, 88]);
      } else if (selectedStrategy === 'Beta') {
        setActiveRoutePath([0, 10, 20, 30, 40, 51, 61, 71, 72, 73, 84, 88]);
      } else if (selectedStrategy === 'Gamma') {
        setActiveRoutePath([0, 1, 2, 11, 21, 31, 41, 42, 43, 53, 54, 65, 75, 86, 87, 88]);
      } else {
        setActiveRoutePath([0, 1, 12, 22, 32, 33, 34, 44, 54, 66, 77, 88]);
      }
      setIsSolvingRoute(false);
    }, 500);
  };

  const handleRunDiagnostics = () => {
    setDiagnosticRunning(true);
    setDiagnosticDone(false);
    setTimeout(() => {
      setDiagnosticRunning(false);
      setDiagnosticDone(true);
    }, 700);
  };

  const categories = [
    'ALL',
    'ASTRONAUT SURFACE OPERATIONS',
    'MARS ENVIRONMENT & SCIENCE',
    'ASTRONAUT MOBILITY & NAVIGATION',
    'MISSION DATA & FIELD OPERATIONS',
    'ROVER NAVIGATION',
    'VERIFICATION & AUDIT',
    'SYSTEM & AI'
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#050814] border border-white/20 rounded-3xl w-full max-w-[1540px] h-[94vh] flex flex-col overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
      >
        {/* Top Header Bar */}
        <div className="h-16 bg-[#04060f] border-b border-white/10 px-5 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/25 to-red-500/15 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-inner">
              <Workflow className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-white font-extrabold text-sm sm:text-base tracking-wide font-sans">
                  MARSNAV — Interactive Operating Manual
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Mission Control Standard v4.5
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  DSN ONLINE
                </span>
              </div>
              <p className="text-slate-400 text-xs font-mono hidden sm:block">
                Professional NASA mission-control software manual &amp; astronaut exploration learning center
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 bg-black/50 px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>{simulatedClock}</span>
            </div>

            <div className="hidden sm:flex items-center space-x-2 bg-black/50 px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
              <span className="text-orange-400 font-bold">{manualSections.length}</span>
              <span className="text-slate-400">Modules Active</span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 cursor-pointer transition"
              title="Close Manual [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Bar (Tabbed Operating Views) */}
        <div className="h-13 bg-[#070b19] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 font-mono text-xs gap-2 overflow-x-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setCurrentView('flowchart')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 ${
                currentView === 'flowchart'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
              }`}
            >
              <Workflow className="w-4 h-4 text-orange-300" />
              <span>Mission Workflows</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-orange-200">12 Steps</span>
            </button>

            <button
              onClick={() => setCurrentView('index')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 ${
                currentView === 'index'
                  ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
              }`}
            >
              <BookMarked className="w-4 h-4 text-cyan-300" />
              <span>All {manualSections.length} Modules Library</span>
            </button>

            <button
              onClick={() => setCurrentView('map')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 ${
                currentView === 'map'
                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
              }`}
            >
              <Compass className="w-4 h-4 text-indigo-300" />
              <span>Architecture Navigation Map</span>
            </button>

            <button
              onClick={() => setCurrentView('quickref')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 ${
                currentView === 'quickref'
                  ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>Quick Reference</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onNavigateWorkspace && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateWorkspace(selectedSectionId);
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <span>OPEN MODULE IN MARSNAV</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* ======================================================== */}
          {/* VIEW 1: HERO MISSION WORKFLOW FLOWCHART (INTERACTIVE)    */}
          {/* ======================================================== */}
          {currentView === 'flowchart' ? (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#030611]">
              {/* Left Flowchart Track & Stepper Canvas */}
              <div className="w-full lg:w-[480px] xl:w-[540px] border-r border-white/10 bg-[#040817] flex flex-col shrink-0 overflow-hidden">
                {/* Workflow Pipeline Switcher Header */}
                <div className="p-4 border-b border-white/10 bg-[#050a1d] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Interactive Traversal Pipeline</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Sequential A*
                    </span>
                  </div>

                  {/* Pipeline Toggle Tabs: Rover vs Astronaut Surface Exploration */}
                  <div className="grid grid-cols-2 gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 font-mono text-xs">
                    <button
                      onClick={() => {
                        setActiveWorkflowPipeline('rover');
                        setSelectedSectionId(ROVER_WORKFLOW_STEPS[0].id);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                        activeWorkflowPipeline === 'rover'
                          ? 'bg-orange-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Rover 12-Step Pipeline
                    </button>
                    <button
                      onClick={() => {
                        setActiveWorkflowPipeline('astronaut');
                        setSelectedSectionId(ASTRONAUT_WORKFLOW_STEPS[0].id);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                        activeWorkflowPipeline === 'astronaut'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Astronaut Surface EVA
                    </button>
                  </div>
                </div>

                {/* Vertical Scrollable Flowchart Nodes List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                  {currentWorkflowSteps.map((wf, idx) => {
                    const isSelected = selectedSectionId === wf.id;
                    const isLast = idx === currentWorkflowSteps.length - 1;

                    return (
                      <div key={wf.id} className="relative group">
                        {!isLast && (
                          <div className="absolute left-6 top-13 bottom-[-14px] w-0.5 z-0">
                            <div className={`w-full h-full transition-colors duration-300 ${
                              isSelected ? 'bg-gradient-to-b from-orange-500 to-cyan-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-white/15'
                            }`} />
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-cyan-400 -left-[3px] absolute animate-bounce shadow-[0_0_10px_rgba(6,182,212,1)]" />
                            )}
                          </div>
                        )}

                        {/* Step Card Node */}
                        <div
                          onClick={() => setSelectedSectionId(wf.id)}
                          className={`relative z-10 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-gradient-to-r from-orange-950/40 via-[#0b1430] to-[#0d1c3a] border-orange-500 shadow-[0_4px_25px_rgba(249,115,22,0.25)] scale-[1.01]'
                              : 'bg-[#060c20]/90 border-white/10 hover:border-cyan-500/50 hover:bg-[#081028]'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-transform ${
                              isSelected
                                ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.8)] scale-110'
                                : 'bg-white/5 text-slate-300 border border-white/15 group-hover:border-cyan-400 group-hover:text-cyan-300'
                            }`}>
                              {wf.step < 10 ? `0${wf.step}` : wf.step}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${wf.phaseColor}`}>
                                  {wf.phase.split(' ')[0]}
                                </span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                  wf.status === 'ACTIVE' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                                  wf.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                }`}>
                                  {wf.status}
                                </span>
                              </div>
                              <h4 className={`text-xs font-bold font-sans truncate mt-1 ${
                                isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                              }`}>
                                {wf.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-sans truncate mt-0.5">
                                {wf.shortDesc}
                              </p>
                            </div>
                          </div>

                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected ? 'text-orange-400 translate-x-1' : 'text-slate-500 group-hover:text-slate-300'
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-[#040715] border-t border-white/10 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    12 Pipeline Nodes Online
                  </span>
                  <button
                    onClick={() => setCurrentView('map')}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Subsystem Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Right Detail & Interactive Demonstration Panel */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-[#030611] text-slate-200">
                {/* Header Banner for Selected Node */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0d162f] via-[#091024] to-[#050a18] border border-white/15 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-orange-500 text-white shadow-md">
                          {activeWorkflowStep ? `STEP 0${activeWorkflowStep.step} OF 12` : activeSection.category.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                          {activeSection.subtitle}
                        </span>
                      </div>

                      {/* Step Navigators */}
                      <div className="flex items-center space-x-2">
                        {prevWorkflowStep && (
                          <button
                            onClick={() => setSelectedSectionId(prevWorkflowStep.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition cursor-pointer flex items-center gap-1"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Step 0{prevWorkflowStep.step}</span>
                          </button>
                        )}
                        {nextWorkflowStep && (
                          <button
                            onClick={() => setSelectedSectionId(nextWorkflowStep.id)}
                            className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 hover:text-white border border-orange-500/40 text-xs font-mono transition cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <span>Step 0{nextWorkflowStep.step}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 pt-1">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                        {activeSection.icon}
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                          {activeSection.title}
                        </h1>
                        <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                          {activeSection.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* INTERACTIVE DEMONSTRATION WIDGET (CONTEXTUAL PER STEP)    */}
                {/* ======================================================== */}
                <div className="p-6 rounded-3xl bg-[#070d22] border border-orange-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2 text-orange-400 font-mono text-xs font-bold uppercase tracking-wider">
                      <Play className="w-4 h-4 fill-orange-400" />
                      <span>Live Interactive Demonstration — {activeSection.title}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">
                      Real-Time Operational Simulator
                    </span>
                  </div>

                  {/* 1. ROUTE LAB INTERACTIVE A* SIMULATOR */}
                  {selectedSectionId === 'route-lab' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>Route Strategy:</span>
                          {(['Alpha', 'Beta', 'Gamma', 'Delta'] as const).map(strat => (
                            <button
                              key={strat}
                              onClick={() => {
                                setSelectedStrategy(strat);
                                handleSolveRoute();
                              }}
                              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer text-xs ${
                                selectedStrategy === strat
                                  ? 'bg-orange-500 text-white border-orange-400 font-bold shadow'
                                  : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
                              }`}
                            >
                              {strat}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSolveRoute}
                            disabled={isSolvingRoute}
                            className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs font-mono transition cursor-pointer shadow flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSolvingRoute ? 'animate-spin' : ''}`} />
                            <span>{isSolvingRoute ? 'Computing A*...' : 'Run Pathfinding'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setGridObstacles(prev => prev.length > 5 ? [14, 25, 36, 47, 58] : [12, 13, 23, 24, 35, 45, 55, 62, 63, 64]);
                              handleSolveRoute();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono cursor-pointer"
                          >
                            Toggle Obstacles
                          </button>
                        </div>
                      </div>

                      {/* 10x10 Mini Grid Simulator */}
                      <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col md:flex-row items-center gap-6">
                        <div className="grid grid-cols-10 gap-1 p-2 bg-[#050a18] rounded-xl border border-white/10 w-fit shrink-0">
                          {Array.from({ length: 100 }).map((_, cellIdx) => {
                            const isStart = cellIdx === 0;
                            const isGoal = cellIdx === 88;
                            const isObstacle = gridObstacles.includes(cellIdx);
                            const isPath = activeRoutePath.includes(cellIdx);

                            return (
                              <div
                                key={cellIdx}
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[9px] font-mono font-bold transition-all ${
                                  isStart ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.9)]' :
                                  isGoal ? 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.9)]' :
                                  isObstacle ? 'bg-slate-700 border border-slate-600' :
                                  isPath ? 'bg-orange-500 text-white shadow-[0_0_8px_rgba(249,115,22,0.9)]' :
                                  'bg-white/[0.03] border border-white/5 hover:bg-white/10'
                                }`}
                                title={`Cell ${cellIdx}`}
                              >
                                {isStart ? 'S' : isGoal ? 'D' : ''}
                              </div>
                            );
                          })}
                        </div>

                        {/* Route Telemetry Matrix */}
                        <div className="flex-1 w-full space-y-3 font-mono text-xs">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="text-[10px] text-slate-400">TRAVERSE DISTANCE</div>
                              <div className="text-base font-bold text-orange-400 mt-0.5">
                                {selectedStrategy === 'Alpha' ? '124.8 m' : selectedStrategy === 'Gamma' ? '158.4 m' : '141.2 m'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="text-[10px] text-slate-400">EST. ENERGY</div>
                              <div className="text-base font-bold text-cyan-400 mt-0.5">
                                {selectedStrategy === 'Alpha' ? '46.2 Wh' : selectedStrategy === 'Gamma' ? '62.0 Wh' : '53.8 Wh'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="text-[10px] text-slate-400">COLLISION MARGIN</div>
                              <div className="text-base font-bold text-emerald-400 mt-0.5">
                                {selectedStrategy === 'Gamma' ? 'MAX (24px)' : 'NOMINAL (14px)'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="text-[10px] text-slate-400">EST. SOL TIME</div>
                              <div className="text-base font-bold text-amber-300 mt-0.5">19 min 40s</div>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/30 text-slate-300 text-xs">
                            <span className="text-orange-400 font-bold">A* Solver Status:</span> Traversal trajectory verified collision-free. Waypoints are spaced at nominal 10m intervals for autonomous visual odometry.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 1. SURFACE MISSION DASHBOARD DEMO */}
                  {selectedSectionId === 'surface-dashboard' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEvaIsRunning(!evaIsRunning)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {evaIsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{evaIsRunning ? 'Pause EVA Clock' : 'Resume EVA Clock'}</span>
                          </button>
                          <button
                            onClick={() => setEvaDurationSec(3600)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="text-cyan-400 font-bold text-sm">
                          EVA Duration: {Math.floor(evaDurationSec / 3600)}h {Math.floor((evaDurationSec % 3600) / 60)}m {evaDurationSec % 60}s
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase">Suit Pressure</span>
                          <div className="text-lg font-bold text-emerald-400">29.6 kPa</div>
                          <span className="text-[10px] text-slate-500">Pure O2 (Nominal)</span>
                        </div>
                        <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase">Oxygen Reserves</span>
                          <div className="text-lg font-bold text-cyan-400">{astronautSuitO2}%</div>
                          <span className="text-[10px] text-slate-500">5.2 Hours Remaining</span>
                        </div>
                        <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase">Astronaut Heart Rate</span>
                          <div className="text-lg font-bold text-amber-400">{astronautHeartRate} BPM</div>
                          <span className="text-[10px] text-slate-500">Metabolic: 280 kcal/hr</span>
                        </div>
                        <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase">DSN Comms RSSI</span>
                          <div className="text-lg font-bold text-purple-400">-68 dBm</div>
                          <span className="text-[10px] text-slate-500">Latency: 14.2 min RTT</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 2. MISSION SCIENCE PLANNER DEMO */}
                  {selectedSectionId === 'science-planner' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1.5">
                          <span className="text-[10px] text-slate-400 uppercase block">1. Research Target</span>
                          <select
                            value={selectedScienceTarget}
                            onChange={e => setSelectedScienceTarget(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-cyan-300 font-bold"
                          >
                            <option value="delta_fan">Jezero Delta Fan Mudstone</option>
                            <option value="crater_rim">Belva Crater Rim Carbonates</option>
                            <option value="sulfate_margin">Hydrated Sulfate Margin</option>
                          </select>
                        </div>

                        <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1.5">
                          <span className="text-[10px] text-slate-400 uppercase block">2. Instrument Allocation</span>
                          <select
                            value={scienceInstrument}
                            onChange={e => setScienceInstrument(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-purple-300 font-bold"
                          >
                            <option value="SuperCam">SuperCam Laser (LIBS)</option>
                            <option value="SHERLOC">SHERLOC UV Raman</option>
                            <option value="PIXL">PIXL Micro-XRF</option>
                          </select>
                        </div>

                        <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1.5">
                          <span className="text-[10px] text-slate-400 uppercase block">3. Target Priority</span>
                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              onClick={() => setSciencePriority('PRIMARY')}
                              className={`flex-1 py-1 rounded-lg font-bold ${sciencePriority === 'PRIMARY' ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400'}`}
                            >
                              Primary
                            </button>
                            <button
                              onClick={() => setSciencePriority('SECONDARY')}
                              className={`flex-1 py-1 rounded-lg font-bold ${sciencePriority === 'SECONDARY' ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400'}`}
                            >
                              Secondary
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300 font-bold">Planned Science Timeline Sequence</span>
                          <span className="text-emerald-400 font-bold">Total Duration: 55 Minutes</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                          <div className="p-2 bg-black/40 rounded border border-white/5">
                            <strong>00-15m:</strong> Context imaging &amp; stand-off Raman scan.
                          </div>
                          <div className="p-2 bg-black/40 rounded border border-white/5">
                            <strong>15-35m:</strong> Abrasion patch cleaning &amp; XRF mapping.
                          </div>
                          <div className="p-2 bg-black/40 rounded border border-white/5">
                            <strong>35-55m:</strong> Hermetic sample core extraction to Tube #12.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 3. MARS SURFACE EXPLORER DEMO */}
                  {selectedSectionId === 'surface-explorer' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Inspect Science Waypoint:</span>
                          {['Kodiak Butte', 'Delta Scarp', 'Belva Rim'].map(poi => (
                            <button
                              key={poi}
                              onClick={() => setSelectedPoiName(poi)}
                              className={`px-3 py-1 rounded-lg border cursor-pointer ${
                                selectedPoiName === poi ? 'bg-cyan-600 text-white border-cyan-400 font-bold' : 'bg-slate-900 text-slate-400 border-white/10'
                              }`}
                            >
                              {poi}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-300">
                          <Compass className="w-3.5 h-3.5" />
                          <span>MOLA Datum: -2,540 m (Areoid)</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950 rounded-xl border border-cyan-500/30 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-black/50 rounded-lg">
                          <span className="text-slate-500 text-[10px] block">TARGET FEATURE</span>
                          <span className="text-white font-bold text-sm">{selectedPoiName}</span>
                        </div>
                        <div className="p-3 bg-black/50 rounded-lg">
                          <span className="text-slate-500 text-[10px] block">STRATIGRAPHIC AGE</span>
                          <span className="text-amber-300 font-bold">Late Noachian (~3.8 Ga)</span>
                        </div>
                        <div className="p-3 bg-black/50 rounded-lg">
                          <span className="text-slate-500 text-[10px] block">SCIENTIFIC SIGNIFICANCE</span>
                          <span className="text-emerald-400 font-bold">Deltaic sediment fan deposits</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 4. MULTILAYER DATA FUSION DEMO */}
                  {selectedSectionId === 'multilayer-map' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-400">Toggle Overlays:</span>
                          <button
                            onClick={() => setDemoLayerTrek(!demoLayerTrek)}
                            className={`px-2.5 py-1 rounded border cursor-pointer ${demoLayerTrek ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                          >
                            CTX Optical
                          </button>
                          <button
                            onClick={() => setDemoLayerHillshade(!demoLayerHillshade)}
                            className={`px-2.5 py-1 rounded border cursor-pointer ${demoLayerHillshade ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                          >
                            HRSC Hillshade
                          </button>
                          <button
                            onClick={() => setDemoLayerThemis(!demoLayerThemis)}
                            className={`px-2.5 py-1 rounded border cursor-pointer ${demoLayerThemis ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                          >
                            THEMIS IR
                          </button>
                          <button
                            onClick={() => setDemoLayerGeology(!demoLayerGeology)}
                            className={`px-2.5 py-1 rounded border cursor-pointer ${demoLayerGeology ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                          >
                            SIM 3292 Geology
                          </button>
                          <button
                            onClick={() => setDemoLayerDetections(!demoLayerDetections)}
                            className={`px-2.5 py-1 rounded border cursor-pointer ${demoLayerDetections ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                          >
                            CV Bounding Boxes
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Opacity:</span>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={demoFusionOpacity}
                            onChange={e => setDemoFusionOpacity(Number(e.target.value))}
                            className="w-24 accent-cyan-400"
                          />
                          <span className="text-cyan-300">{Math.round(demoFusionOpacity * 100)}%</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950 rounded-xl border border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-cyan-400" />
                          <span>Active Compositor: <strong>{demoLayerTrek ? 'CTX 6m' : 'Base'} + {demoLayerGeology ? 'USGS SIM 3292' : 'None'}</strong></span>
                        </div>
                        <span className="text-emerald-400 font-bold">Zero Text Collision Mode Active</span>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 5. SAFETY & ENVIRONMENT DEMO */}
                  {selectedSectionId === 'safety-monitoring' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-black/50 rounded-xl border border-white/10 space-y-2">
                          <div className="flex justify-between">
                            <span>Dust Opacity (Tau):</span>
                            <span className="text-amber-400 font-bold">{demoDustTau.toFixed(2)} Tau</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="2.5"
                            step="0.05"
                            value={demoDustTau}
                            onChange={e => setDemoDustTau(Number(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>0.1 (Clear Sky)</span>
                            <span>1.0 (Haze)</span>
                            <span>2.5 (Severe Dust Storm)</span>
                          </div>
                        </div>

                        <div className="p-4 bg-black/50 rounded-xl border border-white/10 space-y-2">
                          <div className="flex justify-between">
                            <span>Diurnal Ambient Temperature:</span>
                            <span className="text-cyan-400 font-bold">{demoAtmosTemp}°C</span>
                          </div>
                          <input
                            type="range"
                            min="-85"
                            max="5"
                            step="1"
                            value={demoAtmosTemp}
                            onChange={e => setDemoAtmosTemp(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>-85°C (Night Min)</span>
                            <span>-55°C (Mean)</span>
                            <span>+5°C (Summer Peak)</span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border font-bold flex items-center justify-between ${
                        demoDustTau > 1.2 ? 'bg-red-950/40 border-red-500/60 text-red-300' : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      }`}>
                        <span>Hazard Status: {demoDustTau > 1.2 ? 'DUST STORM CAUTION — Solar Array Output Down 65%' : 'ATMOSPHERE NOMINAL — 742 Pa Surface Pressure'}</span>
                        <span>Safety Index: {demoDustTau > 1.2 ? '54/100' : '92/100'}</span>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 6. GEOLOGICAL TARGETS DEMO */}
                  {selectedSectionId === 'geological-targets' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { id: 'smectite_clay', name: 'Smectite Clay Member', min: 'Fe/Mg Phyllosilicates', score: 96 },
                          { id: 'magnesite_carb', name: 'Magnesite Carbonate Rim', min: 'Precipitated Carbonates', score: 91 },
                          { id: 'hydrated_sulfate', name: 'Hydrated Sulfate Margin', min: 'Evaporite Sulfates', score: 84 }
                        ].map(t => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedMineralTarget(t.id as any)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              selectedMineralTarget === t.id
                                ? 'bg-pink-950/40 border-pink-500 shadow-md'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-white">{t.name}</span>
                              <span className="text-pink-400 font-bold">{t.score}/100</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">{t.min}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-white/10 flex items-center justify-between">
                        <span>Investigation Status: <strong>{targetInvestigationStatus}</strong></span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTargetInvestigationStatus('Identified')}
                            className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                          >
                            Identified
                          </button>
                          <button
                            onClick={() => setTargetInvestigationStatus('In Progress')}
                            className="px-2 py-1 rounded bg-amber-600 text-white"
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => setTargetInvestigationStatus('Sample Cached')}
                            className="px-2 py-1 rounded bg-emerald-600 text-white"
                          >
                            Sample Cached
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 7. SUIT MOBILITY DEMO */}
                  {selectedSectionId === 'suit-mobility' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="p-4 bg-black/50 rounded-xl border border-white/10 space-y-2">
                        <div className="flex justify-between">
                          <span>Terrain Incline Slope:</span>
                          <span className="text-emerald-400 font-bold">{suitSlopeDeg}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="25"
                          value={suitSlopeDeg}
                          onChange={e => {
                            const sl = Number(e.target.value);
                            setSuitSlopeDeg(sl);
                            setAstronautPaceKmH(Math.max(0.6, 3.8 - sl * 0.14));
                          }}
                          className="w-full accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>0° (Flat Pavement)</span>
                          <span>12° (Nominal Grade)</span>
                          <span>25° (Critical Tipping Limit)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">WALKING SPEED</span>
                          <span className="text-base font-bold text-cyan-400">{astronautPaceKmH.toFixed(1)} km/h</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">METABOLIC WORKLOAD</span>
                          <span className="text-base font-bold text-amber-400">{Math.round(200 + suitSlopeDeg * 16)} kcal/hr</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">SUIT JOINT TORQUE</span>
                          <span className="text-base font-bold text-purple-400">{Math.round(45 + suitSlopeDeg * 2.8)} Nm</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">FATIGUE MARGIN</span>
                          <span className={`text-base font-bold ${suitSlopeDeg > 15 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {suitSlopeDeg > 15 ? 'HIGH STRAIN' : 'NOMINAL'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 8. ASTRONAUT ROUTE PLANNER DEMO */}
                  {selectedSectionId === 'astronaut-route-planner' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span>Obstacle Avoidance Radius:</span>
                          <span className="text-orange-400 font-bold">{avoidanceBufferM.toFixed(1)} meters</span>
                        </div>
                        <button
                          onClick={() => setAvoidanceBufferM(prev => (prev === 4 ? 6 : 4))}
                          className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300"
                        >
                          Toggle 4m / 6m Buffer
                        </button>
                      </div>

                      <div className="p-4 bg-black/60 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-900/60 rounded-lg">
                          <span className="text-slate-400 text-[10px] block">TOTAL WALK DISTANCE</span>
                          <span className="text-lg font-bold text-orange-400">324.6 meters</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-lg">
                          <span className="text-slate-400 text-[10px] block">ESTIMATED WALK TIME</span>
                          <span className="text-lg font-bold text-cyan-400">7 mins 12 secs</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-lg">
                          <span className="text-slate-400 text-[10px] block">SAFETY CLEARANCE</span>
                          <span className="text-lg font-bold text-emerald-400">100% COLLISION FREE</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 9. RADIATION & SPACE WEATHER DEMO */}
                  {selectedSectionId === 'radiation-monitor' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Solar Flare Class:</span>
                          {(['C1.2', 'M2.4', 'X1.1'] as const).map(fl => (
                            <button
                              key={fl}
                              onClick={() => {
                                setSolarFlareClass(fl);
                                setSpeAlertActive(fl === 'X1.1');
                              }}
                              className={`px-2.5 py-1 rounded border font-bold ${
                                solarFlareClass === fl ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {fl}
                            </button>
                          ))}
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold ${speAlertActive ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {speAlertActive ? 'SPE ALARM ACTIVE — SHELTER REQUIRED' : 'GCR BACKGROUND ONLY'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">SURFACE DOSE RATE</span>
                          <span className="text-base font-bold text-yellow-400">0.64 mGy/day</span>
                          <span className="text-[10px] text-slate-500">MSL RAD Baseline</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">PROTON FLUX (&gt;=10 MeV)</span>
                          <span className="text-base font-bold text-cyan-400">{speAlertActive ? '142 pfu' : '0.12 pfu'}</span>
                          <span className="text-[10px] text-slate-500">NOAA GOES Primary</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">30-DAY CUMULATIVE</span>
                          <span className="text-base font-bold text-emerald-400">19.2 mSv</span>
                          <span className="text-[10px] text-slate-500">Limit: 250 mSv ALARA</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10">
                          <span className="text-[10px] text-slate-400 block">DONKI ALERT FEED</span>
                          <span className="text-base font-bold text-purple-400">CLEAR</span>
                          <span className="text-[10px] text-slate-500">No CME Interception</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ASTRONAUT 10. MARSWALK OPS FIELD DEMO */}
                  {selectedSectionId === 'marsnav-v4' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setMarsWalkPlaying(!marsWalkPlaying)}
                            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {marsWalkPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{marsWalkPlaying ? 'Pause Sequence' : 'Play Trajectory Sequence'}</span>
                          </button>
                          <button
                            onClick={() => setMarsWalkStep(prev => (prev >= 4 ? 1 : prev + 1))}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer flex items-center gap-1"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                            <span>Step Forward</span>
                          </button>
                          <button
                            onClick={() => setMarsWalkStep(1)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                        <span className="text-orange-400 font-bold">Stage {marsWalkStep} of 4</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                        {[
                          '1. Raw Frame Downlink',
                          '2. CV Feature Bounding',
                          '3. Footprint Stride Plan',
                          '4. Astrobiology Sampling'
                        ].map((st, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border ${
                              marsWalkStep === i + 1
                                ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
                                : 'bg-black/40 border-white/5 text-slate-500'
                            }`}
                          >
                            {st}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback for other standard modules */}
                  {!['route-lab', 'surface-dashboard', 'science-planner', 'surface-explorer', 'multilayer-map', 'safety-monitoring', 'geological-targets', 'suit-mobility', 'astronaut-route-planner', 'radiation-monitor', 'marsnav-v4'].includes(selectedSectionId) && (
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
                      <div className="space-y-1">
                        <div className="text-slate-200 font-bold flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <span>Autonomous System Telemetry Nominal</span>
                        </div>
                        <p className="text-slate-400 text-[11px] font-sans">
                          Synchronized with the authoritative MARSNAV mission memory and real NASA planetary endpoints.
                        </p>
                      </div>
                      {onNavigateWorkspace && (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateWorkspace(selectedSectionId);
                          }}
                          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 shrink-0 shadow-md"
                        >
                          <span>Open Live Workspace</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ======================================================== */}
                {/* DETAILED TECHNICAL DOCUMENTATION SECTIONS (A THROUGH G)   */}
                {/* ======================================================== */}

                {/* A. Overview & Purpose */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Info className="w-4 h-4" />
                    <span>A. Module Overview &amp; Mission Purpose</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-sans">
                    {activeSection.whatIsIt}
                  </p>
                </div>

                {/* B. Why It Is Critical */}
                <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Zap className="w-4 h-4" />
                    <span>B. Why This Module Is Needed &amp; Safety Relevance</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-sans">
                    {activeSection.whyImportant}
                  </p>
                </div>

                {/* C. How to Operate */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>C. Step-by-Step Operating Instructions</span>
                  </div>
                  <div className="space-y-2.5 pt-1">
                    {activeSection.howToUse.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-3 text-xs sm:text-sm font-sans text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center font-mono text-xs shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* D. Available Tools & Controls */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>D. Available Tools, Controls &amp; Inputs</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {activeSection.toolsAndControls.map((tool, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-sans text-slate-300 flex items-start space-x-2.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                        <span className="leading-relaxed">{tool}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* E. Expected Output */}
                <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Check className="w-4 h-4" />
                    <span>E. Expected Outputs &amp; Scientific Interpretation</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-sans">
                    {activeSection.expectedOutput}
                  </p>
                </div>

                {/* F. Real Mission Workflow Scenario */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Compass className="w-4 h-4" />
                    <span>F. Practical Operational Mission Scenario</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-sans italic">
                    &ldquo;{activeSection.realWorkflow}&rdquo;
                  </p>
                </div>

                {/* G. Integration with Other Modules */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300 font-bold text-xs font-mono uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-orange-400" />
                      <span>G. Downstream Inter-Module Integration</span>
                    </div>
                    {nextWorkflowStep && (
                      <button
                        onClick={() => setSelectedSectionId(nextWorkflowStep.id)}
                        className="text-xs font-mono text-orange-400 hover:underline flex items-center gap-1"
                      >
                        <span>Jump to Step 0{nextWorkflowStep.step}: {nextWorkflowStep.title}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeSection.relatedModules.map((modName, idx) => {
                      const modObj = manualSections.find(m => m.title.includes(modName) || modName.includes(m.title));
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (modObj) setSelectedSectionId(modObj.id);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 border border-white/10 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{modName}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : currentView === 'index' ? (
            /* ======================================================== */
            /* VIEW 2: ALL 32 MODULES LIBRARY                           */
            /* ======================================================== */
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#030611]">
              {/* Left Sidebar for Categories */}
              <div className="w-full md:w-80 bg-[#040817] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold px-2">
                    Dynamic Registry ({manualSections.length} Modules Total)
                  </div>
                  <p className="text-[11px] font-sans text-slate-400 px-2 leading-tight">
                    Every operational tool and exploration module documented with procedures.
                  </p>
                </div>

                <div className="space-y-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition cursor-pointer flex items-center justify-between ${
                        selectedCategoryFilter === cat
                          ? 'bg-orange-500 text-white font-bold shadow'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate pr-2">{cat}</span>
                      <span className="text-[10px] opacity-75 shrink-0">
                        {cat === 'ALL' ? manualSections.length : manualSections.filter(s => s.category === cat).length}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <button
                    onClick={() => setCurrentView('flowchart')}
                    className="w-full p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 transition text-xs font-mono font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>View Interactive Flowchart</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Content Grid with Search */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-[#030611] text-slate-200">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search all ${manualSections.length} modules by title, algorithm, instrument, or keyword...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-orange-500 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSections.map(sec => {
                    return (
                      <div
                        key={sec.id}
                        onClick={() => {
                          setSelectedSectionId(sec.id);
                          setCurrentView('flowchart');
                        }}
                        className="group bg-[#060c20] border border-white/10 hover:border-orange-500/70 rounded-3xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-[0_10px_30px_rgba(249,115,22,0.18)] relative overflow-hidden"
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                              {sec.icon}
                            </div>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/50 text-cyan-300 border border-white/10 truncate max-w-[150px]">
                              {sec.category}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-white font-bold text-base font-sans group-hover:text-orange-400 transition-colors">
                              {sec.title}
                            </h3>
                            <p className="text-slate-400 text-xs font-mono truncate">{sec.subtitle}</p>
                          </div>

                          <p className="text-slate-300 text-xs leading-relaxed font-sans line-clamp-3">
                            {sec.summary}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-orange-400">
                          <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                            Open Operating Guide <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : currentView === 'map' ? (
            /* ======================================================== */
            /* VIEW 3: ARCHITECTURE NAVIGATION MAP                      */
            /* ======================================================== */
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-[#030611] text-slate-200 flex flex-col items-center">
              <div className="max-w-4xl w-full text-center space-y-2">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Subsystem Architecture &amp; Data Pipeline
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
                  8 Core Subsystems of MARSNAV
                </h2>
                <p className="text-slate-400 text-xs font-mono max-w-2xl mx-auto">
                  Click any subsystem block or module to launch its interactive walkthrough in the flowchart view.
                </p>
              </div>

              <div className="max-w-5xl w-full space-y-6">
                {[
                  {
                    name: '1. Astronaut Exploration & Field Science',
                    color: 'border-orange-500/50 bg-orange-950/20',
                    modules: [
                      { id: 'astronaut-exploration', title: 'Astronaut Surface Ops', desc: 'Central EVA exploration hub' },
                      { id: 'surface-dashboard', title: 'Surface Mission Dashboard', desc: 'EVA duration, suit vitals & consumables' },
                      { id: 'science-planner', title: 'Mission Science Planner', desc: 'Observation sequencing & targets' },
                      { id: 'surface-explorer', title: 'Mars Surface Explorer', desc: 'Jezero basin topography & POIs' },
                      { id: 'multilayer-map', title: 'Multilayer Data Fusion', desc: 'Multispectral orbital & surface CV' },
                      { id: 'safety-monitoring', title: 'Safety & Environment', desc: 'Martian weather, pressure & dust Tau' },
                      { id: 'geological-targets', title: 'Geological Targets', desc: 'Astrobiology mineral classification' },
                      { id: 'suit-mobility', title: 'Suit Mobility Analysis', desc: 'xEMU joint torque & metabolic rate' },
                      { id: 'astronaut-route-planner', title: 'Astronaut Route Planner', desc: 'Walking paths with turn buffers' },
                      { id: 'radiation-monitor', title: 'Radiation & Space Weather', desc: 'NOAA SWPC protons & ALARA limits' }
                    ]
                  },
                  {
                    name: '2. Field Operations & Sample Logging',
                    color: 'border-amber-500/40 bg-amber-950/15',
                    modules: [
                      { id: 'marsnav-v4', title: 'MARSWALK OPS / EVA', desc: 'Active camera frame ingestion & CV' },
                      { id: 'field-notebook', title: 'Spatial Field Notebook', desc: 'Geological sample logging with map link' },
                      { id: 'overview', title: 'Mission Overview', desc: 'Bird-eye telemetry & rover health' }
                    ]
                  },
                  {
                    name: '3. Remote Sensing & Planetary Topography',
                    color: 'border-cyan-500/40 bg-cyan-950/15',
                    modules: [
                      { id: 'explorer-3d', title: '3D Terrain Explorer', desc: 'Topographical relief & Three.js mesh' },
                      { id: 'live-mission-data', title: 'Live NASA Stream', desc: 'Atmospheric opacity & environmental telemetry' },
                      { id: 'mission-data', title: 'Mission Data & DEM', desc: 'HiRISE DTM scale & elevation datums' }
                    ]
                  },
                  {
                    name: '4. Automated Computer Vision & Hazard Intelligence',
                    color: 'border-blue-500/40 bg-blue-950/15',
                    modules: [
                      { id: 'terrain-intelligence', title: 'Terrain Intelligence', desc: 'Sobel edge detection & contour polygons' },
                      { id: 'hazard-analysis', title: 'Hazard Analysis', desc: 'Adjustable safety buffers (2px - 28px)' },
                      { id: 'risk-assessment', title: 'Risk Assessment', desc: 'Multi-factor traversal safety index' },
                      { id: 'base-camp-intel', title: 'Base Camp Intelligence', desc: 'Landing site slope & communication LOS' }
                    ]
                  },
                  {
                    name: '5. Autonomous Pathfinding & Trajectory Generation',
                    color: 'border-orange-500/40 bg-orange-950/15',
                    modules: [
                      { id: 'route-lab', title: 'Route Laboratory', desc: 'A* pathfinding with Alpha-Delta strategies' },
                      { id: 'route-comparison', title: 'Route Comparison', desc: 'Distance vs Energy vs Safety trade-offs' },
                      { id: 'scenario-testing', title: 'Scenario Testing', desc: 'Dust storm & anomaly emergency injection' }
                    ]
                  },
                  {
                    name: '6. Verification, Diagnostics & Mission Audit',
                    color: 'border-emerald-500/40 bg-emerald-950/15',
                    modules: [
                      { id: 'validation-harness', title: 'Validation Harness', desc: 'Automated unit test diagnostics' },
                      { id: 'model-eval', title: 'Model Evaluation', desc: 'Precision, recall & CV benchmarks' },
                      { id: 'audit', title: 'Mission Audit', desc: 'Compiled dossier & one-click PDF report' }
                    ]
                  },
                  {
                    name: '7. Assistance, AI Intelligence & Workstation Config',
                    color: 'border-purple-500/40 bg-purple-950/15',
                    modules: [
                      { id: 'guide', title: 'Mission Manual', desc: 'Interactive training platform' },
                      { id: 'orbit-terminal', title: 'ORBIT AI Assistant', desc: 'Google Gemini planetary robotics terminal' },
                      { id: 'settings', title: 'System Settings', desc: 'Workstation preferences & display cache' }
                    ]
                  }
                ].map((subsystem, sIdx) => (
                  <div key={sIdx} className={`p-5 rounded-3xl border ${subsystem.color} space-y-3`}>
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      {subsystem.name}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subsystem.modules.map(mod => (
                        <div
                          key={mod.id}
                          onClick={() => {
                            setSelectedSectionId(mod.id);
                            setCurrentView('flowchart');
                          }}
                          className="p-3 rounded-2xl bg-black/50 border border-white/10 hover:border-orange-500/70 hover:bg-orange-950/20 transition cursor-pointer space-y-1 group"
                        >
                          <div className="font-bold text-white text-xs font-sans group-hover:text-orange-400 transition-colors flex items-center justify-between">
                            <span>{mod.title}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                          <div className="text-slate-400 text-[11px] font-sans">
                            {mod.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW 4: QUICK REFERENCE & OPERATIONAL CHEATSHEET         */
            /* ======================================================== */
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[#030611] text-slate-200">
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">MARSNAV Mission Operations Cheatsheet</h2>
                  <p className="text-slate-400 text-xs font-mono">
                    Essential operational workflows, safety parameters, and keyboard controls for rover navigators &amp; astronaut exploration crews.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    {
                      category: 'ASTRONAUT EVA OPERATIONS',
                      title: 'Managing Extravehicular Activity Limits',
                      steps: [
                        'Verify suit pressure reads nominal 29.6 kPa pure O2 before egressing airlock.',
                        'Monitor consumable reserves; plan 1.5x return margin for walk duration.',
                        'Maintain pace below 420 kcal/hr on inclines to prevent suit cooling failure.',
                        'Log all drill cores with titanium sample tube barcodes in Spatial Field Notebook.'
                      ]
                    },
                    {
                      category: 'RADIATION PROTECTION',
                      title: 'Monitoring Solar Weather & ALARA Limits',
                      steps: [
                        'Inspect NOAA SWPC GOES X-ray monitor for incoming M-class or X-class flares.',
                        'Check proton flux (>10 MeV); any spike above 10 pfu triggers shelter alert.',
                        'Ensure 30-day cumulative astronaut exposure stays below 250 mSv ALARA threshold.',
                        'Execute immediate regolith bunker retreat if an interplanetary shock wave arrives.'
                      ]
                    },
                    {
                      category: 'DATA FUSION & CV',
                      title: 'Analyzing High-Resolution Surface Frames',
                      steps: [
                        'Ingest Mastcam or Navcam image in MarsWalk Ops.',
                        'Open Multilayer Map to inspect clustered and localized rock detections.',
                        'Use category pills to isolate Boulders (>0.5m) and Bedrock Pavements.',
                        'Cross-reference with USGS SIM 3292 geology and MRO CTX orbital mosaics.'
                      ]
                    },
                    {
                      category: 'ROUTE GENERATION',
                      title: 'Planning a Safe Surface Traverse',
                      steps: [
                        'Open Route Laboratory or Astronaut Route Planner.',
                        'Click "Set Start [A]" and "Set Destination [B]" on the verified terrain grid.',
                        'Select Strategy: Route Gamma for Maximum Clearance, Route Alpha for Shortest Trajectory.',
                        'Verify trajectory distance and watt-hour energy consumption before uplink.'
                      ]
                    }
                  ].map((card, cIdx) => (
                    <div key={cIdx} className="p-6 rounded-2xl bg-[#060c20] border border-white/15 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-[10px] font-mono text-orange-400">
                        <span>{card.category}</span>
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div className="font-bold text-white text-sm font-sans">
                        {card.title}
                      </div>
                      <div className="space-y-2 pt-1">
                        {card.steps.map((st, i) => (
                          <div key={i} className="text-xs font-sans text-slate-300 leading-relaxed flex items-start gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5 font-bold">
                              {i + 1}
                            </span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
