import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, CheckCircle2, ShieldCheck, Database, FileDigit, RefreshCw } from 'lucide-react';
import { useMissionRecord } from '../context/MissionRecordContext';
import { generateMissionDossierPDF } from '../utils/pdfGenerator';

export default function AuditReportSection() {
  const { activeMission } = useMissionRecord();
  const [exported, setExported] = useState(false);
  const [exportType, setExportType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!activeMission) {
    return (
      <div className="py-20 text-center text-slate-400">
        No active mission selected. Create or select a mission to view the audit record.
      </div>
    );
  }

  const auditRecord = {
    systemName: "MARSNAV AI-Powered Terrain Analysis & Rover Navigation",
    version: "2.4.0-spaceapps",
    missionId: activeMission.id,
    missionName: activeMission.name,
    timestamp: new Date().toISOString(),
    computedMetrics: activeMission.routeMetrics || {},
    validationStatus: activeMission.validationPassed ? "Passed" : "Not yet validated",
    fieldNotes: activeMission.fieldNotes || []
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeMission, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `marsnav_mission_audit_${activeMission.id}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExported(true);
    setExportType('JSON Audit Record');
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Metric,Value\n" +
      "System Name,MARSNAV Mission Planner\n" +
      "Mission Name," + activeMission.name + "\n" +
      "Status," + activeMission.status + "\n" +
      "Validation Status," + (activeMission.validationPassed ? "Passed" : "Pending") + "\n";
    const encodedUri = encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `marsnav_stats_${activeMission.id}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExported(true);
    setExportType('CSV Route Statistics');
  };

  const [error, setError] = useState(null);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await generateMissionDossierPDF(activeMission);
      setExported(true);
      setExportType('Professional PDF Dossier');
    } catch (err) {
      console.error("PDF Export failed:", err);
      setError(err instanceof Error ? err.message : 'Unknown PDF export error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section id="audit-report" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10 font-mono">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-xs text-[#22d3ee] uppercase tracking-widest">
            <FileText className="w-3.5 h-3.5" />
            <span>Mission Dossier: {activeMission.name}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans">
            Mission Audit Report & Reproducibility Export
          </h2>
          <p className="text-slate-300 text-sm sm:text-base font-sans">
            Detailed record of mission results, including processed terrain evidence, route analytics, and dataset verification reports.
          </p>
        </div>

        {/* Audit Record Card */}
        <div className="bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#06b6d4]/15 border border-[#06b6d4]/30 flex items-center justify-center text-[#22d3ee]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{activeMission.name}</h3>
                <span className="text-xs text-slate-400">ID: {activeMission.id} | Status: {activeMission.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportPDF}
                disabled={isGenerating}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-mono font-bold shadow-lg shadow-[#059669]/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDigit className="w-4 h-4" />}
                <span>{isGenerating ? 'Generating PDF...' : 'Save PDF Dossier'}</span>
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 text-xs font-mono transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#22d3ee]" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#f97316] text-white text-xs font-mono font-bold shadow-lg shadow-[#ea580c]/30 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Evidence Section */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
              <span className="text-[#94a3b8] block text-[10px] uppercase">Terrain Evidence</span>
              {activeMission.terrainImage && (
                <div className="space-y-2">
                  <span className="text-[10px] text-[#64748b] uppercase">Original</span>
                  <img src={activeMission.terrainImage} alt="Mission Terrain" className="rounded-xl w-full h-auto" />
                </div>
              )}
              {activeMission.processedImage && (
                <div className="space-y-2">
                  <span className="text-[10px] text-[#64748b] uppercase">Processed</span>
                  <img src={activeMission.processedImage} alt="Processed Terrain" className="rounded-xl w-full h-auto" />
                </div>
              )}
              {activeMission.obstacleOverlay && (
                <div className="space-y-2">
                  <span className="text-[10px] text-[#64748b] uppercase">Obstacles</span>
                  <img src={activeMission.obstacleOverlay} alt="Obstacle Overlay" className="rounded-xl w-full h-auto" />
                </div>
              )}
              {activeMission.routeVisualization && (
                <div className="space-y-2">
                  <span className="text-[10px] text-[#64748b] uppercase">Route</span>
                  <img src={activeMission.routeVisualization} alt="Route Visualization" className="rounded-xl w-full h-auto" />
                </div>
              )}
              {!activeMission.terrainImage && !activeMission.processedImage && !activeMission.obstacleOverlay && !activeMission.routeVisualization && (
                <div className="h-32 flex items-center justify-center text-[#64748b] bg-[#ffffff]/5 rounded-xl">No terrain imagery available.</div>
              )}
            </div>
            
            {/* Mission Metadata */}
            <div className="space-y-3">
              <div className="bg-[#000000]/40 p-4 rounded-2xl border border-[#ffffff]/10">
                <span className="text-[#94a3b8] block text-[10px] uppercase">Route Status</span>
                <span className="text-[#34d399] font-semibold">{activeMission.routeMetrics?.pathfindingStatus || 'N/A'}</span>
              </div>
              <div className="bg-[#000000]/40 p-4 rounded-2xl border border-[#ffffff]/10">
                <span className="text-[#94a3b8] block text-[10px] uppercase">Field Notes</span>
                <span className="text-[#e2e8f0] text-sm">{activeMission.fieldNotes?.length || 0} notes recorded.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

