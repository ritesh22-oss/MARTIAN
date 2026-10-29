import React, { useState } from 'react';
import {
  Compass,
  Sliders,
  Award,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Droplets,
  Radio,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
  CheckCircle2,
  Mountain,
  Sun,
  Activity,
  BarChart3,
  MapPin,
  Camera,
  ImageIcon
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import RegionImageGallery from './RegionImageGallery';

interface SiteCandidate {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  elevation: string;
  quadrangle: string;
  flatness: number; // 0-100
  waterIce: number; // 0-100
  solarPower: number; // 0-100
  mobility: number; // 0-100
  scienceValue: number; // 0-100
  commsVisibility: number; // 0-100
  description: string;
  scientificReasoning: string;
  primaryRisk: string;
  provenance: string;
  imageUrl: string;
}

const CANDIDATE_SITES: SiteCandidate[] = [
  {
    id: 'arcadia',
    name: 'Arcadia Planitia',
    latitude: '39.3° N',
    longitude: '189.7° E',
    elevation: '-3.8 km',
    quadrangle: 'Diacria Quadrangle (MC-04)',
    flatness: 92,
    waterIce: 95,
    solarPower: 68,
    mobility: 90,
    scienceValue: 74,
    commsVisibility: 88,
    description: 'Extensive low-altitude smooth plain containing abundant subsurface sheet ice detected by MRO SHARAD radar within 1-2m of the surface.',
    scientificReasoning: 'Shallow slab ice offers direct resource utilization (ISRU) for propellant production and life support, with smooth terrain providing safe touchdown.',
    primaryRisk: 'Higher latitude results in seasonal solar radiation drops during Martian winter.',
    provenance: 'NASA MRO SHARAD / Mars Odyssey THEMIS / MOLA DTM',
    imageUrl: '/assets/aistudio/vis_1_84d26681.png'
  },
  {
    id: 'utopia',
    name: 'Utopia Planitia',
    latitude: '46.7° N',
    longitude: '117.5° E',
    elevation: '-4.2 km',
    quadrangle: 'Casius Quadrangle (MC-06)',
    flatness: 88,
    waterIce: 92,
    solarPower: 60,
    mobility: 86,
    scienceValue: 80,
    commsVisibility: 85,
    description: 'Vast northern basin holding a massive underground ice reservoir deposit equivalent in volume to Lake Superior.',
    scientificReasoning: 'Proven high water-ice fraction by Zhurong and SHARAD; dense atmosphere aids entry, descent, and landing (EDL) braking.',
    primaryRisk: 'High dust storm accumulation in mid-to-high northern winter.',
    provenance: 'CNSA Zhurong Rover / NASA MRO SHARAD / PDS Geosciences',
    imageUrl: '/assets/aistudio/vis_2_9c24860c.png'
  },
  {
    id: 'jezero',
    name: 'Jezero Crater Western Delta',
    latitude: '18.38° N',
    longitude: '77.58° E',
    elevation: '-2.5 km',
    quadrangle: 'Syrtis Major Quadrangle (MC-13)',
    flatness: 62,
    waterIce: 45,
    solarPower: 88,
    mobility: 65,
    scienceValue: 98,
    commsVisibility: 94,
    description: 'Ancient 45-km impact crater hosting a well-preserved river delta with clay minerals and potential biosignatures.',
    scientificReasoning: 'Unrivaled astrobiological priority; diverse lacustrine sedimentary rocks and igneous floor for sample return.',
    primaryRisk: 'Steep delta scarp slopes and boulder fields restrict heavy lander footprint options.',
    provenance: 'NASA Perseverance / MRO HiRISE DTM DTEEC_001414_1780',
    imageUrl: '/assets/aistudio/vis_0_f6a9756b.png'
  },
  {
    id: 'elysium',
    name: 'Elysium Planitia',
    latitude: '4.5° N',
    longitude: '135.6° E',
    elevation: '-2.6 km',
    quadrangle: 'Elysium Quadrangle (MC-15)',
    flatness: 96,
    waterIce: 50,
    solarPower: 95,
    mobility: 94,
    scienceValue: 68,
    commsVisibility: 96,
    description: 'Smooth, featureless equatorial basaltic plain with high solar flux, site of the NASA InSight seismic station.',
    scientificReasoning: 'Near-perfect equatorial solar power generation year-round and extremely low touchdown slope hazards.',
    primaryRisk: 'Deep subsurface water ice requires deep drilling (>20m).',
    provenance: 'NASA InSight / Viking / MRO CTX Global Mosaic',
    imageUrl: '/assets/aistudio/vis_3_e33f9dca.png'
  },
  {
    id: 'amazonis',
    name: 'Amazonis Planitia',
    latitude: '24.8° N',
    longitude: '196.0° E',
    elevation: '-3.5 km',
    quadrangle: 'Amazonis Quadrangle (MC-08)',
    flatness: 94,
    waterIce: 70,
    solarPower: 82,
    mobility: 92,
    scienceValue: 65,
    commsVisibility: 90,
    description: 'One of the smoothest plains on Mars, formed by young lava flows and fine windblown dust deposits.',
    scientificReasoning: 'Minimal rock hazard density enables large-payload habitat modules and expansive solar arrays.',
    primaryRisk: 'Thick dust mantling may obscure underlying bedrock geology and coat solar panels.',
    provenance: 'NASA Mars Global Surveyor MOLA / MRO CTX',
    imageUrl: '/assets/aistudio/vis_4_2bcd6691.png'
  },
  {
    id: 'gale',
    name: 'Gale Crater Mount Sharp',
    latitude: '4.58° S',
    longitude: '137.44° E',
    elevation: '-4.4 km',
    quadrangle: 'Aeolis Quadrangle (MC-23)',
    flatness: 58,
    waterIce: 40,
    solarPower: 92,
    mobility: 60,
    scienceValue: 95,
    commsVisibility: 92,
    description: 'Deep impact crater featuring the 5.5 km high central mound Aeolis Mons (Mount Sharp) with stratified rock history.',
    scientificReasoning: 'Continuous stratigraphic record of Martian habitability transition from wet clay-rich to dry sulfate-rich eras.',
    primaryRisk: 'Rugged topography, sharp clay-capped ridges, and deep active sand dunes (Bagnold Dunes).',
    provenance: 'NASA Curiosity (MSL) / MRO HiRISE Stereo DTM',
    imageUrl: '/assets/aistudio/image_e58e8f79.png'
  },
  {
    id: 'hellas',
    name: 'Hellas Planitia Basin',
    latitude: '42.4° S',
    longitude: '70.5° E',
    elevation: '-7.1 km',
    quadrangle: 'Hellas Quadrangle (MC-28)',
    flatness: 78,
    waterIce: 88,
    solarPower: 55,
    mobility: 82,
    scienceValue: 89,
    commsVisibility: 80,
    description: 'Deepest impact structure on Mars (-7.1 km), providing maximum atmospheric density and radiation shielding.',
    scientificReasoning: 'Highest atmospheric pressure allows temporary liquid water stability and glacial flow features.',
    primaryRisk: 'Frequent global dust storm origin point and extreme thermal variations.',
    provenance: 'NASA MRO CTX / HiRISE Viscous Flow Survey',
    imageUrl: '/assets/aistudio/image_f798510e.png'
  },
  {
    id: 'valles',
    name: 'Valles Marineris Ophir Chasma',
    latitude: '4.0° S',
    longitude: '287.5° E',
    elevation: '-3.0 km',
    quadrangle: 'Coprates Quadrangle (MC-18)',
    flatness: 65,
    waterIce: 60,
    solarPower: 85,
    mobility: 70,
    scienceValue: 99,
    commsVisibility: 88,
    description: 'Gigantic canyon system revealing millions of years of layered Martian crust geology in vertical cliff faces.',
    scientificReasoning: 'Unprecedented access to deep subterranean rock layers and potential hydrated sulfate salt deposits.',
    primaryRisk: 'Canyon wall collapse hazards and optical communications line-of-sight blockage.',
    provenance: 'NASA MRO HiRISE Stereo Canyon DTM',
    imageUrl: '/assets/aistudio/Screenshot_2026-10-28_00.21.14_a7d5fb1b.png'
  }
];

export default function BaseCampIntelligence() {
  const { loadRegionIntoWorkspace, setActiveWorkspace } = useWorkspace();

  // Criteria Weight Sliders (default balanced)
  const [weights, setWeights] = useState({
    flatness: 20,
    waterIce: 25,
    solarPower: 15,
    mobility: 15,
    scienceValue: 15,
    commsVisibility: 10
  });

  const [selectedSiteId, setSelectedSiteId] = useState<string>('arcadia');
  const [viewMode, setViewMode] = useState<'candidates' | 'gallery'>('candidates');
  const [galleryRegionId, setGalleryRegionId] = useState<string>('arcadia');

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  // Compute Score for a Candidate Site
  const calculateScore = (site: SiteCandidate): number => {
    const raw =
      (site.flatness * weights.flatness) +
      (site.waterIce * weights.waterIce) +
      (site.solarPower * weights.solarPower) +
      (site.mobility * weights.mobility) +
      (site.scienceValue * weights.scienceValue) +
      (site.commsVisibility * weights.commsVisibility);
    return Math.round(raw / totalWeight);
  };

  // Sorted candidates by computed suitability score
  const rankedSites = [...CANDIDATE_SITES].map(site => ({
    ...site,
    score: calculateScore(site)
  })).sort((a, b) => b.score - a.score);

  const activeSite = CANDIDATE_SITES.find(s => s.id === selectedSiteId) || CANDIDATE_SITES[0];
  const activeScore = calculateScore(activeSite);
  const gallerySite = CANDIDATE_SITES.find(s => s.id === galleryRegionId) || activeSite;

  const handleSelectSiteForWorkspace = (site: SiteCandidate) => {
    loadRegionIntoWorkspace(site.id);
  };

  if (viewMode === 'gallery') {
    return (
      <RegionImageGallery
        regionId={gallerySite.id}
        regionName={gallerySite.name}
        description={gallerySite.description}
        coordinates={{
          lat: gallerySite.latitude,
          lon: gallerySite.longitude,
          elevation: gallerySite.elevation,
          quadrangle: gallerySite.quadrangle
        }}
        suitabilityScore={calculateScore(gallerySite)}
        criteriaScores={{
          flatness: gallerySite.flatness,
          waterIce: gallerySite.waterIce,
          solarPower: gallerySite.solarPower,
          mobility: gallerySite.mobility,
          scienceValue: gallerySite.scienceValue,
          commsVisibility: gallerySite.commsVisibility
        }}
        onBack={() => setViewMode('candidates')}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 lg:p-6 text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono tracking-wider uppercase mb-1">
              <Compass className="w-4 h-4" />
              <span>MARS Base Camp Site Selection Intelligence</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Human Outpost & Traverse Suitability Analyzer
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Multi-criteria comparative site evaluation for human Mars mission base-camp placement, balancing ISRU water ice deposits, landing safety, power, mobility, and scientific priority.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <div className="px-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-mono block uppercase">Top Candidate</span>
              <span className="text-sm font-bold text-cyan-400">{rankedSites[0].name} ({rankedSites[0].score}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-Criteria Weight Controls */}
        <div className="lg:col-span-4 bg-[#080B16] border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              Criteria Evaluation Weights
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Total Weight: {totalWeight}%
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Adjust strategic priorities to recalculate suitability rankings for long-term human habitation and rover exploration.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Flatness & Landing Safety
                </span>
                <span className="font-mono text-emerald-400 font-bold">{weights.flatness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.flatness}
                onChange={(e) => setWeights({ ...weights, flatness: Number(e.target.value) })}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Subsurface Water Ice (ISRU)
                </span>
                <span className="font-mono text-cyan-400 font-bold">{weights.waterIce}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.waterIce}
                onChange={(e) => setWeights({ ...weights, waterIce: Number(e.target.value) })}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Solar Flux & Power
                </span>
                <span className="font-mono text-amber-400 font-bold">{weights.solarPower}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.solarPower}
                onChange={(e) => setWeights({ ...weights, solarPower: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" /> Traverse Mobility
                </span>
                <span className="font-mono text-purple-400 font-bold">{weights.mobility}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.mobility}
                onChange={(e) => setWeights({ ...weights, mobility: Number(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Scientific Return
                </span>
                <span className="font-mono text-orange-400 font-bold">{weights.scienceValue}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.scienceValue}
                onChange={(e) => setWeights({ ...weights, scienceValue: Number(e.target.value) })}
                className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-400" /> Comms Line-of-Sight
                </span>
                <span className="font-mono text-blue-400 font-bold">{weights.commsVisibility}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.commsVisibility}
                onChange={(e) => setWeights({ ...weights, commsVisibility: Number(e.target.value) })}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={() => setWeights({ flatness: 20, waterIce: 25, solarPower: 15, mobility: 15, scienceValue: 15, commsVisibility: 10 })}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 transition-colors cursor-pointer"
          >
            Reset Default Balanced Weights
          </button>
        </div>

        {/* Right Column: Ranked Candidate Sites & Selected Detail */}
        <div className="lg:col-span-8 space-y-6">
          {/* Candidate Leaderboard */}
          <div className="bg-[#080B16] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              Candidate Region Suitability Rankings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rankedSites.map((site, index) => {
                const isSelected = site.id === selectedSiteId;
                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/20 border-cyan-500/80 shadow-lg ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-slate-300 flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white">{site.name}</h4>
                      </div>
                      <span className={`text-sm font-mono font-bold ${
                        site.score >= 80 ? 'text-emerald-400' : site.score >= 65 ? 'text-cyan-400' : 'text-amber-400'
                      }`}>
                        {site.score}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                      {site.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
                      <div className="flex items-center gap-2">
                        <span>Lat: {site.latitude}</span>
                        <span>Ice: {site.waterIce}%</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setGalleryRegionId(site.id);
                          setViewMode('gallery');
                        }}
                        className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={`Browse 6 verified NASA observations for ${site.name}`}
                      >
                        <Camera className="w-3 h-3 text-cyan-400" />
                        <span>NASA Gallery (6)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Selected Site In-Depth Inspector */}
          <div className="bg-[#080B16] border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">{activeSite.name} Inspector</h3>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {activeSite.quadrangle} · Elevation: {activeSite.elevation} · Coordinates: {activeSite.latitude}, {activeSite.longitude}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setGalleryRegionId(activeSite.id);
                    setViewMode('gallery');
                  }}
                  className="px-3.5 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 rounded-xl text-xs font-bold font-mono tracking-wide transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                  title="Browse all genuine NASA image observations for this region"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Browse NASA Gallery (6)</span>
                </button>

                <button
                  onClick={() => handleSelectSiteForWorkspace(activeSite)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto shadow-md"
                >
                  Load Into Mission Workspace <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Score Breakdown Bar Charts */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Multi-Criteria Metric Breakdown
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Flatness & EDL Safety</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-400 font-mono">{activeSite.flatness}%</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${activeSite.flatness}%` }} />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Water Ice Deposits</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-cyan-400 font-mono">{activeSite.waterIce}%</span>
                    <Droplets className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full" style={{ width: `${activeSite.waterIce}%` }} />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Solar Flux Power</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-400 font-mono">{activeSite.solarPower}%</span>
                    <Sun className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${activeSite.solarPower}%` }} />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Rover Mobility</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-purple-400 font-mono">{activeSite.mobility}%</span>
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${activeSite.mobility}%` }} />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Science Return</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-orange-400 font-mono">{activeSite.scienceValue}%</span>
                    <Sparkles className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: `${activeSite.scienceValue}%` }} />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Comms Line-of-Sight</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-400 font-mono">{activeSite.commsVisibility}%</span>
                    <Radio className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${activeSite.commsVisibility}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Reasoning & Risk Callout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-cyan-950/20 border border-cyan-800/40 p-4 rounded-xl space-y-1">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Strategic Base Justification
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeSite.scientificReasoning}
                </p>
              </div>

              <div className="bg-amber-950/20 border border-amber-800/40 p-4 rounded-xl space-y-1">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Key Operational Risk Factor
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeSite.primaryRisk}
                </p>
              </div>
            </div>

            {/* Provenance Badge */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Dataset Provenance: {activeSite.provenance}
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Peer-Reviewed Survey
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
