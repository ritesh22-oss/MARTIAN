import React from 'react';
import { User as UserIcon, UserPlus, Cpu, ShieldAlert, Compass, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MarsNavLogo from './MarsNavLogo';

export const WelcomeLanding: React.FC = () => {
  const { openAuthModal } = useAuth();

  const capabilities = [
    {
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      title: 'Terrain Intelligence',
      desc: 'Analyze Mars rover and orbital surface imagery to classify bedrock, sand traps, and rock hazards.',
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
      title: 'Risk & Mobility Assessment',
      desc: 'Evaluate slope gradients, slip risk, environmental telemetry, and astronaut suit mobility margins.',
    },
    {
      icon: <Compass className="w-5 h-5 text-orange-400" />,
      title: 'Traverse & Mission Planning',
      desc: 'Compare heuristic navigation routes, configure missions, and save exploration records to your workspace.',
    },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto w-full min-h-full flex flex-col justify-center space-y-8 font-sans">
      {/* Main Welcome & Authentication Hero Card */}
      <div className="bg-[#0A0E1C] border border-cyan-500/30 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-500" />

        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3">
            <MarsNavLogo variant="icon" height={40} />
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase">
              Step 1 · Sign In to Access Mission Workspace
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase">
              WELCOME TO MARSNAV
            </h1>
            <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
              Explore Martian terrain. Analyze surface conditions. Plan safer rover and astronaut traverses.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sign in to access your mission workspace, save exploration data, configure missions and use advanced terrain analysis.
            </p>
          </div>

          {/* Primary Sign In & Create Account Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="py-3.5 px-7 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-orange-950/50 transition-all cursor-pointer active:scale-[0.98]"
            >
              <UserIcon className="w-4 h-4" />
              <span>SIGN IN</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className="py-3.5 px-7 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-400/50 hover:border-cyan-300 text-cyan-100 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4 text-cyan-300" />
              <span>CREATE ACCOUNT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Capabilities Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className="bg-[#090D1A] border border-slate-800/80 rounded-xl p-5 space-y-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              {cap.icon}
            </div>
            <h2 className="text-sm font-bold text-white">{cap.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{cap.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeLanding;
