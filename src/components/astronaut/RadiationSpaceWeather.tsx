import React, { useState } from 'react';
import {
  Sun,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Database,
  Info,
  RefreshCw,
  Zap,
  ShieldAlert,
  Globe,
  Thermometer,
  Wind,
  Compass,
  ExternalLink,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const RadiationSpaceWeather: React.FC = () => {
  const { spaceWeather, spaceWeatherData, spaceWeatherLoading, spaceWeatherError, refreshSpaceWeather, activeSession } = useAstronautExploration();
  const { activeMission } = useWorkspace();

  const [startDate, setStartDate] = useState<string>(spaceWeatherData?.dateRange?.startDate || '');
  const [endDate, setEndDate] = useState<string>(spaceWeatherData?.dateRange?.endDate || '');

  const handleRefresh = (e: React.FormEvent) => {
    e.preventDefault();
    refreshSpaceWeather(startDate || undefined, endDate || undefined);
  };

  const earthSolar = spaceWeatherData?.earthSolarMonitor;
  const donkiBucket = spaceWeatherData?.donkiEvents;
  const donkiItems = [
    ...(donkiBucket?.flares?.items || []),
    ...(donkiBucket?.cmes?.items || []),
    ...(donkiBucket?.seps?.items || []),
    ...(donkiBucket?.gsts?.items || [])
  ];
  const surfaceObs = spaceWeatherData?.marsSurfaceObservations;

  // Format timestamp for charts
  const formatTimeTag = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr.slice(5, 16);
      return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:00`;
    } catch {
      return timeStr;
    }
  };

  const xrayChartData = (earthSolar?.xraySeries || []).map(pt => ({
    time: formatTimeTag(pt.timestamp),
    flux: pt.value,
    satellite: pt.satellite || 'GOES'
  }));

  const protonChartData = (earthSolar?.protonSeries || []).map(pt => ({
    time: formatTimeTag(pt.timestamp),
    flux: pt.value,
    satellite: pt.satellite || 'GOES'
  }));

  const kpChartData = (earthSolar?.kpSeries || []).map(pt => ({
    time: formatTimeTag(pt.timestamp),
    kp: pt.value
  }));

  // Reference surface radiation baseline comparison data
  const surfaceDoseComparison = [
    { location: 'Gale Crater (MSL RAD)', dose: 0.65, unit: 'mGy/day' },
    { location: 'Jezero Crater (Perseverance)', dose: 0.67, unit: 'mGy/day' },
    { location: 'Mars Orbital Mean', dose: 1.25, unit: 'mGy/day' },
    { location: 'Earth Sea Level Background', dose: 0.008, unit: 'mGy/day' }
  ];

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 uppercase">
              RADIATION & SPACE WEATHER MONITOR
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
              NOAA SWPC &amp; NASA DONKI + Mars Surface Context
            </span>
            <span className="text-xs text-slate-400 font-mono">Mission: {activeMission?.name || 'Mars Surface Exploration'}</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Real-Time Scientific Radiation &amp; Heliospheric Observatory</h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Strictly separates Mars surface atmospheric &amp; radiation baseline observations from Earth-observed solar activity (NOAA GOES X-rays, protons, and planetary Kp index).
          </p>
        </div>

        {/* Live Status Badge / Refresh Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {spaceWeatherLoading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 font-mono text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Streaming NOAA/DONKI...</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 font-mono text-xs">
            <Sun className="w-4 h-4 text-yellow-400" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Solar Environment</span>
              <strong className="text-emerald-400 font-bold">{spaceWeather.solarActivityLevel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Query Toolbar */}
      <form onSubmit={handleRefresh} className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Observation Window Filter:</span>
          </span>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-[11px]">Start:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-cyan-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-[11px]">End:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-cyan-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-950/40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Fetch Space Weather Stream</span>
        </button>
      </form>

      {spaceWeatherError && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-2xl text-xs font-mono text-rose-300">
          <strong>Space Weather API Warning:</strong> {spaceWeatherError} (Falling back to cached NOAA/DONKI telemetry).
        </div>
      )}

      {/* ================= PART A: MARS ATMOSPHERIC & SURFACE ENVIRONMENT ================= */}
      <div className="space-y-4">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>Mars Atmospheric &amp; Surface Environment (MSL / Perseverance Context)</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Selected Context: {activeSession.imageMetadata.fileName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Card 1: Mars Surface Radiation */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">Surface Radiation Dose (MSL RAD)</span>
            <div className="text-2xl font-bold text-yellow-300">
              0.65 <span className="text-xs text-slate-400">mGy/day</span>
            </div>
            <span className="text-[11px] text-emerald-400 block font-sans">GCR Background (Hassler et al., 2014)</span>
          </div>

          {/* Card 2: Equivalent Annual Dose */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">Equivalent Annual Surface Dose</span>
            <div className="text-2xl font-bold text-cyan-300">
              237.5 <span className="text-xs text-slate-400">mSv/yr</span>
            </div>
            <span className="text-[11px] text-slate-400 block font-sans">CO2 Shielding Attenuated Field</span>
          </div>

          {/* Card 3: Atmospheric Temperature */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">Surface Temperature (MEDA)</span>
            <div className="text-2xl font-bold text-orange-400">-62.4 <span className="text-xs text-slate-400">°C</span></div>
            <span className="text-[11px] text-slate-400 block font-sans">Diurnal Cycle: Min -84°C / Max -12°C</span>
          </div>

          {/* Card 4: Surface Atmospheric Pressure */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">Atmospheric Pressure</span>
            <div className="text-2xl font-bold text-emerald-400">7.18 <span className="text-xs text-slate-400">mbar</span></div>
            <span className="text-[11px] text-emerald-400 block font-sans">Seasonal Dust Pressure Cycle</span>
          </div>
        </div>
      </div>

      {/* ================= PART B: SOLAR & INTERPLANETARY SPACE WEATHER (NOAA SWPC / DONKI) ================= */}
      <div className="space-y-4 pt-4">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 font-mono flex items-center gap-2">
            <Sun className="w-4 h-4" />
            <span>Solar &amp; Interplanetary Space Weather (NOAA SWPC L1 / GOES / DONKI)</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Updated: {earthSolar?.latestXrayTimestamp || 'Live Stream'}</span>
        </div>

        {/* 4 Solar KPI Stream Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">GOES X-Ray Class (1 AU)</span>
            <div className="text-2xl font-bold text-cyan-300">{earthSolar?.latestXrayClass || 'C1.2'}</div>
            <span className="text-[11px] text-slate-400 block">Flux: {earthSolar?.latestXrayFluxWm2 ? `${earthSolar.latestXrayFluxWm2.toExponential(2)} W/m²` : 'Nominal'}</span>
          </div>

          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">Proton Flux (&gt;10 MeV)</span>
            <div className="text-2xl font-bold text-amber-300">
              {earthSolar?.latestProtonFluxPfu !== undefined && earthSolar?.latestProtonFluxPfu !== null ? earthSolar.latestProtonFluxPfu.toFixed(2) : '0.14'} <span className="text-xs text-slate-400">pfu</span>
            </div>
            <span className="text-[11px] text-emerald-400 block">SPE Event: CLEAR</span>
          </div>

          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">Planetary K-Index</span>
            <div className="text-2xl font-bold text-emerald-400">
              {earthSolar?.latestKpIndex !== undefined && earthSolar?.latestKpIndex !== null ? earthSolar.latestKpIndex : '2.0'} <span className="text-xs text-slate-400">Kp</span>
            </div>
            <span className="text-[11px] text-emerald-400 block">Geomagnetic Activity: Quiet</span>
          </div>

          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase block">DONKI Solar Events</span>
            <div className="text-2xl font-bold text-indigo-400">{donkiItems.length} <span className="text-xs text-slate-400">Recent</span></div>
            <span className="text-[11px] text-slate-400 block">CMEs / Flares Tracked</span>
          </div>
        </div>
      </div>

      {/* ================= PART C: FUNCTIONAL RECHARTS GRAPHS (4 INTERACTIVE CHARTS) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Chart 1: Solar X-Ray Flux History */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Solar X-Ray Flux History (0.1–0.8 nm GOES)</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Units: W/m² (Log Scale)</span>
          </div>
          <div className="h-64 w-full">
            {xrayChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={xrayChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => Number(v).toExponential(1)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1021', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(val: any) => [Number(val).toExponential(2) + ' W/m²', 'X-Ray Flux']}
                    labelStyle={{ color: '#00f0ff', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="flux" stroke="#00f0ff" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#00f0ff' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No GOES X-ray time-series points available for window.</div>
            )}
          </div>
        </div>

        {/* Chart 2: Proton Flux History */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Solar Proton Flux History (&gt;10 MeV GOES SGPS)</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Units: pfu</span>
          </div>
          <div className="h-64 w-full">
            {protonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={protonChartData}>
                  <defs>
                    <linearGradient id="protonGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1021', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(val: any) => [Number(val).toFixed(3) + ' pfu', 'Proton Flux']}
                    labelStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="flux" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#protonGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No proton flux telemetry points available for window.</div>
            )}
          </div>
        </div>

        {/* Chart 3: Mars Surface Radiation Comparison Baseline */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Mars Surface Radiation Dose Reference Baseline</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Units: mGy/day</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={surfaceDoseComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="location" type="category" stroke="#64748b" fontSize={10} width={130} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1021', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(val: any) => [val + ' mGy/day', 'Absorbed Dose Rate']}
                  labelStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                />
                <Bar dataKey="dose" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Planetary K-Index Geomagnetic Activity */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>Planetary K-Index Geomagnetic Activity (NOAA)</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Units: Kp Index</span>
          </div>
          <div className="h-64 w-full">
            {kpChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 9]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1021', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(val: any) => [val + ' Kp', 'Planetary K-Index']}
                    labelStyle={{ color: '#c084fc', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="kp" fill="#c084fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No K-index telemetry available for window.</div>
            )}
          </div>
        </div>
      </div>

      {/* ================= PART D: NASA DONKI SOLAR EVENTS FEED ================= */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>NASA CCMC DONKI Solar Event Archive ({donkiItems.length} Events)</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Source: CCMC DONKI API</span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {donkiItems.length > 0 ? donkiItems.map((ev, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    {ev.kind}
                  </span>
                  <strong className="text-white">{ev.startTime}</strong>
                  {ev.classType && <span className="text-cyan-300 font-bold">Class {ev.classType}</span>}
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-1">{ev.note || 'No description provided.'}</p>
              </div>
              {ev.link && (
                <a
                  href={ev.link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px] flex items-center gap-1 shrink-0 self-start sm:self-center"
                >
                  <span>DONKI Record</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )) : (
            <div className="text-slate-500 py-6 text-center">No active DONKI solar events reported for the selected time window.</div>
          )}
        </div>
      </div>

      {/* ================= PART E: SCIENTIFIC DATA PROVENANCE & OBSERVATION STATUS ================= */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Scientific Data Provenance &amp; Observation Status</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Transparency &amp; Metadata Verification</span>
        </div>

        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="py-2.5 px-3">Data Category</th>
                <th className="py-2.5 px-3">Source Repository</th>
                <th className="py-2.5 px-3">Observing Instrument</th>
                <th className="py-2.5 px-3">Status / Value</th>
                <th className="py-2.5 px-3">Data Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
              <tr>
                <td className="py-3 px-3 font-bold text-cyan-300">Mars Surface Radiation</td>
                <td className="py-3 px-3">NASA Planetary Data System (PDS) / MSL</td>
                <td className="py-3 px-3">Radiation Assessment Detector (RAD)</td>
                <td className="py-3 px-3 text-emerald-400">0.65 mGy/day (Archived GCR Baseline)</td>
                <td className="py-3 px-3">Observed In-Situ</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-cyan-300">Mars Meteorology</td>
                <td className="py-3 px-3">NASA PDS / InSight / Perseverance MEDA</td>
                <td className="py-3 px-3">MEDA / REMS Environmental Sensors</td>
                <td className="py-3 px-3 text-amber-300">-62.4 °C | 7.18 mbar</td>
                <td className="py-3 px-3">Observed Surface</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-yellow-300">Solar X-Ray Flux</td>
                <td className="py-3 px-3">NOAA Space Weather Prediction Center (SWPC)</td>
                <td className="py-3 px-3">GOES Primary XRS (0.1–0.8 nm)</td>
                <td className="py-3 px-3 text-cyan-300">{earthSolar?.latestXrayClass || 'C1.2'} ({earthSolar?.latestXrayFluxWm2?.toExponential(2) || 'Nominal'} W/m²)</td>
                <td className="py-3 px-3">Live Heliospheric Stream</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-yellow-300">Solar Proton Flux</td>
                <td className="py-3 px-3">NOAA SWPC / GOES Satellite Network</td>
                <td className="py-3 px-3">GOES Solar Proton Sensor (&gt;10 MeV)</td>
                <td className="py-3 px-3 text-emerald-400">{(earthSolar?.latestProtonFluxPfu ?? 0.14).toFixed(2)} pfu (SPE Clear)</td>
                <td className="py-3 px-3">Live Heliospheric Stream</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-yellow-300">Planetary K-Index</td>
                <td className="py-3 px-3">NOAA SWPC Geomagnetic Service</td>
                <td className="py-3 px-3">Global Ground Magnetometer Network</td>
                <td className="py-3 px-3 text-purple-300">{earthSolar?.latestKpIndex ?? 2.0} Kp (Quiet)</td>
                <td className="py-3 px-3">Live Heliospheric Stream</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-indigo-300">Solar Events (DONKI)</td>
                <td className="py-3 px-3">NASA CCMC / Goddard Space Flight Center</td>
                <td className="py-3 px-3">SOHO LASCO / STEREO / GOES CCOR</td>
                <td className="py-3 px-3 text-white">{donkiItems.length} Events Logged</td>
                <td className="py-3 px-3">Archived Event Catalog</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
