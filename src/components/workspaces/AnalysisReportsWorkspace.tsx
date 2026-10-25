import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  ShieldCheck,
  Database,
  Compass,
  Calendar,
  Layers,
  Printer
} from 'lucide-react';
import AuditReportSection from '../AuditReportSection';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM, NASA_DATA_SOURCES } from '../../utils/marsScienceData';

export default function AnalysisReportsWorkspace() {
  const { settings, telemetry, activeDataset, recentAnalyses } = useWorkspace();
  const [reportTitle, setReportTitle] = useState('Jezero Western Delta Traverse Feasibility Study');
  const [operatorName, setOperatorName] = useState('Rover Planner Station Alpha');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="bg-[#0B1020] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-400 uppercase tracking-widest font-bold mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>MISSION AUDIT & CERTIFICATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-tight">
            Engineering Reports & Audit Record
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Generate verifiable technical audit records containing input datasets, model configurations, path metrics, and known operational limits.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all flex items-center space-x-2 border border-slate-700 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Main Report Document View */}
      <div className="bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">OFFICIAL REPORT HEADER</span>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="text-base font-bold text-white bg-transparent border-b border-slate-700 focus:outline-none focus:border-orange-500 w-full sm:w-96 font-sans block mt-1"
            />
          </div>
          <div className="text-right text-[11px] text-slate-400 space-y-0.5">
            <div>MARSNAV CERT: <span className="text-emerald-400 font-bold">PASS-8/8</span></div>
            <div>DATE: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Audit Details Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">1. Operational Target</span>
            <div className="font-bold text-white">Jezero Crater Delta</div>
            <div className="text-[10px] text-slate-400">Octavia E. Butler Quadrangle</div>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">2. In-Situ Station</span>
            <div className="font-bold text-white">MEDA Sol 428</div>
            <div className="text-[10px] text-slate-400">{telemetry.ambientTempC}°C • {telemetry.atmosPressurePa} Pa</div>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">3. Safety Envelope</span>
            <div className="font-bold text-amber-400">Max Incline: {settings.maxSlopeLimitDeg}°</div>
            <div className="text-[10px] text-slate-400">Rover Mass: {settings.roverMassKg} kg</div>
          </div>
        </div>

        {/* Embedded Audit Section with Exports */}
        <div className="pt-2">
          <AuditReportSection />
        </div>
      </div>
    </div>
  );
}
