import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  Compass, 
  Map, 
  Cpu, 
  HelpCircle,
  Radio,
  Activity,
  BookOpen,
  Globe,
  Terminal,
  Zap,
  Volume2,
  VolumeX,
  MessageSquare,
  Image as ImageIcon,
  Paperclip
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { generateAutonomousAnswer } from '../utils/orbitKnowledgeEngine';

export default function OrbitChat({ onOpenGuide }) {
  const { activeWorkspace, activeDataset, telemetry, activeMission } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatMode, setChatMode] = useState('guide'); 
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Greetings operator! I am **ORBIT**, your dedicated Jezero Crater terrain intelligence assistant. I am ready to guide you through workspace navigation, MRO HiRISE data feeds, hazard analysis, and rover simulations.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Contextual tips per active workspace
  useEffect(() => {
    const tips = {
      'overview': "Welcome to Base Camp! Choose a Martian region or launch the Mission Planner to begin your traverse.",
      'base-camp': "Select a candidate region like Jezero Crater or Arcadia Planitia to load real mission terrain.",
      'ops-simulator': "Mission Planner active. Click MEASURE to calculate distances or SET START/DESTINATION for A* pathfinding.",
      'explorer-3d': "3D Terrain Explorer active. Rotate and tilt the digital elevation model to inspect topography.",
      'live-mission': "Live NASA stream active. Browse genuine Sol captures from Perseverance & Curiosity.",
      'route-lab': "Route Laboratory active. Compare Alpha, Beta, Gamma, and Delta pathfinding strategies side-by-side.",
      'hazard-lab': "Hazard Analysis Lab active. Evaluate regolith sinkage and wheel slip probability.",
      'scenario-lab': "Scenario Testing active. Simulate dust storms and power anomalies.",
      'dataset-catalogue': "Dataset Catalogue active. Explore calibrated HiRISE and DTM elevation rasters."
    };
    const tip = tips[activeWorkspace] || "ORBIT intelligence ready. Click me for guidance or assistance!";
    setBubbleTip(tip);
  }, [activeWorkspace]);

  // Speech bubble & persistence state
  const [bubbleDismissed, setBubbleDismissed] = useState(() => {
    try {
      return localStorage.getItem('marsnav_orbit_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('marsnav_orbit_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [bubbleTip, setBubbleTip] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('marsnav_orbit_dismissed', bubbleDismissed.toString());
    } catch (e) {
      console.warn('Failed to save dismissal state', e);
    }
  }, [bubbleDismissed]);

  useEffect(() => {
    try {
      localStorage.setItem('marsnav_orbit_muted', isMuted.toString());
    } catch (e) {
      console.warn('Failed to save mute state', e);
    }
  }, [isMuted]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const suggestedPrompts = chatMode === 'guide' ? [
    "How do I use MARSNAV?",
    "Explain A* pathfinding & hazard buffers",
    "How do I load a NASA image?",
    "What are the route strategies?",
    "Show me the Mission Academy"
  ] : [
    "Tell me a fun fact about Jezero Crater",
    "Explain multi-mission radioisotope power",
    "Write a TypeScript helper for distance calculation",
    "What is the history of Martian dust storms?"
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage("Please attach only image files (JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage({
        data: event.target.result,
        mimeType: file.type,
        name: file.name
      });
      // Automatically switch to general mode if sending image as it's multimodal analysis
      if (chatMode === 'guide') setChatMode('general');
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query && !attachedImage) return;
    if (loading) return;

    const userMessage = { 
      role: 'user', 
      content: query || (attachedImage ? "Analyze this terrain capture." : ""),
      image: attachedImage 
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setAttachedImage(null);
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/orbit/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages,
          mode: chatMode,
          appContext: {
            activeWorkspace,
            activeDataset,
            telemetry,
            activeMission: activeMission ? {
              id: activeMission.id,
              name: activeMission.name,
              status: activeMission.status,
              roverProfile: activeMission.roverProfile,
              startPoint: activeMission.startPoint,
              destinationPoint: activeMission.destinationPoint,
              hazardsCount: Array.isArray(activeMission.segmentedHazards) ? activeMission.segmentedHazards.length : 0,
              checkpointsPassed: Array.isArray(activeMission.checkpoints) ? activeMission.checkpoints.filter((c) => c.status === 'Completed').length : 0
            } : null
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Neural link timeout or error.`);
      }

      const data = await response.json();
      setConnectionStatus(data.status);
      
      const replyContent = data.reply || "Connection interrupted. Re-establishing link...";
      setMessages([...updatedMessages, { role: 'assistant', content: replyContent }]);
    } catch (err) {
      console.warn(`ORBIT API Fallback:`, err.message);
      setConnectionStatus('autonomous');
      const autonomousReply = generateAutonomousAnswer(query, { mode: chatMode, messages: updatedMessages });
      setMessages([...updatedMessages, { role: 'assistant', content: autonomousReply }]);
      setErrorMessage(err.message.includes('API_KEY') ? "Gemini API Key missing or invalid. Operating in Autonomous Core mode." : null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: chatMode === 'guide' 
          ? 'Conversation reset. ORBIT Guide Mode active. How can I assist you with MARSNAV today?'
          : 'Conversation reset. ORBIT General AI Mode active. Ask me anything about science, math, coding, or the universe!'
      }
    ]);
  };

  const renderFormattedText = (text) => {
    if (!text) return null;

    if (text.includes('```')) {
      const codeRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
      const parts = [];
      let lastIdx = 0;
      let match;

      while ((match = codeRegex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          parts.push({ type: 'text', content: text.substring(lastIdx, match.index) });
        }
        parts.push({ type: 'code', lang: match[1] || 'code', content: match[2] });
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < text.length) {
        parts.push({ type: 'text', content: text.substring(lastIdx) });
      }

      return (
        <div className="space-y-3">
          {parts.map((p, idx) => {
            if (p.type === 'code') {
              return (
                <div key={idx} className="my-2 rounded-xl overflow-hidden border border-red-500/30 bg-[#070B14]">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#0C1222] border-b border-white/10 text-[10px] text-slate-400 font-mono">
                    <span className="uppercase text-orange-400 font-semibold">{p.lang}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(p.content)}
                      className="hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                    <code>{p.content}</code>
                  </pre>
                </div>
              );
            }
            return <div key={idx}>{renderStandardText(p.content)}</div>;
          })}
        </div>
      );
    }

    return renderStandardText(text);
  };

  const renderStandardText = (raw) => {
    const lines = raw.split('\n');
    return lines.map((line, i) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const content = isBullet ? line.trim().substring(2) : line;

      return (
        <div key={i} className={`${isBullet ? 'pl-4 my-1 flex items-start' : 'my-1'} leading-relaxed`}>
          {isBullet && <span className="text-red-500 mr-2 shrink-0">•</span>}
          <div className="flex-1">
            {content.split('**').map((chunk, j) => {
              const isBold = j % 2 === 1;
              if (chunk.includes('`')) {
                const subParts = chunk.split('`');
                return subParts.map((sub, k) => (
                  k % 2 === 1 ? (
                    <code key={k} className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono text-[11px] border border-white/10">
                      {sub}
                    </code>
                  ) : (
                    isBold ? <strong key={k} className="text-orange-400 font-semibold">{sub}</strong> : sub
                  )
                ));
              }
              return isBold ? <strong key={j} className="text-orange-400 font-semibold">{chunk}</strong> : chunk;
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* Compact Animated Robot-Face Launcher & Speech Bubble */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-2 select-none">
          
          {/* Contextual Speech Bubble */}
          {!bubbleDismissed && !isMuted && bubbleTip && (
            <div className="relative max-w-[280px] sm:max-w-[320px] bg-[#0A0E1A] border border-cyan-500/40 rounded-2xl p-3.5 shadow-2xl shadow-cyan-950/60 text-slate-200 text-xs font-sans animate-fadeIn">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-mono text-[10px] font-bold">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                  <span>ORBIT INTEL</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsMuted(true)}
                    className="text-slate-400 hover:text-white p-1 rounded transition"
                    title="Mute Tips"
                  >
                    <VolumeX className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setBubbleDismissed(true)}
                    className="text-slate-400 hover:text-white p-1 rounded transition"
                    title="Dismiss Bubble"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="leading-relaxed mb-2 text-slate-300">
                {bubbleTip}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                {onOpenGuide && (
                  <button
                    onClick={onOpenGuide}
                    className="text-[10px] font-mono font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Mission Academy</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(true)}
                  className="text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer ml-auto"
                >
                  <span>Ask Orbit →</span>
                </button>
              </div>

              {/* Speech bubble arrow pointer */}
              <div className="absolute -bottom-2 right-6 w-3 h-3 bg-[#0A0E1A] border-r border-b border-cyan-500/40 transform rotate-45" />
            </div>
          )}

          {/* Compact Robot Face Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="group relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0A0E1A] to-[#04060E] border-2 border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer"
            aria-label="Open ORBIT AI Mission Assistant"
            title="ORBIT AI Assistant"
          >
            {/* Status Indicator Dot */}
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0A0E1A] shadow-md animate-pulse" />

            {/* Custom Robot SVG Head */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-cyan-400 group-hover:text-cyan-300 transition-colors">
              {/* Antenna */}
              <path d="M12 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="1.5" r="1.2" fill="#F97316" className="animate-ping" />
              <circle cx="12" cy="1.5" r="1.2" fill="#F97316" />
              
              {/* Head Shell */}
              <rect x="3" y="5" width="18" height="15" rx="3.5" fill="#070B14" stroke="currentColor" strokeWidth="1.5" />
              
              {/* Ears / Side Bolts */}
              <rect x="1.5" y="9" width="1.5" height="4" rx="0.5" fill="#F97316" />
              <rect x="21" y="9" width="1.5" height="4" rx="0.5" fill="#F97316" />

              {/* Eyes (Blinking/Pulsing) */}
              <rect x="6.5" y="9" width="3.5" height="2.5" rx="1" fill="#06B6D4" className="animate-pulse" />
              <rect x="14" y="9" width="3.5" height="2.5" rx="1" fill="#06B6D4" className="animate-pulse" />
              <circle cx="8.25" cy="10.25" r="0.75" fill="#FFFFFF" />
              <circle cx="15.75" cy="10.25" r="0.75" fill="#FFFFFF" />

              {/* Mouth / Audio Grille */}
              <rect x="7.5" y="15" width="9" height="2.5" rx="1" fill="#1E293B" stroke="#F97316" strokeWidth="0.75" />
              <line x1="9.5" y1="16.25" x2="14.5" y2="16.25" stroke="#F97316" strokeWidth="1" strokeLinecap="round" />
            </svg>

            {/* Subtle Label on Hover */}
            <span className="absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono font-bold text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap">
              ORBIT AI
            </span>
          </button>
        </div>
      )}

      {/* Full Chat Interface Modal / Drawer */}
      {isOpen && (
        <div className={`fixed z-50 transition-all duration-300 flex flex-col bg-[#080C19] border border-cyan-500/40 shadow-2xl shadow-cyan-950/90 overflow-hidden ${
          isExpanded 
            ? 'inset-4 sm:inset-10 rounded-2xl' 
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[480px] h-[640px] max-h-[88vh] rounded-2xl'
        }`}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0A0E1A] border-b border-cyan-500/30">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                <Bot className="w-5 h-5" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm tracking-wider text-white">ORBIT</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/40">
                    {chatMode === 'guide' ? 'GUIDE MODE' : 'GENERAL AI'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {connectionStatus === 'connected' ? 'Gemini Neural Link Active' : 'Autonomous Mission Intelligence Active'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Mission Academy Button */}
              {onOpenGuide && (
                <button
                  onClick={onOpenGuide}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 transition cursor-pointer flex items-center space-x-1"
                  title="Open Mission Academy & Onboarding Tour"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Academy</span>
                </button>
              )}

              {/* Mode Toggle Button */}
              <button
                onClick={() => {
                  const newMode = chatMode === 'guide' ? 'general' : 'guide';
                  setChatMode(newMode);
                  setMessages([
                    {
                      role: 'assistant',
                      content: newMode === 'guide' 
                        ? 'Switched to **MARSNAV Guide Mode**. Ask me about website features, navigation, and rover tools!'
                        : 'Switched to **General AI Mode**. Ask me anything about science, mathematics, coding, history, or engineering!'
                    }
                  ]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                  chatMode === 'guide' 
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40' 
                    : 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                }`}
                title="Toggle Guide vs General AI Mode"
              >
                {chatMode === 'guide' ? <Compass className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                <span>{chatMode === 'guide' ? 'Guide' : 'General'}</span>
              </button>

              <button
                onClick={resetChat}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reset Conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isExpanded ? "Minimize Window" : "Expand Window"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close ORBIT"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error / Rate Limit Banner */}
          {errorMessage && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-[11px] text-amber-300 font-mono">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-amber-400 hover:text-white">×</button>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#050813]">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-orange-600 text-white shadow-md' 
                      : 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {msg.role === 'user' ? <span className="text-xs font-bold">U</span> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-tr-none shadow-lg shadow-orange-900/20'
                      : 'bg-[#10172A] text-slate-200 border border-white/10 rounded-tl-none shadow-xl'
                  }`}>
                    {msg.image && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-white/10 max-w-[200px]">
                        <img src={msg.image.data} alt="Attached screenshot" className="w-full h-auto" />
                      </div>
                    )}
                    {renderFormattedText(msg.content)}

                    {msg.role === 'assistant' && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                        <span>ORBIT Telemetry</span>
                        <button
                          onClick={() => copyToClipboard(msg.content, index)}
                          className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono p-3 bg-[#10172A] rounded-2xl w-fit border border-white/10">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>ORBIT is synthesizing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="px-4 py-2 bg-[#0A0E1A] border-t border-white/10 flex items-center space-x-3">
              <div className="relative w-12 h-12 rounded border border-cyan-500/50 overflow-hidden bg-black">
                <img src={attachedImage.data} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute top-0 right-0 p-0.5 bg-black/60 text-white hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {attachedImage.name}
              </div>
            </div>
          )}

          {/* Suggested Prompts */}
          <div className="px-4 py-2 bg-[#0A0E1A] border-t border-white/10 flex items-center space-x-2 overflow-x-auto scrollbar-none">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#070B14] border-t border-cyan-500/30 flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer"
              title="Attach Image for Analysis"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder={chatMode === 'guide' ? "Ask about MARSNAV features or tools..." : "Ask me anything about science, math, coding..."}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || (!input.trim() && !attachedImage)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-cyan-900/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
