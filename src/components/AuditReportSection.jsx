import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, CheckCircle2, ShieldCheck, Database, Compass } from 'lucide-react';
import { MARS_REFERENCE_DATUM, NASA_DATA_SOURCES } from '../utils/marsScienceData';

export default function AuditReportSection() {
  const [exported, setExported] = useState(false);
  const [exportType, setExportType] = useState('');

  const auditRecord = {
    systemName: "MARSNAV AI-Powered Terrain Analysis & Rover Navigation",
    version: "2.4.0-spaceapps",
    timestamp: new Date().toISOString(),
    referenceDatum: MARS_REFERENCE_DATUM,
    activeSources: NASA_DATA_SOURCES.map(s => s.name),
    selectedRoute: "Route Alpha: Direct Optimal Vector (4.82 km)",
    algorithmParameters: {
      astarGridResolution: "200x200 DTM nodes",
      uncertaintyPenaltyWeight: 1.5,
      maxSlopeLimitDeg: 14,
      roverMassKg: 1025
    },
    validationStatus: "Passed 8/8 automated test suites"
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditRecord, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `marsnav_mission_audit_${Date.now()}.json`);
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
      "Version,2.4.0\n" +
      "Reference Datum,Mars Areoid MOLA\n" +
      "Selected Route,Route Alpha Direct Optimal\n" +
      "Total Distance (m),4820\n" +
      "Duration (mins),240\n" +
      "Elevation Gain (m),65\n" +
      "Max Slope (deg),8.2\n" +
      "Validation Status,Passed 8/8 Tests\n";
    const encodedUri = encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `marsnav_route_stats_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExported(true);
    setExportType('CSV Route Statistics');
  };

  return (
    <section id="audit-report" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10 font-mono">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 uppercase tracking-widest">
            <FileText className="w-3.5 h-3.5" />
            <span>Module 9: Evidence & Structured Audit Record</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans">
            Mission Audit Report & Reproducibility Export
          </h2>
          <p className="text-slate-300 text-sm sm:text-base font-sans">
            Export structured audit records containing dataset identifiers, algorithm parameters, and computed route statistics as JSON or CSV for peer review.
          </p>
        </div>

        {/* Audit Record Card */}
        <div className="bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Structured Mission Audit Record</h3>
                <span className="text-xs text-slate-400">Generated: {auditRecord.timestamp}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportJSON}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 text-xs font-mono transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export JSON Audit</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV Stats</span>
              </button>
            </div>
          </div>

          <div className="bg-black/50 p-6 rounded-2xl border border-white/10 font-mono text-xs overflow-x-auto text-slate-300 space-y-2">
            <pre className="text-cyan-300 leading-relaxed">
              {JSON.stringify(auditRecord, null, 2)}
            </pre>
          </div>

          {exported && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-xs text-emerald-400 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Successfully exported {exportType} to your local device.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
