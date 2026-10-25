import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  X, 
  Compass, 
  Map, 
  Cpu, 
  Database, 
  AlertTriangle, 
  Route, 
  Activity, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight, 
  Play, 
  HelpCircle,
  ExternalLink,
  Sparkles,
  Layers,
  Award,
  Terminal,
  BookMarked
} from 'lucide-react';

interface MarsNavGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export default function MarsNavGuide({ isOpen, onClose, onStartTour }: MarsNavGuideProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'tour' | 'levels' | 'glossary'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const detailedSections = [
    {
      id: 'overview',
      number: '01',
      title: 'Mission Overview & Architecture',
      icon: Compass,
      summary: 'High-level summary of MARSNAV v2.4, Jezero Crater exploration parameters, and multi-sensor navigation architecture.',
      whatItIs: 'MARSNAV is an elite mission intelligence platform built for Jezero Crater rover traverse planning, AI-driven terrain segmentation, hazard analysis, and scenario stress testing.',
      whyItExists: 'Designed to bridge the gap between raw NASA Perseverance telemetry and actionable operator decision-making, allowing users to safely plan routes across treacherous Martian terrain.',
      howToAccess: 'Access from the top navigation bar or the floating ORBIT assistant.',
      controls: [
        { name: 'Navigation Bar Links', desc: 'Jump instantly to any core section of the platform.' },
        { name: 'Mission Drawer', desc: 'Load and save persistent mission states to cloud storage.' }
      ],
      stepByStep: [
        'Launch MARSNAV and review the Mission Overview dashboard.',
        'Inspect the current rover telemetry status (battery, solar angle, slip rate).',
        'Use the 3D map or AI lab to begin exploration.'
      ],
      outputInterpretation: 'Green telemetry indicators show normal operational status; amber/red alerts indicate power degradation or slip hazards.',
      limitations: 'Simulated telemetry and AI models represent trained approximations of real NASA Curiosity and Perseverance data.'
    },
    {
      id: 'terrain-3d',
      number: '02',
      title: '3D Martian Explorer',
      icon: Map,
      summary: 'Cinematic 3D Jezero Crater surface with PBR regolith, procedural rock scatter, lighting controls, and camera views.',
      whatItIs: 'An interactive WebGL 3D environment rendering Jezero Crater topography with physically based rendering (PBR) materials, dynamic sunlight, and rover models.',
      whyItExists: 'Provides mission operators with spatial context, elevation profiles, and visual line-of-sight validation before executing rover commands.',
      howToAccess: 'Select "3D Map" from the navigation header or scroll to the 3D terrain section.',
      controls: [
        { name: 'Sun Elevation Slider', desc: 'Adjust solar altitude to evaluate shadow lengths and contrast.' },
        { name: 'Camera Orbit & Zoom', desc: 'Rotate, pan, and zoom around the rover and surrounding geological strata.' },
        { name: 'Wireframe Toggle', desc: 'Display underlying triangular mesh elevation polygons.' }
      ],
      stepByStep: [
        'Click and drag on the 3D canvas to rotate the camera perspective.',
        'Scroll mouse wheel to zoom in on geological formations or rover tracks.',
        'Use the Control Dock to toggle lighting and telemetry overlays.'
      ],
      outputInterpretation: 'Steep slopes and dense rock clusters appear in highlighted hazard colors; smooth regolith plains indicate safe traversable ground.',
      limitations: 'WebGL rendering performance depends on client GPU capabilities; maximum polygon density is optimized for real-time 60fps.'
    },
    {
      id: 'terrain-ai',
      number: '03',
      title: 'Terrain AI & Segmentation',
      icon: Cpu,
      summary: 'Four-class AI4Mars terrain segmentation (Soil, Bedrock, Sand, Big Rock) with real-time classification overlays.',
      whatItIs: 'A semantic segmentation neural network trained on NASA Mars rover imagery to classify every pixel of camera data into 4 distinct geological classes.',
      whyItExists: 'Enables autonomous rovers and human operators to instantly identify treacherous sand traps, unstable bedrock, and boulder hazards.',
      howToAccess: 'Click "Terrain AI" in the navigation bar to open the image analysis laboratory.',
      controls: [
        { name: 'Preset Image Selector', desc: 'Choose from verified Perseverance Hazcam and Navcam captures.' },
        { name: 'Custom Image Upload', desc: 'Upload external Mars or terrestrial test imagery for instant inference.' },
        { name: 'Segmentation Overlay Toggle', desc: 'Switch between raw photo and color-coded AI classification mask.' }
      ],
      stepByStep: [
        'Select a preset Mars image or upload your own photo.',
        'Click "Run Segmentation Inference" to trigger the AI model.',
        'Inspect class percentage breakdown (Soil %, Sand %, Bedrock %, Big Rock %).'
      ],
      outputInterpretation: 'Red overlays denote Big Rocks; yellow denotes Sand traps; blue denotes Bedrock; green denotes safe Soil regolith.',
      limitations: 'Classification accuracy may vary under extreme lighting shadows or low-resolution imagery.'
    },
    {
      id: 'dataset-catalogue',
      number: '04',
      title: 'Dataset Catalogue & AI4MARS',
      icon: Database,
      summary: 'Exploration of ground truth training datasets, label distributions, and model validation metrics.',
      whatItIs: 'A structured catalogue of training samples, annotation statistics, and dataset split distributions used for model verification.',
      whyItExists: 'Provides transparency into the underlying training data provenance and dataset balance across Jezero Crater terrains.',
      howToAccess: 'Navigate to "Data Cat" from the navigation bar.',
      controls: [
        { name: 'Dataset Filter Tabs', desc: 'Filter training samples by terrain class and difficulty rating.' },
        { name: 'Sample Inspector', desc: 'View high-resolution ground truth masks side-by-side with original photos.' }
      ],
      stepByStep: [
        'Browse the catalogue of annotated Mars surface images.',
        'Click on any dataset entry to view pixel distribution histograms.',
        'Review class balance metrics to verify model fairness.'
      ],
      outputInterpretation: 'Balanced class distribution curves ensure the AI model does not suffer from bias toward common soil backgrounds.',
      limitations: 'Catalogue contains representative subsets of the full AI4Mars open-source dataset.'
    },
    {
      id: 'hazard-analysis',
      number: '05',
      title: 'Hazard Analysis Lab',
      icon: AlertTriangle,
      summary: 'Slip risk calculation, rock slope analysis, and wheel entrapment hazard probability mapping.',
      whatItIs: 'An interactive soil mechanics simulator evaluating rover wheel sinkage, slope stability, and slippage risk under varying regolith cohesion.',
      whyItExists: 'Prevents catastrophic rover immobilizations like those experienced during historical Mars mission entrapments.',
      howToAccess: 'Select "Hazards" from the top navigation menu.',
      controls: [
        { name: 'Slope Angle Slider', desc: 'Test traverse stability across inclines from 0 to 45 degrees.' },
        { name: 'Regolith Cohesion Selector', desc: 'Switch between loose dust, packed sand, and fractured rock crust.' },
        { name: 'Wheel Torque Adjuster', desc: 'Simulate high-power wheel commands against resistance.' }
      ],
      stepByStep: [
        'Set desired slope angle and regolith type in the control panel.',
        'Click "Calculate Slip Risk" to run soil mechanics algorithms.',
        'Review the resulting slip probability percentage and sinkage depth.'
      ],
      outputInterpretation: 'Slip probabilities above 35% trigger automatic route rejection; safe operational zones are marked in green.',
      limitations: 'Simplified 2D soil mechanics model approximating complex multi-wheel articulation dynamics.'
    },
    {
      id: 'route-laboratory',
      number: '06',
      title: 'Route Laboratory & Planner',
      icon: Route,
      summary: 'Waypoint optimization, energy consumption models, and traverse distance calculations across Jezero Crater.',
      whatItIs: 'A pathfinding workbench that computes optimal rover traverses between scientific points of interest while minimizing energy drain and hazard exposure.',
      whyItExists: 'Helps mission planners design efficient multi-kilometer drives while adhering to battery capacity and solar recharge limits.',
      howToAccess: 'Click "Routes" in the navigation header.',
      controls: [
        { name: 'Waypoint Placer', desc: 'Click on the Jezero Crater grid to drop navigation waypoints.' },
        { name: 'Algorithm Selector', desc: 'Choose between A* optimal, Hazard-Avoidance, and Energy-Minimizing pathfinders.' },
        { name: 'Elevation Profile Viewer', desc: 'Inspect elevation changes along the planned traverse.' }
      ],
      stepByStep: [
        'Select start and destination coordinates or place custom waypoints.',
        'Choose pathfinding algorithm and click "Compute Optimal Traverse".',
        'Examine total distance, estimated energy drain, and hazard score.'
      ],
      outputInterpretation: 'Polyline routes color-coded green (safe), yellow (moderate caution), or red (high hazard zone).',
      limitations: 'Assumes flat or linearly interpolated elevation between discrete grid nodes.'
    },
    {
      id: 'scenario-testing',
      number: '07',
      title: 'Scenario Stress Testing',
      icon: Activity,
      summary: 'Simulate extreme dust storms, power degradation, communication blackouts, and wheel slip anomalies.',
      whatItIs: 'A mission simulation testbed that injects emergency anomalies into the rover system to verify autonomous fault response protocols.',
      whyItExists: 'Ensures mission operators are prepared for unexpected Martian environmental hazards and hardware faults.',
      howToAccess: 'Select "Stress Test" from the navigation bar.',
      controls: [
        { name: 'Anomaly Selector', desc: 'Choose from Dust Storm, Solar Panel Degradation, Comms Dropout, or Wheel Slip.' },
        { name: 'Severity Slider', desc: 'Scale anomaly intensity from minor warning to critical emergency.' },
        { name: 'Execute Simulation', desc: 'Trigger automated recovery routines.' }
      ],
      stepByStep: [
        'Choose an anomaly scenario from the control menu.',
        'Adjust severity level and click "Initiate Stress Simulation".',
        'Observe telemetry response and autonomous contingency routing.'
      ],
      outputInterpretation: 'Logs show system recovery actions, battery conservation modes, and safe-haven holding patterns.',
      limitations: 'Simulation models predefined failure modes rather than open-ended chaotic physics.'
    },
    {
      id: 'validation-harness',
      number: '08',
      title: 'Validation Test Harness',
      icon: CheckCircle2,
      summary: 'Automated test suites verifying navigation accuracy, telemetry sync, and inference pipeline latency.',
      whatItIs: 'An automated diagnostic test suite verifying the health and performance of all MARSNAV software subsystems.',
      whyItExists: 'Guarantees that AI models, telemetry pipelines, and 3D rendering engines meet strict operational readiness standards.',
      howToAccess: 'Click "Tests" in the top navigation bar.',
      controls: [
        { name: 'Run All Diagnostics', desc: 'Execute the complete automated test suite.' },
        { name: 'Subsystem Filter', desc: 'Inspect individual test results for AI, WebGL, Telemetry, and Database.' }
      ],
      stepByStep: [
        'Open the Validation Test Harness section.',
        'Click "Execute Diagnostic Suite".',
        'Review pass/fail status and execution latency for each test.'
      ],
      outputInterpretation: 'All tests should display green checkmarks and "PASS" status before flight operations.',
      limitations: 'Tests run locally within the browser execution environment.'
    },
    {
      id: 'audit-report',
      number: '09',
      title: 'Mission Audit & Compliance',
      icon: ShieldCheck,
      summary: 'Comprehensive mission log, security audit trails, and data provenance records.',
      whatItIs: 'A secure logging ledger recording every operator action, route computation, and AI inference request made during the session.',
      whyItExists: 'Ensures scientific reproducibility, accountability, and compliance with mission documentation standards.',
      howToAccess: 'Select "Audit" from the navigation bar.',
      controls: [
        { name: 'Export Audit Log', desc: 'Download signed JSON/CSV mission logs.' },
        { name: 'Timestamp Filter', desc: 'Review events by mission elapsed time (MET).' }
      ],
      stepByStep: [
        'Navigate to the Audit Report section.',
        'Review the chronological log of operator actions.',
        'Click "Export Certified Log" to download archival records.'
      ],
      outputInterpretation: 'Cryptographic hashes verify that audit logs have not been tampered with since creation.',
      limitations: 'Logs are stored in browser session memory or cloud database depending on user sign-in status.'
    }
  ];

  const filteredSections = detailedSections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.whatItIs.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const glossaryTerms = [
    { term: 'AI4Mars', definition: 'An open-source dataset and AI initiative for semantic terrain segmentation of Mars rover navigation images.' },
    { term: 'PBR (Physically Based Rendering)', definition: 'Rendering techniques that accurately model light interaction with surface materials using roughness, normal, and albedo maps.' },
    { term: 'Regolith', definition: 'Loose, heterogeneous fragmental material covering solid bedrock on Mars, consisting of dust, sand, and pebbles.' },
    { term: 'Semantic Segmentation', definition: 'Computer vision task of partitioning an image into multiple semantic segments (e.g., soil, bedrock, sand, rock).' },
    { term: 'Slip Probability', definition: 'The calculated statistical likelihood that rover wheels will lose traction and slip during slope traversal.' },
    { term: 'Jezero Crater', definition: 'The landing site of NASA Perseverance rover, featuring an ancient river delta system with high astrobiological interest.' },
    { term: 'Traverse', definition: 'A planned path or journey taken by a rover across planetary terrain.' },
    { term: 'Waypoint', definition: 'A specified geographical coordinate used to guide rover navigation paths.' }
  ];

  const filteredGlossary = glossaryTerms.filter(item =>
    item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#070B14] border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-950/60 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0F172A] to-[#1E1B4B] border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center space-x-2">
                <span>MARSNAV User Manual & Mission Guide</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono border border-orange-500/30">
                  v2.4 MASTER EDITION
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Beginner-to-advanced operational manual for all platform tools, AI models, and 3D navigation systems.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3 bg-[#050813] border-b border-white/10 gap-3">
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => { setActiveTab('overview'); setSelectedSectionId(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              1. Overview & Story
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'sections'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              2. All 9 Sections Manual
            </button>
            <button
              onClick={() => setActiveTab('levels')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'levels'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              3. Progressive Levels
            </button>
            <button
              onClick={() => setActiveTab('glossary')}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'glossary'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              4. Glossary & FAQ
            </button>
            <button
              onClick={() => {
                onClose();
                if (onStartTour) onStartTour();
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Walkthrough Tour</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search guide, manual, glossary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW & COMPLETE STORY */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-orange-950/40 via-[#0F172A] to-slate-900 border border-orange-500/30 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                      Welcome to MARSNAV: Your Guide to Mars Terrain Intelligence
                    </h3>
                    <p className="text-xs text-orange-300 font-mono">
                      Published by MARSNAV Flight Operations • Jezero Crater Mission Control
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">What is MARSNAV?</strong> MARSNAV is a state-of-the-art Mars terrain analysis and rover navigation platform designed to empower scientists, students, and space enthusiasts to explore Martian topography, examine terrain AI classifications, plan optimal rover traverses, and understand the complexities of autonomous planetary exploration.
                  </p>
                  <p>
                    Whether you have zero prior background in space navigation or machine learning, this comprehensive guide will walk you through every tool on the platform step-by-step.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                    <div className="text-orange-400 font-bold text-sm mb-1">1. Visual Exploration</div>
                    <p className="text-xs text-slate-400">Immersive 3D WebGL Jezero Crater topography with realistic PBR regolith and rock scatter.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                    <div className="text-orange-400 font-bold text-sm mb-1">2. AI Terrain Intelligence</div>
                    <p className="text-xs text-slate-400">Semantic segmentation classifying soil, bedrock, sand, and big rocks with pixel precision.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                    <div className="text-orange-400 font-bold text-sm mb-1">3. Mission Safety</div>
                    <p className="text-xs text-slate-400">Slip risk simulation, energy optimization, and stress testing for robust contingency planning.</p>
                  </div>
                </div>
              </div>

              {/* Quick Start Guide */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white tracking-wider uppercase flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-orange-400" />
                  <span>Beginner's 4-Step Flight Plan</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">1</div>
                    <div>
                      <div className="text-white text-xs font-semibold mb-1">Launch 3D Map</div>
                      <p className="text-xs text-slate-400">Examine the Jezero Crater terrain in 3D, rotate the camera, and check rover telemetry.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">2</div>
                    <div>
                      <div className="text-white text-xs font-semibold mb-1">Run Terrain AI</div>
                      <p className="text-xs text-slate-400">Upload or select a rover camera image to analyze soil stability and rock distribution.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">3</div>
                    <div>
                      <div className="text-white text-xs font-semibold mb-1">Plan Traverse Routes</div>
                      <p className="text-xs text-slate-400">Plot waypoints across craters and calculate slip risk and energy drain.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">4</div>
                    <div>
                      <div className="text-white text-xs font-semibold mb-1">Consult ORBIT AI</div>
                      <p className="text-xs text-slate-400">Ask questions anytime via the floating ORBIT chat assistant.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL 9 SECTIONS MANUAL */}
          {activeTab === 'sections' && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white">Complete Section-by-Section Operating Manual</h3>
                  <p className="text-xs text-slate-400">Detailed breakdown of all 9 MARSNAV platform modules.</p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredSections.map((sec) => {
                  const Icon = sec.icon;
                  const isExpanded = selectedSectionId === sec.id;
                  return (
                    <div 
                      key={sec.id} 
                      className={`p-5 rounded-2xl bg-white/[0.02] border transition-all ${
                        isExpanded ? 'border-orange-500/60 bg-white/[0.04]' : 'border-white/10 hover:border-orange-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between cursor-pointer" onClick={() => setSelectedSectionId(isExpanded ? null : sec.id)}>
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono border border-orange-500/30">
                                SECTION {sec.number}
                              </span>
                              <h4 className="text-sm font-bold text-white">{sec.title}</h4>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{sec.summary}</p>
                          </div>
                        </div>
                        <button className="text-xs text-orange-400 font-mono flex items-center space-x-1 shrink-0 ml-4 p-1">
                          <span>{isExpanded ? 'Collapse' : 'Expand Manual'}</span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-5 pt-5 border-t border-white/10 space-y-4 text-xs text-slate-300 animate-fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                              <span className="text-orange-400 font-bold block mb-1">What it is:</span>
                              <p className="text-slate-300 leading-relaxed">{sec.whatItIs}</p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                              <span className="text-orange-400 font-bold block mb-1">Why it exists:</span>
                              <p className="text-slate-300 leading-relaxed">{sec.whyItExists}</p>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                            <span className="text-orange-400 font-bold block mb-1">How to access:</span>
                            <p className="text-slate-300">{sec.howToAccess}</p>
                          </div>

                          <div>
                            <span className="text-orange-400 font-bold block mb-2">Key Controls & Parameters:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sec.controls.map((ctrl, i) => (
                                <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                                  <span className="text-white font-semibold block">{ctrl.name}</span>
                                  <span className="text-slate-400 text-[11px]">{ctrl.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-orange-400 font-bold block mb-2">Step-by-Step Operating Instructions:</span>
                            <ol className="list-decimal list-inside space-y-1 text-slate-300 bg-black/30 p-3.5 rounded-xl border border-white/5">
                              {sec.stepByStep.map((step, i) => (
                                <li key={i} className="leading-relaxed">{step}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
                              <span className="text-cyan-400 font-bold block mb-1">Output Interpretation:</span>
                              <p className="text-slate-300">{sec.outputInterpretation}</p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
                              <span className="text-amber-400 font-bold block mb-1">Limitations & Assumptions:</span>
                              <p className="text-slate-300">{sec.limitations}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PROGRESSIVE DEPTH LEVELS */}
          {activeTab === 'levels' && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Progressive Learning & Operational Levels</h3>
                <p className="text-xs text-slate-400">Master MARSNAV from cadet observer to flight director.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/30 to-slate-900 border border-blue-500/30">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono font-bold text-xs">01</div>
                    <h4 className="text-sm font-bold text-white">Level 1: Cadet Observer (Beginner)</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Focuses on visual exploration of Jezero Crater in 3D, understanding basic rover telemetry, and using the ORBIT AI assistant for general mission questions.
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    <li>Explore 3D Mars topography</li>
                    <li>Learn rover status indicators</li>
                    <li>Ask ORBIT basic mission questions</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-slate-900 border border-cyan-500/30">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">02</div>
                    <h4 className="text-sm font-bold text-white">Level 2: Terrain Operator (Intermediate)</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Involves running AI terrain segmentation on rover Hazcam images, identifying sand traps vs bedrock, and evaluating basic slip hazards.
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    <li>Run AI4Mars semantic classification</li>
                    <li>Analyze soil and rock pixel ratios</li>
                    <li>Evaluate slope slip probabilities</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-500/30">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs">03</div>
                    <h4 className="text-sm font-bold text-white">Level 3: Mission Specialist (Advanced)</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Focuses on route planning across multi-kilometer waypoints, energy consumption optimization, and disaster stress testing simulations.
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    <li>Compute optimal rover traverses</li>
                    <li>Model battery drain and solar recharge</li>
                    <li>Simulate dust storms and comms loss</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 to-slate-900 border border-purple-500/30">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-mono font-bold text-xs">04</div>
                    <h4 className="text-sm font-bold text-white">Level 4: Flight Director (Expert)</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Mastery of validation test harnesses, audit log compliance verification, cryptographic mission log exports, and autonomous contingency overrides.
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    <li>Execute automated subsystem diagnostics</li>
                    <li>Audit cryptographic mission logs</li>
                    <li>Certify flight readiness and data provenance</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GLOSSARY & FAQ */}
          {activeTab === 'glossary' && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Searchable Technical Glossary & FAQ</h3>
                <p className="text-xs text-slate-400">Definitions of key terms, acronyms, and planetary science concepts used in MARSNAV.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredGlossary.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <h4 className="text-xs font-bold text-orange-400 mb-1">{item.term}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.definition}</p>
                  </div>
                ))}
                {filteredGlossary.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-slate-400 text-xs font-mono">
                    No glossary terms found matching "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#050813] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>MARSNAV Master Manual v2.4 • Powered by Gemini AI & WebGL</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
}
