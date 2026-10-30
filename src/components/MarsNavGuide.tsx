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
  ExternalLink,
  Sparkles,
  Layers,
  Terminal,
  BookMarked,
  Check,
  RotateCcw,
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
  Filter,
  RefreshCw,
  GitCommit,
  Workflow
} from 'lucide-react';

interface MarsNavGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateWorkspace?: (workspaceId: string) => void;
  onStartTour?: () => void;
}

// 12-Step Primary Mission Workflow Pipeline
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

const WORKFLOW_STEPS: WorkflowStep[] = [
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

export default function MarsNavGuide({ isOpen, onClose, onNavigateWorkspace, onStartTour }: MarsNavGuideProps) {
  // Navigation & View States
  const [currentView, setCurrentView] = useState<'flowchart' | 'detail' | 'index' | 'map' | 'quickref'>('flowchart');
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
  const [hazardDetectionCount, setHazardDetectionCount] = useState<number>(12);

  // 3. Mission Configuration Rover Parameters
  const [roverMaxSlope, setRoverMaxSlope] = useState<number>(14);
  const [roverBatteryWh, setRoverBatteryWh] = useState<number>(2400);

  // 4. Terrain Intelligence Computer Vision Filter
  const [activeCvFilter, setActiveCvFilter] = useState<'edge' | 'slope' | 'contour' | 'raw'>('edge');

  // 5. Validation Harness Diagnostic Execution
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticDone, setDiagnosticDone] = useState(true);

  // Sol clock tick simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSimulatedClock(now.toTimeString().split(' ')[0] + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Comprehensive manual entries for all 22 sidebar modules
  const manualSections = useMemo(() => [
    // --- MISSION ---
    {
      id: 'overview',
      category: 'Mission',
      workflowStep: null,
      title: 'Mission Overview',
      subtitle: 'Command Center Dashboard & Telemetry Hub',
      icon: <LayoutDashboard className="w-5 h-5 text-orange-400" />,
      badge: 'DASHBOARD',
      summary: 'The primary command dashboard providing high-level operational telemetry, active mission status, battery reserves, and quick-launch shortcuts.',
      whatIsIt: 'Mission Overview serves as the top-level telemetry and status hub of MARSNAV. It aggregates real-time system health, active traversal progress, active rover profile, and recent activity logs into a unified mission control screen.',
      whyImportant: 'Operators need an immediate, bird-eye view of mission health, active target coordinates, and system readiness before executing surface maneuvers.',
      howToUse: [
        'Launch MARSNAV and review the Mission Overview dashboard upon boot.',
        'Verify system backend connection status and battery state of charge (SoC).',
        'Check active mission parameters, rover configuration, and traverse readiness indicators.',
        'Use quick-action cards to jump directly to terrain analysis, route planning, or validation.'
      ],
      toolsAndControls: [
        'Active Mission Card: Displays mission ID, creation timestamp, and status.',
        'System Health Monitor: Verifies server connection and data cache integrity.',
        'Quick Action Launchers: One-click navigation to Route Lab, Terrain Intelligence, and 3D Explorer.',
        'Real-Time Telemetry Ticker: Continuously monitors Sol duration and distance traversed.'
      ],
      expectedOutput: 'An instantaneous operational snapshot of mission readiness with zero latency.',
      realWorkflow: 'Mission planners begin every Sol by inspecting Overview telemetry to ensure battery reserves and traverse clearances are fully nominal.',
      relatedModules: ['MARSWALK OPS / EVA', 'Mission Configuration', 'Spatial Field Notebook']
    },
    {
      id: 'marsnav-v4',
      category: 'Mission',
      workflowStep: null,
      title: 'MARSWALK OPS / EVA',
      subtitle: 'Surface Walking & EVA Operations Simulator',
      icon: <Navigation className="w-5 h-5 text-orange-400" />,
      badge: 'EVA',
      summary: 'Specialized surface operations interface for rover and astronaut EVA navigation, landmark tagging, and real-time heading alignment.',
      whatIsIt: 'MARSWALK OPS provides a dedicated EVA and surface traversal workspace. It merges tactical mapping, sun-heading orientation, slope angle indicators, and field note logging for surface crews.',
      whyImportant: 'Surface exploration requires rigorous heading control and immediate terrain hazard awareness during rover-escorted EVA missions.',
      howToUse: [
        'Select MARSWALK OPS from the Mission sidebar menu.',
        'Inspect the tactical surface map and active rover/astronaut position coordinates.',
        'Review heading angle, solar azimuth, and local slope inclines.',
        'Log EVA observations or flag science waypoints in real-time.'
      ],
      toolsAndControls: [
        'Tactical Heading Compass: Real-time azimuth and bearing indicator.',
        'EVA Waypoint Dropper: Mark surface sampling sites and rock outcrops.',
        'Slope Incline Gauge: Warns operators of steep grade hazards (>14°).',
        'Audio/Visual Comm Link: Simulated voice loop and telemetry feed.'
      ],
      expectedOutput: 'Clear surface navigation telemetry and real-time EVA tracking overlays.',
      realWorkflow: 'Field geologists use MARSWALK OPS to monitor rover proximity and sample collection progress during extravehicular sorties.',
      relatedModules: ['Spatial Field Notebook', '3D Terrain Explorer', 'Route Laboratory']
    },
    {
      id: 'field-notebook',
      category: 'Mission',
      workflowStep: null,
      title: 'Spatial Field Notebook',
      subtitle: 'Geological Notes & Observation Logging',
      icon: <BookOpen className="w-5 h-5 text-orange-300" />,
      badge: 'NOTES',
      summary: 'Interactive digital field notebook for recording geological observations, tagging rock samples, and linking notes directly to map coordinates.',
      whatIsIt: 'The Spatial Field Notebook allows mission scientists to document discoveries with categories (Geology, Ice/Water, Hazard, Biosignature, Sample Target), priority levels, spatial coordinates (X, Y), and image attachments.',
      whyImportant: 'Documenting discoveries with precise spatial provenance ensures no high-value scientific sample is lost during multi-Sol traverses.',
      howToUse: [
        'Navigate to Spatial Field Notebook from the Mission menu.',
        'Click "Create Note" to document a new geological observation or rock outcrop.',
        'Assign category, priority, tags, and spatial coordinates.',
        'Use "Restore on Map" to instantly locate the note on the terrain map.'
      ],
      toolsAndControls: [
        'Category Filter (ALL, Geology, Ice/Water, Hazard, Biosignature, Sample Target).',
        'Priority Badges (High, Medium, Low).',
        'JSON Import/Export: Backup or share field notes with mission colleagues.',
        'Map Teleport ("Restore on Map"): Instantly centers the map on the note coordinate.'
      ],
      expectedOutput: 'A well-organized searchable ledger of geological observations with map-link capabilities.',
      realWorkflow: 'During terrain analysis, a scientist spots an unusual sulfur-rich outcrop, records it in the Field Notebook with priority High, and instantly jumps to its location on the map.',
      relatedModules: ['Mission Overview', 'Route Laboratory', '3D Terrain Explorer']
    },
    {
      id: 'live-mission-data',
      category: 'Mission',
      workflowStep: null,
      title: 'Live NASA Stream',
      subtitle: 'Real-Time Planetary Telemetry Feed',
      icon: <Radio className="w-5 h-5 text-emerald-400" />,
      badge: 'LIVE',
      summary: 'Direct telemetry stream monitoring live Martian weather, atmospheric opacity, orbital position, and downlink transmission status.',
      whatIsIt: 'Live NASA Stream provides simulated or live-connected downlinks of Jezero Crater environmental data, dust storm alerts, wind speeds, and orbital relay passes.',
      whyImportant: 'Environmental conditions (dust opacity, solar power generation) directly impact rover driving safety and solar array efficiency.',
      howToUse: [
        'Open Live NASA Stream from the Mission menu.',
        'Monitor atmospheric pressure, temperature (-65°C average), and solar irradiance.',
        'Review incoming relay pass schedules and downlink buffer status.'
      ],
      toolsAndControls: [
        'Atmospheric Opacity Tau Gauge.',
        'Solar Irradiance Calculator (W/m²).',
        'Relay Pass Countdown Timer.',
        'Deep Space Network (DSN) Lock Indicator.'
      ],
      expectedOutput: 'Up-to-the-minute environmental and telemetry status feeds.',
      realWorkflow: 'Before initiating a multi-kilometer traverse, operators check Live NASA Stream to verify zero active dust storm warnings.',
      relatedModules: ['Mission Overview', 'Scenario Testing', 'System Settings']
    },
    {
      id: 'explorer-3d',
      category: 'Mission',
      workflowStep: null,
      title: '3D Terrain Explorer',
      subtitle: 'Spatial Topography & Camera Orbit Visualization',
      icon: <Compass className="w-5 h-5 text-orange-400" />,
      badge: '3D',
      summary: 'Immersive 3D terrain exploration tool rendering digital elevation models, contour relief, and camera orbit controls.',
      whatIsIt: '3D Terrain Explorer uses WebGL / Three.js rendering techniques to display Jezero Crater topography in three dimensions, allowing operators to inspect slope steepness, crater rims, and elevation profiles.',
      whyImportant: '2D top-down maps can obscure steep canyon walls and deep depressions that pose tipping hazards to the rover.',
      howToUse: [
        'Open 3D Terrain Explorer from the Mission menu.',
        'Click and drag to orbit the camera around the terrain mesh.',
        'Scroll to zoom in/out on specific elevation features.',
        'Toggle terrain wireframe, elevation color gradient, and hazard overlays.'
      ],
      toolsAndControls: [
        'Orbit Controls (Rotate, Pan, Zoom).',
        'Elevation Color Map Toggle (Thermal/Topographic).',
        'Wireframe & Lighting Controls.',
        'Cross-Section Elevation Profiler.'
      ],
      expectedOutput: 'An interactive 3D topographical relief model of the mission sector.',
      realWorkflow: 'Operators use 3D Explorer to evaluate approach angles before committing the rover to a steep crater rim descent.',
      relatedModules: ['Mission Data & DEM', 'Route Laboratory', 'Hazard Analysis']
    },
    {
      id: 'mission-data',
      category: 'Mission',
      workflowStep: null,
      title: 'Mission Data & DEM',
      subtitle: 'Digital Elevation Models & Spatial Datasets',
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
      badge: 'DEM',
      summary: 'Management console for Digital Elevation Models (DEM), orthoimages, spatial resolution datums, and coordinate metadata.',
      whatIsIt: 'Mission Data & DEM handles the cartographic foundation of MARSNAV, displaying resolution metadata (0.25 m/px), coordinate reference systems, and dataset provenance.',
      whyImportant: 'Accurate elevation datums and spatial scales are required to convert pixel distances into real-world meters.',
      howToUse: [
        'Open Mission Data & DEM from the Mission menu.',
        'Inspect loaded HiRISE DTM identifier, sol number, and camera acquisition timestamp.',
        'Verify scale calibration and coordinate bounding boxes.'
      ],
      toolsAndControls: [
        'DEM Metadata Inspector.',
        'Scale Calibration Tool (meters-per-pixel).',
        'Dataset Provenance Verifier.',
        'Layer Transparency Sliders.'
      ],
      expectedOutput: 'Verified spatial dataset parameters and elevation coordinate tables.',
      realWorkflow: 'Mission cartographers verify DEM resolution before authorizing high-speed autonomous rover navigation files.',
      relatedModules: ['Dataset Catalogue', '3D Terrain Explorer', 'Route Laboratory']
    },
    {
      id: 'configuration',
      category: 'Mission',
      workflowStep: 1,
      title: 'Mission Configuration',
      subtitle: 'Rover Parameters & Operational Limits (Step 01)',
      icon: <Sliders className="w-5 h-5 text-orange-400" />,
      badge: 'STEP 01',
      summary: 'Configures global mission parameters including maximum slope threshold, battery capacity, rover profile, and safety constraints.',
      whatIsIt: 'Mission Configuration is Step 01 in the primary workflow. Here operators define rover physical constraints (mass, max slope limit, battery Watt-hours) that govern all downstream pathfinding and simulation modules.',
      whyImportant: 'Customizing rover parameters ensures calculations match the exact mechanical capabilities of Perseverance or custom robotic testbeds.',
      howToUse: [
        'Navigate to Mission Configuration from the Mission menu.',
        'Adjust maximum traversability slope limit (default 14.0°).',
        'Set battery capacity (default 2,400 Wh) and nominal power consumption.',
        'Select rover vehicle profile (Perseverance, Curiosity, Sample Fetch Rover).'
      ],
      toolsAndControls: [
        'Max Slope Slider (1° to 30° with real-time tipping warning).',
        'Battery Capacity Input (1,000 Wh - 5,000 Wh).',
        'Rover Profile Selector (Perseverance 1,025kg, Curiosity 899kg, SFR 350kg).',
        'Save & Propagate Configuration Button.'
      ],
      expectedOutput: 'Updated global mission parameters applied instantly across analysis and navigation engines.',
      realWorkflow: 'When planning traverses across loose sand where slip risk is higher, operators lower the max slope limit to 10° for increased safety.',
      relatedModules: ['NASA Raw Image Feed', 'Route Laboratory', 'Scenario Testing']
    },

    // --- ANALYSIS ---
    {
      id: 'base-camp-intel',
      category: 'Analysis',
      workflowStep: null,
      title: 'Base Camp Intelligence',
      subtitle: 'Landing Site Evaluation & Site Safety Intel',
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      badge: 'SITES',
      summary: 'Comprehensive site intelligence module evaluating landing site safety, slope stability, communication line-of-sight, and resource proximity.',
      whatIsIt: 'Base Camp Intelligence provides multi-factor site scoring for potential science camps and stationary lander sites, analyzing slopes, rock frequency, and orbital relay visibility.',
      whyImportant: 'Establishing a secure base camp requires balancing scientific interest with absolute mechanical safety and solar charging efficiency.',
      howToUse: [
        'Open Base Camp Intelligence from the Analysis menu.',
        'Review site evaluation scorecards (Slope, Boulder Density, Communications).',
        'Compare alternative landing and camp coordinates.'
      ],
      toolsAndControls: [
        'Site Suitability Scorecard.',
        'Communication LOS (Line-of-Sight) Indicator.',
        'Terrain Roughness Histogram.',
        'Candidate Coordinates Comparison Matrix.'
      ],
      expectedOutput: 'Detailed site evaluation metrics and safety recommendations.',
      realWorkflow: 'Mission directors use Base Camp Intel to select the safest overnight parking location during severe wind forecasts.',
      relatedModules: ['Terrain Intelligence', 'Hazard Analysis', 'Risk Assessment']
    },
    {
      id: 'nasa-raw-feed',
      category: 'Analysis',
      workflowStep: 2,
      title: 'NASA Raw Image Feed',
      subtitle: 'JPL Planetary Image Explorer (Step 02)',
      icon: <Radio className="w-5 h-5 text-orange-400" />,
      badge: 'STEP 02',
      summary: 'Direct browser interface to browse, filter, and load raw image frames from NASA Mars 2020 Navcams and Hazcams.',
      whatIsIt: 'NASA Raw Image Feed is Step 02 in the workflow, connecting to JPL public repositories to ingest authentic Martian surface frames by Sol, camera type, and frame ID.',
      whyImportant: 'Testing route planning on genuine Jezero Crater imagery ensures robust preparation for real planetary conditions.',
      howToUse: [
        'Navigate to NASA Raw Image Feed from the Analysis menu.',
        'Filter images by Sol number or camera instrument (Navcam Left/Right, Hazcam Front/Rear).',
        'Click "Load into Mission" to set the raw image as the active terrain background.'
      ],
      toolsAndControls: [
        'Sol Filter Selector (Sol 001 - Present).',
        'Camera Instrument Selector (NAVCAM, HAZCAM, MASTCAM-Z).',
        'Thumbnail Gallery & Metadata Inspector.',
        'Ingest to Mission Canvas Action.'
      ],
      expectedOutput: 'Authentic Martian surface image loaded into active mission workspace.',
      realWorkflow: 'An operator curates a newly downlinked Sol 428 Navcam frame from JPL feed and loads it for computer vision feature extraction.',
      relatedModules: ['Dataset Catalogue', 'Terrain Intelligence', 'Mission Data & DEM']
    },
    {
      id: 'dataset-catalogue',
      category: 'Analysis',
      workflowStep: 3,
      title: 'Dataset Catalogue',
      subtitle: 'Planetary Data System (PDS) Verification (Step 03)',
      icon: <Database className="w-5 h-5 text-emerald-400" />,
      badge: 'STEP 03',
      summary: 'Catalogue of verified planetary datasets, MRO HiRISE orthophotos, MOLA elevation data, and PDS compliance records.',
      whatIsIt: 'Dataset Catalogue is Step 03 in the workflow, managing verified scientific data archives, checking coordinate reference frames, resolution integrity, and PDS metadata standards.',
      whyImportant: 'Ensuring dataset compliance guarantees that all downstream engineering calculations rely on verified cartographic data.',
      howToUse: [
        'Open Dataset Catalogue from the Analysis menu.',
        'Browse available Jezero Crater orthomosaics and DTM swaths.',
        'Verify checksums and PDS compliance status before analysis.'
      ],
      toolsAndControls: [
        'Dataset Repository Browser.',
        'PDS Compliance Checker.',
        'Checksum & Resolution Verifier.',
        'HiRISE Swath Footprint Visualizer.'
      ],
      expectedOutput: 'Verified dataset records and compliance certifications.',
      realWorkflow: 'Data scientists verify incoming MRO HiRISE swaths in the Dataset Catalogue before releasing them to operations.',
      relatedModules: ['Terrain Intelligence', 'Mission Data & DEM', 'Validation Harness']
    },
    {
      id: 'terrain-intelligence',
      category: 'Analysis',
      workflowStep: 4,
      title: 'Terrain Intelligence',
      subtitle: 'Automated Classification & Feature Extraction (Step 04)',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      badge: 'STEP 04',
      summary: 'Advanced classical computer vision processing extracting terrain classifications, obstacle contours, and surface roughness maps.',
      whatIsIt: 'Terrain Intelligence is Step 04 in the workflow. It executes Sobel edge detection, luminance gradient analysis, and morphological contouring to segment the terrain into distinct geological categories.',
      whyImportant: 'Automated terrain intelligence eliminates manual tracing, providing rapid identification of traversable vs. impassable regions.',
      howToUse: [
        'Open Terrain Intelligence from the Analysis menu.',
        'Click "Execute Terrain Scan" to run the classical CV detection pipeline.',
        'Inspect classified feature counts (Rocks, Sand Ripples, Bedrock).'
      ],
      toolsAndControls: [
        'Scan Execution Button.',
        'Feature Classification Breakdown (Count & Area %).',
        'Confidence Scoring Meter.',
        'Edge Detection & Morphological Filter Overlays.'
      ],
      expectedOutput: 'Detailed terrain classification masks and obstacle polygon inventories.',
      realWorkflow: 'When a new terrain image is loaded, Terrain Intelligence automatically scans the image to generate hazard polygons for pathfinding.',
      relatedModules: ['Hazard Analysis', 'Dataset Catalogue', 'Route Laboratory']
    },
    {
      id: 'hazard-analysis',
      category: 'Analysis',
      workflowStep: 5,
      title: 'Hazard Analysis',
      subtitle: 'Rock, Slope & Pit Obstacle Evaluation (Step 05)',
      icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
      badge: 'STEP 05',
      summary: 'Detailed hazard inspection tool analyzing rock size distribution, slope inclines, wheel sinkage risk, and safety clearance buffers.',
      whatIsIt: 'Hazard Analysis is Step 05 in the workflow, focusing on identifying dangerous obstacles and buffering exclusion zones with customizable margins (2px to 28px).',
      whyImportant: 'Proper hazard buffering prevents rover wheels from contacting sharp rock edges that could cause puncture or entrapment.',
      howToUse: [
        'Navigate to Hazard Analysis from the Analysis menu.',
        'Inspect detected hazard polygon count and severity distribution.',
        'Adjust safety buffer clearance slider to expand obstacle exclusion zones.'
      ],
      toolsAndControls: [
        'Safety Buffer Clearance Slider (2px - 28px).',
        'Hazard Severity Breakdown (Critical, Moderate, Low).',
        'Manual Obstacle Editor (Add/Remove Boulders).',
        'Clearance Envelope Radar Inspector.'
      ],
      expectedOutput: 'Configured hazard exclusion zones and rock distribution statistics.',
      realWorkflow: 'In a boulder-strewn delta region, operators increase the safety buffer to 20px to ensure wide clearance around sharp rock hazards.',
      relatedModules: ['Risk Assessment', 'Terrain Intelligence', 'Route Laboratory']
    },
    {
      id: 'risk-assessment',
      category: 'Analysis',
      workflowStep: 6,
      title: 'Risk Assessment',
      subtitle: 'Traversal Risk & Operational Safety Scoring (Step 06)',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      badge: 'STEP 06',
      summary: 'Comprehensive risk evaluation synthesizing slope steepness, hazard density, slip probability, and mission safety margins.',
      whatIsIt: 'Risk Assessment is Step 06 in the workflow, calculating an aggregate mission risk score (Low, Moderate, High, Critical) based on the planned route trajectory and terrain hazards.',
      whyImportant: 'Quantifying traverse risk allows mission directors to make informed decisions on whether to proceed, detour, or abort.',
      howToUse: [
        'Open Risk Assessment from the Analysis menu.',
        'Review overall safety score and risk factor breakdown.',
        'Identify high-risk path segments requiring operator intervention.'
      ],
      toolsAndControls: [
        'Aggregate Risk Scorecard (0 - 100 Safety Index).',
        'Slip Probability Estimator.',
        'Safety Margin Recommendations.',
        'Critical Point Highlighter.'
      ],
      expectedOutput: 'Quantitative risk score and mitigation guidelines.',
      realWorkflow: 'Before final command uplink, the safety officer reviews Risk Assessment to verify the path score remains within green operational limits.',
      relatedModules: ['Route Laboratory', 'Hazard Analysis', 'Scenario Testing']
    },

    // --- NAVIGATION ---
    {
      id: 'route-lab',
      category: 'Navigation',
      workflowStep: 7,
      title: 'Route Laboratory',
      subtitle: 'Grid-Based A* Pathfinding & Waypoint Planning (Step 07)',
      icon: <Navigation className="w-5 h-5 text-orange-400" />,
      badge: 'STEP 07',
      summary: 'Interactive route planning laboratory featuring grid brush tools, start/destination placement, obstacle editing, and A* path computation.',
      whatIsIt: 'Route Laboratory is Step 07 and the central interactive pathfinding engine. Operators place start [S] and destination [D] markers, draw obstacles, select route strategies (Alpha, Beta, Gamma, Delta), and compute collision-free trajectories.',
      whyImportant: 'Efficient and safe path planning is the core objective of MARSNAV, ensuring the rover reaches science targets with minimum energy expenditure.',
      howToUse: [
        'Select Route Laboratory from the Navigation menu.',
        'Click "Set Start [S]" and click on the map to define starting coordinates.',
        'Click "Set Destination [D]" and click target coordinates.',
        'Choose a routing strategy (Alpha: Shortest, Beta: Low Cost, Gamma: Max Clearance, Delta: Science Detour).',
        'Click "Plan Route" to compute the optimal A* path.'
      ],
      toolsAndControls: [
        'Start & Destination Marker Tools.',
        'Grid Brush (Draw/Erase Obstacles).',
        'Route Strategy Selector (Alpha, Beta, Gamma, Delta).',
        'Plan Route & Reset Controls.',
        'Route Metrics Summary (Distance in meters, Energy in Watt-hours, Node count).'
      ],
      expectedOutput: 'An optimized orange/cyan route polyline connecting start to goal with complete distance and energy statistics.',
      realWorkflow: 'An operator sets start at the current rover location, targets a Jezero delta outcrop, selects Route Gamma for maximum clearance, and clicks Plan Route to generate the safe path.',
      relatedModules: ['Route Comparison', 'Scenario Testing', 'Risk Assessment']
    },
    {
      id: 'route-comparison',
      category: 'Navigation',
      workflowStep: 8,
      title: 'Route Comparison',
      subtitle: 'Side-by-Side Path Trade-Off Analysis (Step 08)',
      icon: <Route className="w-5 h-5 text-blue-400" />,
      badge: 'STEP 08',
      summary: 'Comparative analysis workstation evaluating multiple route alternatives across distance, energy cost, and hazard exposure.',
      whatIsIt: 'Route Comparison is Step 08 in the workflow, allowing operators to simultaneously view and compare Alpha, Beta, Gamma, and Delta route options on a comparative metrics table and chart.',
      whyImportant: 'Evaluating trade-offs between a shorter risky path vs. a longer safe path is critical for mission optimization.',
      howToUse: [
        'Open Route Comparison from the Navigation menu.',
        'Review the comparative metrics table comparing distance (m), energy (Wh), and hazard clearance.',
        'Select the optimal route strategy for command uplink.'
      ],
      toolsAndControls: [
        'Multi-Route Metrics Table.',
        'Energy vs. Distance Trade-Off Graph.',
        'Strategy Recommendation Badge.',
        'Side-by-Side Path Visualizer.'
      ],
      expectedOutput: 'Side-by-side comparative analysis of all computed route options.',
      realWorkflow: 'Operators compare Route Alpha (shortest, 120m, 45Wh, high slip risk) with Route Gamma (safe detour, 155m, 58Wh, zero hazard exposure) and select Gamma.',
      relatedModules: ['Scenario Testing', 'Route Laboratory', 'Risk Assessment']
    },
    {
      id: 'scenario-testing',
      category: 'Navigation',
      workflowStep: 9,
      title: 'Scenario Testing',
      subtitle: 'Emergency Anomaly & Contingency Simulation (Step 09)',
      icon: <AlertOctagon className="w-5 h-5 text-amber-400" />,
      badge: 'STEP 09',
      summary: 'Contingency testing lab simulating dust storms, battery degradation, communication dropouts, and wheel slip emergencies.',
      whatIsIt: 'Scenario Testing is Step 09 in the workflow. It injects simulated environmental anomalies into the navigation system to test automated rover contingency responses and replanning resilience.',
      whyImportant: 'Preparedness for unexpected Martian weather or mechanical faults ensures mission survival under adverse conditions.',
      howToUse: [
        'Open Scenario Testing from the Navigation menu.',
        'Select an emergency scenario (e.g., Dust Storm Opacity Spike, Wheel Slip Spike, Power Draw Anomaly).',
        'Execute simulation and observe system automated replanning and warning responses.'
      ],
      toolsAndControls: [
        'Scenario Selector Dropdown.',
        'Anomaly Injection Controls.',
        'Contingency Response Log.',
        'Emergency Fallback Path Generator.'
      ],
      expectedOutput: 'Real-time simulation of system response to emergency anomalies.',
      realWorkflow: 'Safety engineers inject a dust storm scenario to verify that the energy budget calculation correctly triggers low-power mode.',
      relatedModules: ['Validation Harness', 'Route Laboratory', 'Live NASA Stream']
    },

    // --- VALIDATION ---
    {
      id: 'validation-harness',
      category: 'Validation',
      workflowStep: 10,
      title: 'Validation Harness',
      subtitle: 'Automated Software Subsystem Diagnostics (Step 10)',
      icon: <Terminal className="w-5 h-5 text-emerald-400" />,
      badge: 'STEP 10',
      summary: 'Automated diagnostic test harness executing unit checks across pathfinding, sensor ingestion, and kinematics modules.',
      whatIsIt: 'Validation Harness is Step 10 in the workflow, running an automated suite of system tests verifying the integrity of math solvers, grid graph generators, and coordinate transforms.',
      whyImportant: 'Automated testing guarantees that no software regression has broken navigation math prior to deployment.',
      howToUse: [
        'Open Validation Harness from the Validation menu.',
        'Click "Run Test Suite" to execute all diagnostic unit checks.',
        'Review test pass/fail status and execution time.'
      ],
      toolsAndControls: [
        'Run Diagnostics Button.',
        'Subsystem Test Results Ledger.',
        'Error Log & Stack Trace Inspector.',
        'Regression Benchmark Suite.'
      ],
      expectedOutput: 'All tests passed (Green) confirmation across system modules.',
      realWorkflow: 'Before every major mission planning session, the systems administrator runs Validation Harness to ensure 100% software health.',
      relatedModules: ['Model Evaluation', 'Mission Audit', 'System Settings']
    },
    {
      id: 'model-eval',
      category: 'Validation',
      workflowStep: 11,
      title: 'Model Evaluation',
      subtitle: 'AI & Classical CV Accuracy Benchmarks (Step 11)',
      icon: <BarChart3 className="w-5 h-5 text-indigo-400" />,
      badge: 'STEP 11',
      summary: 'Analytical benchmarking suite measuring computer vision precision, recall, segmentation accuracy, and inference latency.',
      whatIsIt: 'Model Evaluation is Step 11 in the workflow, measuring the performance and accuracy of terrain classification algorithms against verified ground-truth annotations.',
      whyImportant: 'Rigorous performance metrics ensure high confidence in automated obstacle detection.',
      howToUse: [
        'Open Model Evaluation from the Validation menu.',
        'Inspect precision, recall, and F1-score benchmarks.',
        'Review confusion matrices for rock vs. sand classification.'
      ],
      toolsAndControls: [
        'Precision/Recall Metrics Dashboard.',
        'Confusion Matrix Display.',
        'Inference Latency Timer.',
        'IoU (Intersection-over-Union) Inspector.'
      ],
      expectedOutput: 'Quantitative accuracy benchmarks for terrain segmentation.',
      realWorkflow: 'AI researchers evaluate detection performance on newly added Navcam datasets to ensure false-positive rock rates remain below 2%.',
      relatedModules: ['Mission Audit', 'Terrain Intelligence', 'Validation Harness']
    },
    {
      id: 'audit',
      category: 'Validation',
      workflowStep: 12,
      title: 'Mission Audit',
      subtitle: 'Complete Operational Dossier & PDF Export (Step 12)',
      icon: <FileSpreadsheet className="w-5 h-5 text-slate-300" />,
      badge: 'STEP 12',
      summary: 'Comprehensive mission audit ledger compiling all analysis results, route metrics, field notes, and one-click professional PDF report export.',
      whatIsIt: 'Mission Audit is the culmination (Step 12) of the workflow, aggregating the entire mission history into a structured dossier format and enabling one-click professional PDF report generation via jsPDF.',
      whyImportant: 'Maintaining a complete, traceable audit trail is essential for NASA mission reporting and post-mission analysis.',
      howToUse: [
        'Open Mission Audit from the Validation menu.',
        'Review compiled mission dossier sections (Mission Info, Route Metrics, Validation Reports, Field Notes, Visual Evidence).',
        'Click "Export Mission PDF Dossier" to download a complete formatted PDF report.'
      ],
      toolsAndControls: [
        'Dossier Summary Viewer.',
        'Export Mission PDF Dossier Button.',
        'Traversal Log Inspector.',
        'Cryptographic Checksum & Sign-off.'
      ],
      expectedOutput: 'A professionally formatted multi-page PDF mission report downloaded directly to your device.',
      realWorkflow: 'At the conclusion of a planning session, the lead mission planner exports the Mission Audit PDF dossier to include in the daily shift report.',
      relatedModules: ['Spatial Field Notebook', 'Route Laboratory', 'Validation Harness']
    },

    // --- ASSISTANCE ---
    {
      id: 'guide',
      category: 'Assistance',
      workflowStep: null,
      title: 'Mission Manual',
      subtitle: 'Interactive Operating Manual & Flowchart Guide',
      icon: <BookOpen className="w-5 h-5 text-amber-300" />,
      badge: 'DOCS',
      summary: 'The comprehensive interactive operating manual providing detailed operating guides for every MARSNAV module.',
      whatIsIt: 'Mission Manual is the exact interactive training platform you are currently exploring, designed to teach operators every aspect of the MARSNAV software suite without quizzes or exams.',
      whyImportant: 'Thorough operator training ensures safe and effective utilization of complex planetary robotics software.',
      howToUse: [
        'Browse manual chapters by category or search for specific terms.',
        'Explore interactive module guides and animated workflow demonstrations.',
        'Use quick-reference shortcuts for common operations.'
      ],
      toolsAndControls: [
        'Workflow Flowchart Navigator.',
        'All 22 Modules Library.',
        'Architecture Navigation Map.',
        'Quick Reference Cheatsheet.'
      ],
      expectedOutput: 'Clear, comprehensive operating instructions for any MARSNAV feature.',
      realWorkflow: 'New mission team members spend their first day exploring the Mission Manual to master route planning and hazard analysis.',
      relatedModules: ['ORBIT AI Assistant', 'System Settings', 'Mission Overview']
    },
    {
      id: 'orbit-terminal',
      category: 'Assistance',
      workflowStep: null,
      title: 'ORBIT AI Assistant',
      subtitle: 'Planetary Robotics Expert AI Terminal',
      icon: <Bot className="w-5 h-5 text-red-400" />,
      badge: 'AI',
      summary: 'Conversational AI assistant powered by Google Gemini, providing expert guidance on planetary science, rover mechanics, and software usage.',
      whatIsIt: 'ORBIT AI Assistant is an integrated conversational LLM terminal trained on planetary robotics, Jezero Crater geology, and MARSNAV software architecture.',
      whyImportant: 'Instant expert answers help operators resolve complex navigation or geological questions without consulting external manuals.',
      howToUse: [
        'Open ORBIT AI Assistant from the Assistance menu.',
        'Type any question regarding rover kinematics, route strategies, or Jezero mineralogy.',
        'Receive instant expert responses and command suggestions.'
      ],
      toolsAndControls: [
        'Conversational Chat Input.',
        'Prompt Suggestion Chips.',
        'AI Response Stream & Code Formatter.',
        'Context Sync with Active Coordinates.'
      ],
      expectedOutput: 'Accurate, context-aware expert answers and operational recommendations.',
      realWorkflow: 'An operator asks ORBIT: "What is the recommended max slope limit for loose sand ripples?" and receives an instant expert explanation.',
      relatedModules: ['Mission Manual', 'System Settings', 'Route Laboratory']
    },
    {
      id: 'settings',
      category: 'Assistance',
      workflowStep: null,
      title: 'System Settings',
      subtitle: 'Preferences, Theme & System Configuration',
      icon: <Settings className="w-5 h-5 text-slate-400" />,
      badge: 'CONFIG',
      summary: 'Global application preferences including dark theme customization, audio feedback, unit preferences, and API endpoints.',
      whatIsIt: 'System Settings allows operators to customize their workstation environment, toggle audio cues, manage storage caches, and configure connection endpoints.',
      whyImportant: 'Personalized workstation settings improve operator ergonomics and comfort during long mission shifts.',
      howToUse: [
        'Open System Settings from the Assistance menu.',
        'Adjust theme preferences, units (metric vs imperial), and audio cues.',
        'Clear local storage cache if required.'
      ],
      toolsAndControls: [
        'Theme & Display Toggles.',
        'Unit Preference Selector (Meters / Feet).',
        'Audio Feedback Volume & SFX Toggles.',
        'Cache Clear & Local Storage Reset Utility.'
      ],
      expectedOutput: 'Persisted user preferences applied across the MARSNAV workstation.',
      realWorkflow: 'Operators adjust interface contrast and sound effects during night-shift operations in the mission control room.',
      relatedModules: ['Mission Configuration', 'Mission Manual', 'Mission Overview']
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
    return WORKFLOW_STEPS.find(s => s.id === selectedSectionId) || null;
  }, [selectedSectionId]);

  // Previous and next workflow steps for navigation
  const prevWorkflowStep = useMemo(() => {
    if (!activeWorkflowStep) return null;
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.step === activeWorkflowStep.step);
    return currentIndex > 0 ? WORKFLOW_STEPS[currentIndex - 1] : null;
  }, [activeWorkflowStep]);

  const nextWorkflowStep = useMemo(() => {
    if (!activeWorkflowStep) return null;
    const currentIndex = WORKFLOW_STEPS.findIndex(s => s.step === activeWorkflowStep.step);
    return currentIndex < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[currentIndex + 1] : null;
  }, [activeWorkflowStep]);

  // Helper to run simulated A* path calculation
  const handleSolveRoute = () => {
    setIsSolvingRoute(true);
    setTimeout(() => {
      // Set new path variation
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
    }, 600);
  };

  const handleRunDiagnostics = () => {
    setDiagnosticRunning(true);
    setDiagnosticDone(false);
    setTimeout(() => {
      setDiagnosticRunning(false);
      setDiagnosticDone(true);
    }, 900);
  };

  const categories = ['ALL', 'Mission', 'Analysis', 'Navigation', 'Validation', 'Assistance'];

  // Unconditional return rule: all hooks are mounted above
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn font-sans">
      <div className="bg-[#050814] border border-white/20 rounded-3xl w-full max-w-[1480px] h-[94vh] flex flex-col overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)]">
        
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
                  Mission Control Standard v4.0
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  DSN ONLINE
                </span>
              </div>
              <p className="text-slate-400 text-xs font-mono hidden sm:block">
                Professional NASA mission-control software manual &amp; interactive workflow learning center
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
              <span>Mission Workflow Flowchart</span>
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
              <span>All 22 Modules Library</span>
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
                <span>Launch in MARSNAV</span>
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
                
                {/* Flowchart Control Header */}
                <div className="p-4 border-b border-white/10 bg-[#050a1d] flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>12-Step Traversal Pipeline</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Click any step below to inspect tools, instructions &amp; live interactive simulator
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Sequential A*
                    </span>
                  </div>
                </div>

                {/* Vertical Scrollable Flowchart Nodes List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                  
                  {WORKFLOW_STEPS.map((wf, idx) => {
                    const isSelected = selectedSectionId === wf.id;
                    const isLast = idx === WORKFLOW_STEPS.length - 1;

                    return (
                      <div key={wf.id} className="relative group">
                        
                        {/* Connecting Line between steps */}
                        {!isLast && (
                          <div className="absolute left-6 top-13 bottom-[-14px] w-0.5 z-0">
                            <div className={`w-full h-full transition-colors duration-300 ${
                              isSelected ? 'bg-gradient-to-b from-orange-500 to-cyan-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-white/15'
                            }`} />
                            {/* Animated light pulse traveling down when selected */}
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
                            {/* Step Number Circle */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-transform ${
                              isSelected
                                ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.8)] scale-110'
                                : 'bg-white/5 text-slate-300 border border-white/15 group-hover:border-cyan-400 group-hover:text-cyan-300'
                            }`}>
                              {wf.step < 10 ? `0${wf.step}` : wf.step}
                            </div>

                            {/* Node Metadata */}
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

                {/* Bottom Footer Info */}
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
                      Real-Time Hardware Simulator
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
                              // Toggle random obstacles
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
                              <div className="text-base font-bold text-amber-300 mt-0.5">
                                19 min 40s
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/30 text-slate-300 text-xs">
                            <span className="text-orange-400 font-bold">A* Solver Status:</span> Traversal trajectory verified collision-free. Waypoints are spaced at nominal 10m intervals for autonomous visual odometry.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. HAZARD ANALYSIS BUFFER RADAR */}
                  {selectedSectionId === 'hazard-analysis' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-300">
                        <div className="flex items-center gap-3">
                          <span>Safety Buffer Margin:</span>
                          <span className="text-orange-400 font-bold text-sm">{safetyBufferPx} px ({safetyBufferPx * 0.25} meters)</span>
                        </div>
                        <div className="text-slate-400 text-xs">
                          Exclusion Envelope expands around boulders to safeguard rover wheels.
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-slate-400">2px</span>
                        <input
                          type="range"
                          min="2"
                          max="28"
                          value={safetyBufferPx}
                          onChange={e => setSafetyBufferPx(Number(e.target.value))}
                          className="flex-1 accent-orange-500 h-2 bg-black/60 rounded-lg cursor-pointer"
                        />
                        <span className="text-xs font-mono text-slate-400">28px</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col md:flex-row items-center gap-6">
                        {/* Interactive Radar SVG */}
                        <div className="w-48 h-48 rounded-2xl bg-[#040815] border border-cyan-500/30 relative flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          {/* Radial grid circles */}
                          <div className="absolute w-40 h-40 rounded-full border border-cyan-500/15" />
                          <div className="absolute w-28 h-28 rounded-full border border-cyan-500/20" />
                          <div className="absolute w-16 h-16 rounded-full border border-cyan-500/30" />
                          
                          {/* Central Rover Node */}
                          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 z-10 shadow-[0_0_12px_rgba(6,182,212,1)]" />

                          {/* Boulders with dynamic buffer rings */}
                          {[
                            { x: 35, y: 40, r: 4 },
                            { x: 130, y: 45, r: 6 },
                            { x: 140, y: 130, r: 5 },
                            { x: 50, y: 135, r: 7 }
                          ].map((boulder, bIdx) => (
                            <div
                              key={bIdx}
                              className="absolute flex items-center justify-center"
                              style={{ left: boulder.x, top: boulder.y }}
                            >
                              {/* Buffer Ring */}
                              <div
                                className="absolute rounded-full border border-orange-500/60 bg-orange-500/15 transition-all duration-150 pointer-events-none"
                                style={{
                                  width: boulder.r * 2 + safetyBufferPx * 2.2,
                                  height: boulder.r * 2 + safetyBufferPx * 2.2
                                }}
                              />
                              {/* Boulder Core */}
                              <div
                                className="rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] z-10"
                                style={{ width: boulder.r * 2, height: boulder.r * 2 }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Readouts */}
                        <div className="flex-1 space-y-2.5 font-mono text-xs">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="text-[10px] text-slate-400">DETECTED ROCKS</div>
                              <div className="text-base font-bold text-amber-400 mt-0.5">14 Features</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="text-[10px] text-slate-400">EXCLUSION AREA</div>
                              <div className="text-base font-bold text-orange-400 mt-0.5">{(12.5 + safetyBufferPx * 0.8).toFixed(1)}%</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="text-[10px] text-slate-400">SAFE TRAVEL CORRIDOR</div>
                              <div className="text-base font-bold text-emerald-400 mt-0.5">{(87.5 - safetyBufferPx * 0.8).toFixed(1)}%</div>
                            </div>
                          </div>
                          <p className="text-slate-300 text-xs font-sans leading-relaxed">
                            Increasing the buffer expands exclusion zones around sharp rock edges, forcing pathfinding into wider safety corridors. Recommended setting for Jezero Delta is 14px to 18px.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. MISSION CONFIGURATION PARAMETER SIMULATOR */}
                  {selectedSectionId === 'configuration' && (
                    <div className="space-y-4 font-mono text-xs text-slate-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                          <div className="flex justify-between">
                            <span>Max Traversable Slope:</span>
                            <span className="text-orange-400 font-bold">{roverMaxSlope}°</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="25"
                            value={roverMaxSlope}
                            onChange={e => setRoverMaxSlope(Number(e.target.value))}
                            className="w-full accent-orange-500 h-2 bg-black/60 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>5° (Ultra Safe)</span>
                            <span>14° (Nominal)</span>
                            <span>25° (Critical Tipping)</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                          <div className="flex justify-between">
                            <span>Battery Energy Reserve:</span>
                            <span className="text-cyan-400 font-bold">{roverBatteryWh} Wh</span>
                          </div>
                          <input
                            type="range"
                            min="1200"
                            max="3600"
                            step="100"
                            value={roverBatteryWh}
                            onChange={e => setRoverBatteryWh(Number(e.target.value))}
                            className="w-full accent-cyan-500 h-2 bg-black/60 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>1,200 Wh</span>
                            <span>2,400 Wh (Nominal)</span>
                            <span>3,600 Wh (Full)</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Computed Range Envelope:</span>
                          <span className="text-emerald-400 font-bold text-sm">{(roverBatteryWh / 18.5).toFixed(1)} meters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Slope Tipping Margin:</span>
                          <span className={`font-bold ${roverMaxSlope > 18 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {roverMaxSlope > 18 ? 'WARNING (Steep Grade)' : 'NOMINAL (Safe Clearance)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. TERRAIN INTELLIGENCE CV SIMULATOR */}
                  {selectedSectionId === 'terrain-intelligence' && (
                    <div className="space-y-4 font-mono text-xs text-slate-300">
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <span className="text-slate-400 shrink-0">CV Mode:</span>
                        {(['edge', 'slope', 'contour', 'raw'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setActiveCvFilter(mode)}
                            className={`px-3 py-1.5 rounded-xl border transition cursor-pointer text-xs uppercase ${
                              activeCvFilter === mode
                                ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow'
                                : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {mode === 'edge' ? 'Sobel Edge Detection' : mode === 'slope' ? 'Slope Gradient Heatmap' : mode === 'contour' ? 'Contour Polygon Mask' : 'Raw Composite'}
                          </button>
                        ))}
                      </div>

                      <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center gap-6">
                        {/* Filtered Mars Terrain Simulation Swatch */}
                        <div className={`w-48 h-32 rounded-xl border flex items-center justify-center transition-all ${
                          activeCvFilter === 'edge' ? 'bg-[#030818] border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' :
                          activeCvFilter === 'slope' ? 'bg-gradient-to-tr from-emerald-950 via-amber-950 to-red-950 border-amber-400 text-amber-200' :
                          activeCvFilter === 'contour' ? 'bg-[#080d25] border-orange-400 text-orange-300' :
                          'bg-[#2d1810] border-orange-800 text-orange-200'
                        }`}>
                          <div className="text-center space-y-1">
                            <Cpu className="w-6 h-6 mx-auto animate-pulse" />
                            <div className="text-[11px] font-bold uppercase">{activeCvFilter} Filter Active</div>
                            <div className="text-[9px] opacity-75">1024x1024 Resolution</div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="text-sm font-bold text-white font-sans">
                            Classical Computer Vision Pipeline
                          </div>
                          <p className="text-xs font-sans text-slate-300 leading-relaxed">
                            Applies pixel luminance gradients to segment rock obstacles from sandy regolith. Features exceeding 15cm height are flagged into downstream hazard analysis with zero external server latency.
                          </p>
                          <div className="flex items-center gap-4 text-cyan-400 font-mono text-xs pt-1">
                            <span>Detected: 18 Rocks</span>
                            <span>·</span>
                            <span>Confidence: 98.4%</span>
                            <span>·</span>
                            <span>Latency: 14ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. VALIDATION HARNESS DIAGNOSTIC SIMULATOR */}
                  {selectedSectionId === 'validation-harness' && (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Automated Subsystem Diagnostics:</span>
                        <button
                          onClick={handleRunDiagnostics}
                          disabled={diagnosticRunning}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${diagnosticRunning ? 'animate-spin' : ''}`} />
                          <span>{diagnosticRunning ? 'Testing Subsystems...' : 'Run Diagnostics'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {[
                          { name: 'A* Pathfinding Matrix Solver', status: 'PASS', time: '4.2ms' },
                          { name: 'PDS HiRISE Coordinate Transform', status: 'PASS', time: '1.8ms' },
                          { name: 'Hazard Buffer Envelope Generator', status: 'PASS', time: '6.1ms' },
                          { name: 'Telemetry Telecommand Serializer', status: 'PASS', time: '0.9ms' }
                        ].map((diag, dIdx) => (
                          <div key={dIdx} className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${diagnosticRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                              <span className="text-slate-200">{diag.name}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                              {diagnosticRunning ? 'TESTING' : `${diag.status} (${diag.time})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. GENERIC CONTEXTUAL SIMULATION FOR OTHER MODULES */}
                  {!['route-lab', 'hazard-analysis', 'configuration', 'terrain-intelligence', 'validation-harness'].includes(selectedSectionId) && (
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
                      <div className="space-y-1">
                        <div className="text-slate-200 font-bold flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <span>Telemetry &amp; Workstation Status Nominal</span>
                        </div>
                        <p className="text-slate-400 text-[11px] font-sans">
                          This module runs autonomously and synchronizes state with the global MARSNAV mission memory.
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
                {/* DETAILED TECHNICAL SECTIONS A THROUGH G                  */}
                {/* ======================================================== */}

                {/* A. What is this section? */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Info className="w-4 h-4" />
                    <span>A. Module Overview &amp; Role</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-sans">
                    {activeSection.whatIsIt}
                  </p>
                </div>

                {/* B. Why is it important? */}
                <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Zap className="w-4 h-4" />
                    <span>B. Why It Is Critical to Mission Safety</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-sans">
                    {activeSection.whyImportant}
                  </p>
                </div>

                {/* C. How to use it (Step-by-Step Instructions) */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>C. How to Operate (Numbered Procedures)</span>
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

                {/* D. Available Tools and Controls */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>D. Available Tools &amp; Operating Controls</span>
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
                    <span>E. Expected Output &amp; Verification Criteria</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-sans">
                    {activeSection.expectedOutput}
                  </p>
                </div>

                {/* F. Real Mission Workflow */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-xs font-mono uppercase tracking-wider">
                    <Compass className="w-4 h-4" />
                    <span>F. Real Mission Operations Example</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-sans italic">
                    &ldquo;{activeSection.realWorkflow}&rdquo;
                  </p>
                </div>

                {/* G. Next Operation & Related Modules */}
                <div className="p-6 rounded-2xl bg-[#080c1d] border border-white/15 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300 font-bold text-xs font-mono uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-orange-400" />
                      <span>G. Downstream Connections &amp; Next Operation</span>
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
            /* VIEW 2: ALL 22 MODULES LIBRARY                           */
            /* ======================================================== */
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#030611]">
              
              {/* Left Sidebar for Quick Category Navigation */}
              <div className="w-full md:w-72 bg-[#040817] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold px-2">
                    Module Index ({manualSections.length} Total)
                  </div>
                  <p className="text-[11px] font-sans text-slate-400 px-2 leading-tight">
                    Every workspace is documented with operating guides.
                  </p>
                </div>

                {/* Filter Categories */}
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
                      <span>{cat}</span>
                      <span className="text-[10px] opacity-75">
                        {cat === 'ALL' ? manualSections.length : manualSections.filter(s => s.category === cat).length}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold px-2">
                    Primary Workflow
                  </div>
                  <button
                    onClick={() => setCurrentView('flowchart')}
                    className="w-full p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 transition text-xs font-mono font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>View 12-Step Flowchart</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Content Grid with Search */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-[#030611] text-slate-200">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search all 22 modules by name, algorithm, tool, or keyword..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-orange-500 shadow-inner"
                  />
                </div>

                {/* Module Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSections.map(sec => {
                    const isWorkflow = sec.workflowStep !== null;

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
                            <div className="flex items-center space-x-1.5">
                              {isWorkflow ? (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                                  STEP 0{sec.workflowStep}
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                                  SUPPORT
                                </span>
                              )}
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/50 text-slate-300 border border-white/10">
                                {sec.category}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-white font-bold text-base font-sans group-hover:text-orange-400 transition-colors">
                              {sec.title}
                            </h3>
                            <p className="text-slate-400 text-xs font-mono">{sec.subtitle}</p>
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
                  7 Core Subsystems of MARSNAV
                </h2>
                <p className="text-slate-400 text-xs font-mono max-w-2xl mx-auto">
                  Click any subsystem block or module to launch its interactive walkthrough in the flowchart view.
                </p>
              </div>

              {/* Subsystems Visual Cluster */}
              <div className="max-w-5xl w-full space-y-6">
                {[
                  {
                    name: '1. Surface Exploration & EVA Operations',
                    color: 'border-orange-500/40 bg-orange-950/15',
                    modules: [
                      { id: 'overview', title: 'Mission Overview', desc: 'Bird-eye telemetry & rover health' },
                      { id: 'marsnav-v4', title: 'MARSWALK OPS', desc: 'Real-time EVA heading & surface walk' },
                      { id: 'field-notebook', title: 'Spatial Field Notebook', desc: 'Geological sample logging with map link' }
                    ]
                  },
                  {
                    name: '2. Remote Sensing & Planetary Topography',
                    color: 'border-cyan-500/40 bg-cyan-950/15',
                    modules: [
                      { id: 'explorer-3d', title: '3D Terrain Explorer', desc: 'Topographical relief & Three.js mesh' },
                      { id: 'live-mission-data', title: 'Live NASA Stream', desc: 'Atmospheric opacity & environmental telemetry' },
                      { id: 'mission-data', title: 'Mission Data & DEM', desc: 'HiRISE DTM scale & elevation datums' }
                    ]
                  },
                  {
                    name: '3. Data Ingestion & NASA Repositories',
                    color: 'border-amber-500/40 bg-amber-950/15',
                    modules: [
                      { id: 'configuration', title: 'Step 01: Mission Configuration', desc: 'Max slope limits & battery constraints' },
                      { id: 'nasa-raw-feed', title: 'Step 02: NASA Raw Image Feed', desc: 'JPL Mars 2020 Navcam & Hazcam download' },
                      { id: 'dataset-catalogue', title: 'Step 03: Dataset Catalogue', desc: 'PDS compliance & resolution checksums' }
                    ]
                  },
                  {
                    name: '4. Automated Computer Vision & Hazard Intelligence',
                    color: 'border-blue-500/40 bg-blue-950/15',
                    modules: [
                      { id: 'terrain-intelligence', title: 'Step 04: Terrain Intelligence', desc: 'Sobel edge detection & contour polygons' },
                      { id: 'hazard-analysis', title: 'Step 05: Hazard Analysis', desc: 'Adjustable safety buffers (2px - 28px)' },
                      { id: 'risk-assessment', title: 'Step 06: Risk Assessment', desc: 'Multi-factor traversal safety index' },
                      { id: 'base-camp-intel', title: 'Base Camp Intelligence', desc: 'Landing site slope & communication LOS' }
                    ]
                  },
                  {
                    name: '5. Autonomous Pathfinding & Trajectory Generation',
                    color: 'border-orange-500/40 bg-orange-950/15',
                    modules: [
                      { id: 'route-lab', title: 'Step 07: Route Laboratory', desc: 'A* pathfinding with Alpha-Delta strategies' },
                      { id: 'route-comparison', title: 'Step 08: Route Comparison', desc: 'Distance vs Energy vs Safety trade-offs' },
                      { id: 'scenario-testing', title: 'Step 09: Scenario Testing', desc: 'Dust storm & anomaly emergency injection' }
                    ]
                  },
                  {
                    name: '6. Verification, Diagnostics & Mission Audit',
                    color: 'border-emerald-500/40 bg-emerald-950/15',
                    modules: [
                      { id: 'validation-harness', title: 'Step 10: Validation Harness', desc: 'Automated unit test diagnostics' },
                      { id: 'model-eval', title: 'Step 11: Model Evaluation', desc: 'Precision, recall & CV benchmarks' },
                      { id: 'audit', title: 'Step 12: Mission Audit', desc: 'Compiled dossier & one-click PDF report' }
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
                    Essential operational workflows, safety parameters, and keyboard controls for rover navigators.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    {
                      category: 'ROUTE GENERATION',
                      title: 'Planning a Safe Surface Traverse',
                      steps: [
                        'Open Route Laboratory (Step 07) from the Navigation menu.',
                        'Click "Set Start [S]" and select the rover current coordinates.',
                        'Click "Set Destination [D]" and click the target science outcrop.',
                        'Select Strategy: Route Gamma for Maximum Clearance, Route Alpha for Shortest Trajectory.',
                        'Click "Plan Route" to compute the collision-free A* trajectory.'
                      ]
                    },
                    {
                      category: 'HAZARD MITIGATION',
                      title: 'Inspecting & Buffering Surface Obstacles',
                      steps: [
                        'Open Hazard Analysis (Step 05) or Terrain Intelligence (Step 04).',
                        'Review automatically extracted rock and pit polygon contours.',
                        'Adjust the Safety Buffer Clearance slider (2px to 28px) to expand safety margins.',
                        'Use 3D Terrain Explorer to inspect slope grades along the corridor.'
                      ]
                    },
                    {
                      category: 'MISSION REPORTING',
                      title: 'Exporting Mission Audit PDF Dossier',
                      steps: [
                        'Complete desired route calculation, hazard check, and field notes.',
                        'Navigate to Mission Audit (Step 12) under the Validation menu.',
                        'Review compiled dossier summary: Route Metrics, Test Diagnostics, and Field Observations.',
                        'Click "Export Mission PDF Dossier" to download a formatted multi-page report.'
                      ]
                    },
                    {
                      category: 'AI CONSULTATION',
                      title: 'Consulting ORBIT AI Assistant',
                      steps: [
                        'Open ORBIT AI Assistant from the Assistance menu.',
                        'Type questions regarding rover kinematics, wheel slip, or Jezero mineralogy.',
                        'Receive instant expert recommendations powered by Google Gemini.'
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
