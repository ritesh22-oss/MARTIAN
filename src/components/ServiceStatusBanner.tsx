import React from 'react';
import { AlertCircle, Sparkles, Radio, Activity, Server, X } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function ServiceStatusBanner() {
  const network = useNetworkStatus();
  
  if (!network.isOnline) return null;

  const alerts = [];
  
  if (network.services.backend === 'UNAVAILABLE') {
    alerts.push({ 
      id: 'backend', 
      label: 'MARSNAV BACKEND UNAVAILABLE', 
      icon: <Server className="w-3.5 h-3.5" />,
      color: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    });
  } else if (network.services.backend === 'DEGRADED') {
    alerts.push({ 
      id: 'backend-deg', 
      label: 'BACKEND LATENCY HIGH', 
      icon: <Server className="w-3.5 h-3.5" />,
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    });
  }

  if (network.services.gemini === 'UNAVAILABLE') {
    alerts.push({ 
      id: 'gemini', 
      label: 'GEMINI SERVICE UNAVAILABLE', 
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    });
  }

  if (network.services.nasa === 'UNAVAILABLE') {
    alerts.push({ 
      id: 'nasa', 
      label: 'EXTERNAL DATA SERVICE UNAVAILABLE', 
      icon: <Radio className="w-3.5 h-3.5" />,
      color: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    });
  }

  if (network.services.telemetry === 'UNAVAILABLE') {
    alerts.push({ 
      id: 'telemetry', 
      label: 'MISSION TELEMETRY INTERRUPTED', 
      icon: <Activity className="w-3.5 h-3.5" />,
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-6 py-2 bg-black/40 border-b border-white/5 shrink-0 z-10 animate-in slide-in-from-top duration-500">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase ${alert.color}`}
        >
          {alert.icon}
          <span>{alert.label}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-2 text-[9px] text-slate-500 font-mono italic">
        <AlertCircle className="w-3 h-3" />
        <span>Hardware Link Active. Remote systems reporting errors.</span>
      </div>
    </div>
  );
}
