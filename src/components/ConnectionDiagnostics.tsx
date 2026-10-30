import React, { useState } from 'react';
import { 
  Activity, 
  Globe, 
  Server, 
  Sparkles, 
  Database, 
  Radio, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronRight
} from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { ServiceStatus } from '../services/networkManager';

export default function ConnectionDiagnostics() {
  const network = useNetworkStatus();
  const [running, setRunning] = useState(false);

  const handleRunDiagnostics = async () => {
    setRunning(true);
    await network.retry();
    setRunning(false);
  };

  const getStatusColor = (status: ServiceStatus | string) => {
    switch (status) {
      case 'CONNECTED':
      case 'ONLINE':
        return 'text-emerald-400';
      case 'DEGRADED':
      case 'SLOW_CONNECTION':
      case 'ONLINE_LIMITED':
        return 'text-amber-400';
      case 'UNAVAILABLE':
      case 'OFFLINE':
        return 'text-rose-400';
      default:
        return 'text-slate-500';
    }
  };

  const getStatusIcon = (status: ServiceStatus | string) => {
    switch (status) {
      case 'CONNECTED':
      case 'ONLINE':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'DEGRADED':
      case 'SLOW_CONNECTION':
      case 'ONLINE_LIMITED':
        return <Activity className="w-4 h-4 text-amber-400" />;
      case 'UNAVAILABLE':
      case 'OFFLINE':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const services = [
    { 
      id: 'internet', 
      name: 'Browser Network', 
      icon: <Globe className="w-4 h-4" />, 
      status: network.isOnline ? 'ONLINE' : 'OFFLINE',
      detail: network.isOnline ? 'Hardware interface active' : 'No local network detected'
    },
    { 
      id: 'frontend', 
      name: 'MARSNAV Frontend', 
      icon: <Database className="w-4 h-4" />, 
      status: 'ONLINE',
      detail: 'Application bundle hydrated'
    },
    { 
      id: 'backend', 
      name: 'MARSNAV Backend', 
      icon: <Server className="w-4 h-4" />, 
      status: network.services.backend,
      detail: network.services.backend === 'CONNECTED' ? 'Telemetry API responding' : 'Server endpoint unreachable'
    },
    { 
      id: 'gemini', 
      name: 'Gemini API', 
      icon: <Sparkles className="w-4 h-4" />, 
      status: network.services.gemini,
      detail: network.services.gemini === 'CONNECTED' ? 'Neural link established' : 'AI intelligence suspended'
    },
    { 
      id: 'nasa', 
      name: 'NASA Services', 
      icon: <Radio className="w-4 h-4" />, 
      status: network.services.nasa,
      detail: network.services.nasa === 'CONNECTED' ? 'Deep Space Network active' : 'NASA data archives unreachable'
    },
    { 
      id: 'telemetry', 
      name: 'Mission Telemetry', 
      icon: <Activity className="w-4 h-4" />, 
      status: network.services.telemetry,
      detail: network.services.telemetry === 'CONNECTED' ? 'Real-time sync operational' : 'Signal transmission interrupted'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Connection Diagnostics
          </h3>
          <p className="text-xs text-slate-400 mt-1">Real-time status of MarsNav infrastructure and external dependencies.</p>
        </div>
        <button
          onClick={handleRunDiagnostics}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-900/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          <span>RUN CONNECTION DIAGNOSTICS</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((svc) => (
          <div key={svc.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              {svc.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-200">{svc.name}</span>
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(svc.status)}
                  <span className={`text-[10px] font-mono font-bold uppercase ${getStatusColor(svc.status)}`}>
                    {svc.status}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 truncate">{svc.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0A0E1A] border border-cyan-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest">
            <Database className="w-3.5 h-3.5" />
            <span>Raw Telemetry Log</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Last Checked: {new Date(network.lastChecked).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="space-y-3 font-mono text-[10px]">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-500">Latency (Round-trip)</span>
            <span className="text-slate-300">{network.latencyMs ? `${network.latencyMs}ms` : 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-500">Connection Effective Type</span>
            <span className="text-slate-300 uppercase">{network.effectiveType || 'Unknown'}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-500">Downlink Speed</span>
            <span className="text-slate-300">{network.downlinkMbps ? `${network.downlinkMbps} Mbps` : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">System Mode</span>
            <span className="text-cyan-400">{network.state === 'OFFLINE' ? 'AUTONOMOUS_LOCAL' : 'REMOTELY_CONNECTED'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
