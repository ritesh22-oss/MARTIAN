import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw
} from 'lucide-react';
import AuditReportSection from '../AuditReportSection';
import { useMissionRecord } from '../../context/MissionRecordContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { generateMissionDossierPDF } from '../../utils/pdfGenerator';

export default function AnalysisReportsWorkspace() {
  const { activeMission } = useMissionRecord();
  const { settings, telemetry } = useWorkspace();
  const [reportTitle, setReportTitle] = useState('Jezero Western Delta Traverse Feasibility Study');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    if (!activeMission) return;
    setIsGenerating(true);
    try {
      await generateMissionDossierPDF(activeMission);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Data mapping layer with robust handling
  const getMappedData = (value: any, fallback: string = 'Not performed') => {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-slate-500 italic">{fallback}</span>;
    }
    return <span className="font-bold text-white">{value}</span>;
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
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isGenerating || !activeMission}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all flex items-center space-x-2 border border-slate-700 cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Printer className="w-4 h-4 text-emerald-400" />}
          <span>{isGenerating ? 'Generating...' : 'Save PDF Dossier'}</span>
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
            <div>MARSNAV CERT: <span className="text-emerald-400 font-bold">{activeMission ? (activeMission.validationPassed ? 'PASS' : 'FAIL') : 'N/A'}</span></div>
            <div>DATE: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Audit Details Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">1. Operational Target</span>
            {getMappedData(activeMission?.name)}
            <div className="text-[10px] text-slate-400">{activeMission?.id ? `ID: ${activeMission.id}` : 'No mission active'}</div>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">2. In-Situ Station</span>
            <div className="font-bold text-white">{activeMission ? 'MEDA Active' : 'Not performed'}</div>
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
