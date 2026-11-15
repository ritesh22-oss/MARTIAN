import type { WorkspaceId } from '../context/WorkspaceContext';

export interface OrbitTourStep {
  stepNumber: number;
  workspaceId: WorkspaceId;
  sectionGroup: string;
  title: string;
  dialogue: string;
}

export const ORBIT_TOUR_STEPS: OrbitTourStep[] = [
  {
    stepNumber: 1,
    workspaceId: 'marsnav-v4',
    sectionGroup: 'MISSION',
    title: 'MARSWALK OPS',
    dialogue:
      "Let's begin with MarsWalk Ops! This is your main terrain workspace. Upload your own Mars surface image or fetch available NASA rover imagery. Select your start and destination points, inspect the terrain, identify obstacles and generate a navigation route.",
  },
  {
    stepNumber: 2,
    workspaceId: 'configuration',
    sectionGroup: 'MISSION',
    title: 'MISSION CONFIGURATION',
    dialogue:
      'Here you can configure your exploration mission. Set mission parameters, operational settings and objectives before beginning your Mars exploration activities.',
  },
  {
    stepNumber: 3,
    workspaceId: 'nasa-raw-feed',
    sectionGroup: 'ANALYSIS',
    title: 'NASA RAW IMAGES',
    dialogue:
      "Explore original images captured by NASA's Mars missions. Browse available imagery from Perseverance, Curiosity, Opportunity and Spirit to investigate the Martian surface.",
  },
  {
    stepNumber: 4,
    workspaceId: 'terrain-intelligence',
    sectionGroup: 'ANALYSIS',
    title: 'TERRAIN INTELLIGENCE',
    dialogue:
      'This module examines terrain information and available image-analysis results. Understand detected rocks, surface features, terrain conditions and potential navigation obstacles.',
  },
  {
    stepNumber: 5,
    workspaceId: 'risk-assessment',
    sectionGroup: 'ANALYSIS',
    title: 'RISK ASSESSMENT',
    dialogue:
      'Before an exploration mission, understanding risks is essential. Review available terrain hazards, environmental conditions and operational risk indicators.',
  },
  {
    stepNumber: 6,
    workspaceId: 'surface-dashboard',
    sectionGroup: 'ASTRONAUT EXPLORATION',
    title: 'SURFACE MISSION DASHBOARD',
    dialogue:
      'Your mission overview starts here. Monitor available mission information, exploration progress, operational status and important updates in one place.',
  },
  {
    stepNumber: 7,
    workspaceId: 'surface-explorer',
    sectionGroup: 'ASTRONAUT EXPLORATION',
    title: 'MARS SURFACE EXPLORER',
    dialogue:
      'Explore different regions of Mars, examine surface imagery and discover interesting geological and scientific features.',
  },
  {
    stepNumber: 8,
    workspaceId: 'multilayer-map',
    sectionGroup: 'ASTRONAUT EXPLORATION',
    title: 'MULTILAYER SCIENTIFIC MAP',
    dialogue:
      'This scientific mapping workspace brings different Martian datasets together. Explore orbital imagery, elevation information, thermal observations and geological map layers.',
  },
  {
    stepNumber: 9,
    workspaceId: 'safety-monitoring',
    sectionGroup: 'ASTRONAUT EXPLORATION',
    title: 'SAFETY AND ENVIRONMENT',
    dialogue:
      'Explore environmental and astronaut safety information, including available radiation observations and surface-condition indicators. These insights help evaluate mission conditions.',
  },
  {
    stepNumber: 10,
    workspaceId: 'geological-targets',
    sectionGroup: 'ASTRONAUT EXPLORATION',
    title: 'GEOLOGICAL TARGETS',
    dialogue:
      'Discover scientifically interesting locations and geological formations that may be worth investigating during future Mars exploration missions.',
  },
  {
    stepNumber: 11,
    workspaceId: 'suit-mobility',
    sectionGroup: 'ASTRONAUT EXPLORATION',
    title: 'SUIT MOBILITY ANALYSIS',
    dialogue:
      'Explore how Martian terrain and operational constraints can affect astronaut movement. Examine available mobility and suit-related analysis.',
  },
  {
    stepNumber: 12,
    workspaceId: 'astronaut-route-planner',
    sectionGroup: 'ASTRONAUT EXPLORATION',
    title: 'ASTRONAUT ROUTE PLANNER',
    dialogue:
      'Plan astronaut traverses between selected locations. Explore route options and use available terrain information to support safer exploration planning.',
  },
  {
    stepNumber: 13,
    workspaceId: 'route-comparison',
    sectionGroup: 'NAVIGATION',
    title: 'ROUTE COMPARISON',
    dialogue:
      'Compare different navigation routes using available distance, terrain and hazard information. Understand the trade-offs before selecting a traversal path.',
  },
  {
    stepNumber: 14,
    workspaceId: 'model-eval',
    sectionGroup: 'VALIDATION',
    title: 'MODEL EVALUATION',
    dialogue:
      'Finally, examine the performance of the analytical models used in MarsNav. Review available validation results and model evaluation metrics.',
  },
];
