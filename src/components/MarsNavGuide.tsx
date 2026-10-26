import React, { useState, useEffect } from 'react';
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
  BookMarked,
  Check,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';

interface MarsNavGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export default function MarsNavGuide({ isOpen, onClose, onStartTour }: MarsNavGuideProps) {
  const [activeTab, setActiveTab] = useState<'academy' | 'tour' | 'glossary' | 'troubleshooting'>('academy');
  const [activeChapterId, setActiveChapterId] = useState<number>(1);
  const [completedChapters, setCompletedChapters] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('marsnav_academy_completed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [tourStep, setTourStep] = useState<number>(1);

  useEffect(() => {
    try {
      localStorage.setItem('marsnav_academy_completed', JSON.stringify(completedChapters));
    } catch (e) {
      console.warn('Failed saving progress', e);
    }
  }, [completedChapters]);

  if (!isOpen) return null;

  const chapters = [
    {
      id: 1,
      title: 'Welcome to MARSNAV',
      subtitle: 'Mission Architecture & Core Philosophy',
      icon: Compass,
      summary: 'Introduction to Jezero Crater autonomous rover navigation, multi-layer hazard evaluation, and mission safety standards.',
      content: `MARSNAV is an elite planetary robotics workstation designed for mission planners and scientists navigating Jezero Crater. 
      It synthesizes multi-resolution MRO HiRISE orbital data, AI-driven terrain segmentation, energy-aware pathfinding, and interactive rover simulations.
      
      ### Core Workflow
      1. **Terrain Acquisition**: Load verified NASA Perseverance Hazcam/Navcam frames or upload custom imagery.
      2. **Automatic Segmentation**: Classical computer vision edge and contour detection identifies rocks, sand traps, and bedrock depressions.
      3. **Multi-Tier Pathfinding**: Compute optimal routes across A* traversal grids while respecting obstacle clearance safety margins.
      4. **Kinematic Simulation**: Validate traverse energy consumption, battery reserve, and arrival times.`,
      whyItMatter: 'Safe traversal planning prevents costly wheel damage and catastrophic rover entrapment on Mars.',
      commonMistake: 'Assuming simulated paths guarantee zero real-world slippage without physical soil mechanics validation.',
      quiz: {
        question: 'What is the primary role of automated terrain segmentation in MARSNAV?',
        options: [
          'To generate decorative aesthetic filters',
          'To identify rocks, sand traps, and hazard zones for safe route planning',
          'To control real-time rover motors directly from Earth'
        ],
        correct: 1,
        explanation: 'Terrain segmentation analyzes image luminance and gradients to propose hazard masks that guide pathfinding algorithms around dangerous obstacles.'
      }
    },
    {
      id: 2,
      title: 'Mission Planner Workspace',
      subtitle: 'Mastering the Core Navigation Interface',
      icon: Map,
      summary: 'Deep dive into the MarsNav v4.0 Mission Planner controls, start/destination placement, and live status overlays.',
      content: `The Mission Planner is your primary command center for executing surface traverses.
      
      ### Key Controls & Indicators
      - **SET START [S]**: Click the map to define the rover starting position in image-coordinate space.
      - **SET DESTINATION [D]**: Define the mission target objective.
      - **RE-SCAN TERRAIN**: Trigger the automated classical CV edge detector to extract new obstacle polygons.
      - **MARK OBSTACLE**: Manually flag unmapped hazards or boulders.
      - **ROUTE STRATEGIES**: Toggle between Alpha (shortest), Beta (lowest cost), Gamma (high clearance), and Delta (science detour).`,
      whyItMatter: 'Precise endpoint alignment ensures route polylines touch the exact center of start and destination markers.',
      commonMistake: 'Placing destination points directly inside impassable rock polygons without safety clearance margins.',
      quiz: {
        question: 'What does Route Gamma prioritize?',
        options: [
          'Absolute maximum distance',
          'Maximum obstacle clearance buffer (widest safety zone)',
          'Minimum energy use regardless of hazards'
        ],
        correct: 1,
        explanation: 'Route Gamma computes paths with wide safety clearance buffers to maintain distance from high-risk boulders.'
      }
    },
    {
      id: 3,
      title: 'NASA Imagery & Terrain Uploads',
      subtitle: 'MRO HiRISE, Navcams, and Custom Data',
      icon: Database,
      summary: 'How to ingest, calibrate, and troubleshoot Martian photographic feeds and local file uploads.',
      content: `MARSNAV integrates live telemetry from NASA's Mars 2020 Perseverance rover archives through secure backend proxy routes.
      
      ### Ingestion Pipeline
      - **NASA Raw Feed**: Browse live Sol captures from Navcam and Hazcam cameras.
      - **Custom Uploads**: Drop any PNG/JPG image to test custom terrain analysis.
      - **Provenance Metadata**: Inspect rover name, Sol number, camera type, and acquisition timestamp.`,
      whyItMatter: 'Correct spatial calibration ensures pixel-level traverse distances correspond accurately to scale.',
      commonMistake: 'Failing to verify image aspect ratio, causing coordinate stretching during pathfinding.',
      quiz: {
        question: 'What should you do if an external NASA image fails to load due to CORS restrictions?',
        options: [
          'Restart your computer',
          'Use the built-in resilient image proxy or upload a local terrain file',
          'Ignore the error and plan routes blindly'
        ],
        correct: 1,
        explanation: 'The application automatically engages proxy routing or allows local file uploads to ensure uninterrupted planning.'
      }
    },
    {
      id: 4,
      title: 'Automatic Terrain Detection & Segmentation',
      subtitle: 'Classical Computer Vision Baseline & Mask Contours',
      icon: Cpu,
      summary: 'Understanding shape-aware hazard contour polygons, geological classes, and uncertainty margins.',
      content: `MARSNAV employs a rigorous classical computer-vision baseline for automated terrain feature extraction without fabricating neural weights.
      
      ### Geological Classes
      1. **Rocks & Boulders**: Impassable obstacles with hazard safety buffers.
      2. **Suspected Pits / Depressions**: Low-lying topography requiring conservative clearance.
      3. **Loose Sand Ripples**: High-traversal cost regions prone to wheel slip.
      4. **Exposed Bedrock Slabs**: Stable high-friction traversal areas.
      5. **Uncertain Boundary Zones**: Transitional terrain with moderate risk.`,
      whyItMatter: 'Shape-aware polygon contours accurately follow the irregular edges of boulders rather than simplistic circles.',
      commonMistake: 'Treating classical CV feature detections as verified ground-truth subsurface depth measurements.',
      quiz: {
        question: 'How are loose sand ripples classified in traversability planning?',
        options: [
          'As impassable solid walls',
          'As higher traversal-cost regions to discourage slip risk',
          'As recharge stations'
        ],
        correct: 1,
        explanation: 'Sand ripples receive higher traversal cost penalties in pathfinding to encourage the rover to navigate around slip-prone dunes.'
      }
    },
    {
      id: 5,
      title: 'Route Planning & A* Pathfinding',
      subtitle: 'Grid Graphs, Safety Buffers, and Fallback Modes',
      icon: Route,
      summary: 'How the A* pathfinding engine computes collision-free trajectories around detected hazard zones.',
      content: `The pathfinding engine maps 256x256 traversability grids using multi-tier A* search algorithms.
      
      ### Safety Mechanisms
      - **Core Blocked Grids**: Impassable rock pixels (Cost = Infinity).
      - **Safety Buffer Zones**: Expandable clearance margins (2px to 28px) around obstacles.
      - **Fallback Modes**: Automatically degrades gracefully to reduced margin or straight-line guidance if optimal paths are blocked.`,
      whyItMatter: 'Adjusting safety buffer clearances gives operators direct control over rover conservatism near hazards.',
      commonMistake: 'Setting hazard clearance buffers too tight when navigating through dense boulder fields.',
      quiz: {
        question: 'What happens if no safe path is found around a blocked obstacle cluster?',
        options: [
          'The application crashes',
          'The planner engages fallback modes and alerts the operator',
          'The rover teleports to the destination'
        ],
        correct: 1,
        explanation: 'The system gracefully reports planning diagnostics and engages fallback modes so the operator can adjust buffers or waypoints.'
      }
    },
    {
      id: 6,
      title: 'Rover Simulation Engine',
      subtitle: 'Kinematic Traversal, ETA, and Real-Time Animation',
      icon: Activity,
      summary: 'Supervising autonomous rover drive execution along planned route polylines.',
      content: `Once a route is computed, you can simulate rover traversal in real time using the simulation control dock.
      
      ### Simulation Features
      - **3D-Shaded Rover Model**: 6 titanium wheels with treads, rocker-bogie suspension, MMRTG power generator, and navigation mast.
      - **Speed Multipliers**: Test traverse durations at 1x, 2x, and 5x simulation speeds.
      - **Live ETA & Distance**: Dynamic remaining distance and estimated time of arrival calculations.`,
      whyItMatter: 'Kinematic simulation validates that turning radii and heading angles align with the planned route.',
      commonMistake: 'Confusing simulation speed multipliers with actual physical rover acceleration.',
      quiz: {
        question: 'What does the rover icon render along the path during simulation?',
        options: [
          'A simple red dot',
          'A detailed 3D-shaded rocker-bogie planetary rover model with 6 wheels and sensor mast',
          'An airplane'
        ],
        correct: 1,
        explanation: 'The simulation renders an authentic multi-part planetary rover model following path orientation.'
      }
    },
    {
      id: 7,
      title: 'Science Targets & Mission Resources',
      subtitle: 'Energy Budgets, Battery Reserves, and Waypoints',
      icon: Award,
      summary: 'Optimizing battery capacity, power draw, and geological science waypoint detours.',
      content: `Planetary traverses require strict energy management to preserve battery longevity.
      
      ### Resource Metrics
      - **Battery Capacity**: Configurable watt-hours (default 2,400 Wh).
      - **Nominal Power Draw**: Average wattage consumed during active driving (approx. 220W).
      - **State of Charge (%)**: Real-time battery depletion tracking based on path length and driving speed.`,
      whyItMatter: 'Preventing battery depletion ensures the rover maintains thermal control and communication links through Martian nights.',
      commonMistake: 'Planning long science detours without accounting for cumulative energy expenditure.',
      quiz: {
        question: 'Which component models the rover\'s continuous electrical power generation?',
        options: [
          'Wind turbine',
          'Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)',
          'Gasoline engine'
        ],
        correct: 1,
        explanation: 'The MMRTG provides reliable radioisotope thermoelectric power for Martian rover operations.'
      }
    },
    {
      id: 8,
      title: 'Route Comparison & Advanced Tools',
      subtitle: 'Exploring Route Lab, Hazard Analysis, and Scenario Testing',
      icon: Terminal,
      summary: 'Overview of auxiliary engineering workbooks for rigorous mission verification.',
      content: `MARSNAV includes specialized laboratories for advanced mission analysis:
      - **Route Laboratory**: Compare multiple path alternatives side-by-side.
      - **Hazard Analysis Lab**: Evaluate regolith sinkage and wheel slip probability.
      - **Scenario Testing Lab**: Simulate dust storms and power anomalies.
      - **Validation Test Harness**: Automated software subsystem diagnostic checks.`,
      whyItMatter: 'Multi-tool cross-verification ensures high reliability before uploading commands to orbit relay.',
      commonMistake: 'Skipping risk assessment when planning traverses across unknown crater rim slopes.',
      quiz: {
        question: 'What is the purpose of the Scenario Testing Lab?',
        options: [
          'To play arcade minigames',
          'To simulate dust storms, power degradation, and communication dropouts',
          'To edit photos'
        ],
        correct: 1,
        explanation: 'Scenario Testing injects emergency anomalies to verify automated rover contingency responses.'
      }
    },
    {
      id: 9,
      title: 'Troubleshooting Guide',
      subtitle: 'Resolving Common Operational Issues',
      icon: AlertTriangle,
      summary: 'Step-by-step diagnostics for image loading errors, pathfinding failures, and simulation stops.',
      content: `### Quick Fixes
      - **Image Loading Failed**: Check your network connection or switch to a verified NASA Raw feed image.
      - **Route Not Connecting**: Ensure start and destination are placed within valid terrain bounds and not inside solid rock polygons.
      - **No Safe Route Found**: Reduce hazard buffer clearance or toggle off blocked status for obstructing boulders.
      - **Simulation Paused**: Click "Start Drive" in the simulation dock to resume movement along the active path.`,
      whyItMatter: 'Fast troubleshooting keeps mission planning sessions productive and uninterrupted.',
      commonMistake: 'Leaving obstacle clearance buffers at maximum (28px) in narrow canyon corridors.',
      quiz: {
        question: 'What should you do if no safe route can be found through a tight obstacle bottleneck?',
        options: [
          'Delete the application',
          'Decrease the safety buffer clearance or adjust waypoint placement',
          'Drive straight through the boulder'
        ],
        correct: 1,
        explanation: 'Lowering the buffer clearance or shifting endpoints slightly opens up viable narrow corridor paths.'
      }
    },
    {
      id: 10,
      title: 'Scientific Limitations & Responsible Interpretation',
      subtitle: 'Understanding Model Boundaries and Calibrated Reality',
      icon: ShieldCheck,
      summary: 'Critical distinctions between simulated planning models and physical Martian surface hazards.',
      content: `### Operational Disclosures
      1. **Image-Space vs. Calibrated Physical Scale**: Distances computed in pixels (0.10m/px default scale) are approximations requiring orbital DTM calibration.
      2. **Depth Ambiguity**: Single RGB camera frames cannot reliably determine exact subsurface rock elevation without stereo or LiDAR data.
      3. **Simulated Safety**: A successful route in MARSNAV is a planning hypothesis, not a guarantee of physical wheel safety on Mars.`,
      whyItMatter: 'Responsible interpretation ensures human operators maintain rigorous situational awareness and conservatism.',
      commonMistake: 'Treating simulated AI confidence scores as 100% infallible ground truth.',
      quiz: {
        question: 'Is a successful route in MARSNAV an absolute guarantee of physical rover safety?',
        options: [
          'Yes, it is 100% infallible',
          'No, it is a sophisticated planning aid and simulation hypothesis requiring operator verification',
          'Only on weekends'
        ],
        correct: 1,
        explanation: 'MARSNAV models are advanced planning aids; final authority and safety verification rest with mission operators.'
      }
    }
  ];

  const glossaryTerms = [
    { term: 'A* Pathfinding', definition: 'Graph traversal and path planning algorithm that finds the shortest collision-free path between start and goal nodes.' },
    { term: 'Traversability', definition: 'Numerical evaluation of how easily a rover can drive across a specific terrain patch without entrapment or high slip.' },
    { term: 'Segmentation Mask', definition: 'Pixel-level classification overlay identifying geological classes like rocks, sand, and bedrock.' },
    { term: 'Hazard Buffer', definition: 'Configurable safety clearance margin expanded around obstacles to maintain safe separation.' },
    { term: 'DEM (Digital Elevation Model)', definition: '3D cartographic representation of terrain surface elevation topography.' },
    { term: 'MMRTG', definition: 'Multi-Mission Radioisotope Thermoelectric Generator providing steady electrical power to the rover.' },
    { term: 'Sol', definition: 'A Martian solar day, lasting approximately 24 hours and 39 minutes.' },
    { term: 'Navcam', definition: 'Navigation camera mounted on the rover mast used for route planning and hazard assessment.' }
  ];

  const handleQuizAnswer = (chapterId: number, optionIndex: number) => {
    setQuizAnswers(prev => ({ ...prev, [chapterId]: optionIndex }));
  };

  const submitQuiz = (chapterId: number, correctIndex: number) => {
    setQuizSubmitted(prev => ({ ...prev, [chapterId]: true }));
    const chosen = quizAnswers[chapterId];
    if (chosen === correctIndex) {
      if (!completedChapters.includes(chapterId)) {
        setCompletedChapters(prev => [...prev, chapterId]);
      }
    }
  };

  const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-fadeIn">
      <div className="bg-[#080b16] border border-white/20 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)]">
        
        {/* Top Header Bar */}
        <div className="h-16 bg-[#050812] border-b border-white/10 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-white font-bold text-base font-sans tracking-wide">
                  MARSNAV MISSION ACADEMY
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Interactive Training Center
                </span>
              </div>
              <p className="text-slate-400 text-xs font-mono">
                Comprehensive Operator Manual, Tutorials &amp; Knowledge Checks
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-300 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              <Award className="w-4 h-4 text-orange-400" />
              <span>Progress: <strong className="text-white">{completedChapters.length} / {chapters.length} Chapters</strong></span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 cursor-pointer transition"
              title="Close Guide [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="h-12 bg-[#060914] border-b border-white/10 px-6 flex items-center space-x-4 shrink-0 font-mono text-xs">
          <button
            onClick={() => setActiveTab('academy')}
            className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'academy' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Mission Academy Curriculum</span>
          </button>

          <button
            onClick={() => setActiveTab('tour')}
            className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'tour' ? 'bg-cyan-600 text-white shadow-lg' : 'text-cyan-300 hover:text-white bg-cyan-500/20 border border-cyan-500/40'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Interactive Onboarding Tour</span>
          </button>

          <button
            onClick={() => setActiveTab('glossary')}
            className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'glossary' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Interactive Glossary</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'academy' ? (
            <>
              {/* Left Chapter Index */}
              <div className="w-80 bg-[#060915] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto p-4 space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-3 mb-2 font-semibold">
                  Curriculum Chapters ({chapters.length})
                </div>
                {chapters.map((ch) => {
                  const isCompleted = completedChapters.includes(ch.id);
                  const isActive = activeChapterId === ch.id;
                  const IconComp = ch.icon;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChapterId(ch.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-orange-500/20 border-orange-500/60 text-white shadow-md'
                          : 'bg-black/30 border-white/5 text-slate-300 hover:border-white/15 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {isCompleted ? <Check className="w-4 h-4" /> : <IconComp className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-slate-400">Chapter {ch.id < 10 ? `0${ch.id}` : ch.id}</div>
                          <div className="font-bold text-xs truncate font-sans">{ch.title}</div>
                        </div>
                      </div>
                      {isCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Lesson Detail Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 font-sans text-slate-200 bg-[#04060e]">
                <div className="border-b border-white/10 pb-6">
                  <div className="flex items-center space-x-2 text-orange-400 font-mono text-xs uppercase tracking-wider mb-1">
                    <span>Chapter {activeChapter.id < 10 ? `0${activeChapter.id}` : activeChapter.id}</span>
                    <span>·</span>
                    <span>{activeChapter.subtitle}</span>
                  </div>
                  <h1 className="text-2xl font-black text-white font-sans tracking-wide mb-2">
                    {activeChapter.title}
                  </h1>
                  <p className="text-slate-400 text-sm font-sans max-w-3xl">
                    {activeChapter.summary}
                  </p>
                </div>

                {/* Lesson Body */}
                <div className="prose prose-invert max-w-none text-sm space-y-4 font-sans leading-relaxed text-slate-300">
                  <div className="whitespace-pre-line bg-black/40 border border-white/10 rounded-2xl p-6 shadow-inner">
                    {activeChapter.content}
                  </div>
                </div>

                {/* Why Does This Matter & Common Mistake Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase">
                      <Zap className="w-4 h-4" />
                      <span>Why does this matter?</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans">
                      {activeChapter.whyItMatter}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Common Operator Mistake</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans">
                      {activeChapter.commonMistake}
                    </p>
                  </div>
                </div>

                {/* Knowledge Check Quiz */}
                <div className="p-6 rounded-2xl bg-[#080b18] border border-white/15 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-orange-400 font-mono text-xs uppercase tracking-wider font-bold">
                      <Award className="w-4 h-4" />
                      <span>Chapter Knowledge Check</span>
                    </div>
                    {completedChapters.includes(activeChapter.id) && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">
                        Passed &amp; Completed
                      </span>
                    )}
                  </div>

                  <div className="font-sans font-bold text-white text-sm">
                    {activeChapter.quiz.question}
                  </div>

                  <div className="space-y-2">
                    {activeChapter.quiz.options.map((opt, idx) => {
                      const isSelected = quizAnswers[activeChapter.id] === idx;
                      const isSubmitted = quizSubmitted[activeChapter.id];
                      const isCorrect = idx === activeChapter.quiz.correct;

                      let btnStyle = 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30';
                      if (isSubmitted) {
                        if (isCorrect) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200';
                        else if (isSelected) btnStyle = 'bg-red-500/20 border-red-500 text-red-200';
                      } else if (isSelected) {
                        btnStyle = 'bg-orange-500/20 border-orange-500 text-white';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => !quizSubmitted[activeChapter.id] && handleQuizAnswer(activeChapter.id, idx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs font-sans transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {isSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {!quizSubmitted[activeChapter.id] ? (
                    <button
                      onClick={() => submitQuiz(activeChapter.id, activeChapter.quiz.correct)}
                      disabled={quizAnswers[activeChapter.id] === undefined}
                      className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs tracking-wide cursor-pointer transition disabled:opacity-40 shadow-md"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-300 space-y-1 font-mono">
                      <div className="font-bold text-white">Explanation:</div>
                      <div>{activeChapter.quiz.explanation}</div>
                    </div>
                  )}
                </div>

                {/* Chapter Footer Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    onClick={() => setActiveChapterId(prev => Math.max(1, prev - 1))}
                    disabled={activeChapterId === 1}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono cursor-pointer disabled:opacity-40 transition"
                  >
                    ← Previous Chapter
                  </button>
                  <button
                    onClick={() => setActiveChapterId(prev => Math.min(chapters.length, prev + 1))}
                    disabled={activeChapterId === chapters.length}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold cursor-pointer disabled:opacity-40 transition shadow-md"
                  >
                    Next Chapter →
                  </button>
                </div>
              </div>
            </>
          ) : activeTab === 'tour' ? (
            /* Interactive Onboarding Tour Tab */
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#04060e] flex flex-col justify-center items-center">
              {(() => {
                const tourSteps = [
                  {
                    step: 1,
                    title: 'Introduction to MARSNAV Mission Planner',
                    subtitle: 'Command Center Overview',
                    description: 'MARSNAV is your professional robotics workstation for Jezero Crater surface navigation. You can plan rover paths, inspect classical computer-vision hazard detections, and simulate kinematics.',
                    actionTip: 'Click Next to explore terrain image loading.'
                  },
                  {
                    step: 2,
                    title: 'Terrain Image & NASA Archives',
                    subtitle: 'Ingesting Visual Data',
                    description: 'Load verified NASA Perseverance Navcam/Hazcam frames from Martian sols or upload any local terrain photograph. The workspace automatically parses aspect ratios and scale parameters.',
                    actionTip: 'Use the Image upload or NASA feed button in the Mission Planner workspace.'
                  },
                  {
                    step: 3,
                    title: 'Start & Destination Placement',
                    subtitle: 'Defining Endpoints',
                    description: 'Click SET START [S] and click any valid traversable point on the image. Then click SET DESTINATION [D] to set your target scientific objective.',
                    actionTip: 'Start and destination pins lock onto pixel grid coordinates.'
                  },
                  {
                    step: 4,
                    title: 'Automatic Terrain Analysis',
                    subtitle: 'Instant Feature Extraction',
                    description: 'Upon loading an image, the classical CV edge and contour detector instantly extracts rocks, sand ripples, bedrock slabs, and potential pits without manual masking.',
                    actionTip: 'Re-scan terrain anytime using the Re-Scan button.'
                  },
                  {
                    step: 5,
                    title: 'Segmentation Masks & Hazard Zones',
                    subtitle: 'Polygon Contours & Safety Buffers',
                    description: 'View pixel-level hazard polygons with adjustable safety clearance buffers (2px to 28px) that expand around obstacle boundaries to keep the rover safe.',
                    actionTip: 'Toggle Mask and Hazard Zone overlays independently in the map layer dock.'
                  },
                  {
                    step: 6,
                    title: 'Route Planning & A* Pathfinding',
                    subtitle: 'Collision-Free Trajectories',
                    description: 'The weighted A* graph search engine computes optimal trajectories across the traversable grid while avoiding impassable rock cells and high-slip sand.',
                    actionTip: 'Click Plan Route to generate your initial traverse polyline.'
                  },
                  {
                    step: 7,
                    title: 'Route Strategies & Metrics',
                    subtitle: 'Comparing Path Alternatives',
                    description: 'Toggle between Alpha (shortest path), Beta (lowest cost), Gamma (maximum clearance), and Delta (science waypoint detour) to evaluate trade-offs.',
                    actionTip: 'Review route length, node count, and confidence metrics in the Route tab.'
                  },
                  {
                    step: 8,
                    title: 'Rover Simulation',
                    subtitle: 'Kinematic Traversal & Animation',
                    description: 'Simulate rover movement in real-time along the computed route. Watch the 3D-shaded rocker-bogie planetary rover model navigate heading angles with live ETA estimates.',
                    actionTip: 'Use Start Drive, Pause, and speed multipliers (1x, 2x, 5x) in the simulation control dock.'
                  },
                  {
                    step: 9,
                    title: 'Diagnostics & Scientific Limitations',
                    subtitle: 'Responsible Interpretation',
                    description: 'Monitor battery state of charge, power draw (MMRTG), slip probability, and fallback warnings. Understand that simulated routes are planning hypotheses, not absolute physical guarantees.',
                    actionTip: 'Check the Validation Harness and Scenario Testing labs for rigorous stress-testing.'
                  },
                  {
                    step: 10,
                    title: 'Ready for Your First Mission',
                    subtitle: 'Mission Initialization Complete',
                    description: 'You have completed the MARSNAV onboarding tour! You are now fully prepared to analyze terrain, compute optimal paths, and execute rover simulations.',
                    actionTip: 'Click Finish Tour to return to the active Mission Planner workspace.'
                  }
                ];

                const currentTour = tourSteps[tourStep - 1] || tourSteps[0];

                return (
                  <div className="max-w-2xl w-full bg-[#080b18] border border-cyan-500/40 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
                        <Compass className="w-4 h-4 animate-spin" />
                        <span>Step {currentTour.step} of {tourSteps.length}</span>
                      </div>
                      <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {currentTour.subtitle}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-2xl font-black text-white font-sans">
                        {currentTour.title}
                      </h2>
                      <p className="text-slate-300 text-sm leading-relaxed font-sans">
                        {currentTour.description}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center space-x-3 text-cyan-300 text-xs font-mono">
                      <Zap className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span><strong>Operator Tip:</strong> {currentTour.actionTip}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="bg-cyan-500 h-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        style={{ width: `${(tourStep / tourSteps.length) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <button
                        onClick={() => setTourStep(prev => Math.max(1, prev - 1))}
                        disabled={tourStep === 1}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono cursor-pointer disabled:opacity-40 transition"
                      >
                        ← Back
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={onClose}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer transition"
                        >
                          Skip Tour
                        </button>
                        {tourStep < tourSteps.length ? (
                          <button
                            onClick={() => setTourStep(prev => Math.min(tourSteps.length, prev + 1))}
                            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono cursor-pointer transition shadow-md"
                          >
                            Next Step →
                          </button>
                        ) : (
                          <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono cursor-pointer transition shadow-md"
                          >
                            Finish Tour ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Glossary Tab */
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#04060e]">
              <div className="max-w-3xl mx-auto space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">MARSNAV Technical Glossary</h2>
                  <p className="text-slate-400 text-xs font-mono">Searchable dictionary of planetary robotics and navigation terminology.</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search glossary terms..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {glossaryTerms
                    .filter(g => g.term.toLowerCase().includes(searchQuery.toLowerCase()) || g.definition.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-[#080b18] border border-white/10 space-y-1.5 shadow-md">
                        <div className="font-bold text-white text-sm font-sans">{item.term}</div>
                        <div className="text-slate-300 text-xs font-sans leading-relaxed">{item.definition}</div>
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
