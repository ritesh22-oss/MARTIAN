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
  Zap
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { generateAutonomousAnswer } from '../utils/orbitKnowledgeEngine';

export default function OrbitChat({ onOpenGuide }) {
  const { activeWorkspace, activeDataset, telemetry, activeMission } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatMode, setChatMode] = useState('general'); // Default to general for "out of the box" feel
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to **ORBIT**, your advanced mission intelligence terminal. I am powered by Gemini and ready to assist with MARSNAV operations or answer any question about science, coding, history, and beyond. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [errorMessage, setErrorMessage] = useState(null);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = chatMode === 'guide' ? [
    "How do I use MARSNAV?",
    "Explain AI4MARS terrain classes",
    "How does A* pathfinding work?",
    "Show me how to plan a route",
    "What are the hazard zones?",
    "Explain the Mission Academy"
  ] : [
    "Tell me a fun fact about Mars",
    "Explain quantum superposition",
    "Write a React component for a timer",
    "What is the history of Jezero Crater?",
    "Solve 15 * 4.2 / 3",
    "Why is the sky blue?"
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const userMessage = { role: 'user', content: query };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
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
        throw new Error(`Neural link timeout or error.`);
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

    // Check for code blocks
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

      // Inline code rendering
      const inlineCodeRegex = /`([^`]+)`/g;

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
      {/* Floating Launcher */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center space-x-3 bg-gradient-to-r from-red-600 via-red-700 to-slate-900 text-white px-5 py-3.5 rounded-full shadow-2xl shadow-red-900/50 border border-red-500/40 hover:border-red-400 transition-all duration-300 hover:scale-105 cursor-pointer"
            title="Open ORBIT AI Mission Assistant"
          >
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
            
            <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center border border-red-500/50 group-hover:rotate-12 transition-transform">
              <Bot className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-left font-mono">
              <div className="text-xs font-bold tracking-wider text-white">ORBIT AI</div>
              <div className="text-[9px] text-red-300">MISSION TERMINAL</div>
            </div>
          </button>
        </div>
      )}

      {/* Chat Interface Modal / Drawer */}
      {isOpen && (
        <div className={`fixed z-50 transition-all duration-300 flex flex-col bg-[#080C19] border border-red-500/30 shadow-2xl shadow-red-950/80 overflow-hidden ${
          isExpanded 
            ? 'inset-4 sm:inset-10 rounded-2xl' 
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[460px] h-[620px] max-h-[85vh] rounded-2xl'
        }`}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0A0E1A] border-b border-red-500/20">
            <div className="flex items-center space-x-3">
              <div className="relative w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-inner">
                <Bot className="w-5 h-5" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm tracking-wider text-white">ORBIT</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono border border-red-500/30">
                    {chatMode === 'guide' ? 'GUIDE MODE' : 'GENERAL AI'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {connectionStatus === 'connected' ? 'Neural Link Active (Gemini 1.5)' : 'Autonomous Mission Intelligence Active'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
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
                    ? 'bg-orange-600/30 text-orange-300 border border-orange-500/40' 
                    : 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                }`}
                title="Toggle Guide vs General AI Mode"
              >
                {chatMode === 'guide' ? <BookOpen className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
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
                      ? 'bg-red-600 text-white shadow-md' 
                      : 'bg-slate-800 text-red-400 border border-red-500/30'
                  }`}>
                    {msg.role === 'user' ? <span className="text-xs font-bold">U</span> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-tr-none shadow-lg shadow-red-900/20'
                      : 'bg-[#10172A] text-slate-200 border border-white/10 rounded-tl-none shadow-xl'
                  }`}>
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
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>ORBIT is synthesizing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

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
          <div className="p-3 bg-[#070B14] border-t border-red-500/20 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder={chatMode === 'guide' ? "Ask about MARSNAV features or tools..." : "Ask me anything about science, math, coding..."}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-red-900/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
