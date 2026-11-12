import React, { useState } from 'react';
import { ShieldAlert, ExternalLink, Copy, Check, UserCheck, X } from 'lucide-react';

interface UnauthorizedDomainModalProps {
  domain: string;
  projectId: string;
  onClose: () => void;
  onContinueAsGuest: () => void;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  domain,
  projectId,
  onClose,
  onContinueAsGuest
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/providers`;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in font-sans">
      <div className="bg-[#0B1021] border border-amber-500/40 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 relative">
        {/* Header decoration bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        <div className="p-6 space-y-5">
          {/* Top Row: Icon & Close */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Firebase Domain Authorization Required</h3>
                <p className="text-xs text-amber-300/80 font-mono mt-0.5">auth/unauthorized-domain</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed">
            Google Sign-In requires your current deployment domain to be added to the Authorized Domains list in your Firebase Console project.
          </p>

          {/* Domain box */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2 font-mono text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current Domain</span>
              <span className="text-amber-300 font-semibold truncate block select-all">{domain}</span>
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Steps */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider">Quick Resolution Steps:</div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-normal">
              <li>Open your <span className="text-slate-200 font-medium">Firebase Console</span> for project <code className="text-amber-300/90 font-mono px-1 py-0.5 bg-slate-800 rounded">{projectId}</code>.</li>
              <li>Navigate to <span className="text-slate-200 font-medium">Authentication</span> &rarr; <span className="text-slate-200 font-medium">Settings</span> &rarr; <span className="text-slate-200 font-medium">Authorized domains</span>.</li>
              <li>Click <span className="text-slate-200 font-medium">Add domain</span> and paste <code className="text-amber-300/90 font-mono px-1 py-0.5 bg-slate-800 rounded">{domain}</code>.</li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={onContinueAsGuest}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-950/40 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>Continue in Guest Mission Mode</span>
            </button>
            <a
              href={firebaseConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Firebase Console</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
