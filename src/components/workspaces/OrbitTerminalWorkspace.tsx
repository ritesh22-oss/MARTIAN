import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  BookOpen,
  Globe,
  Terminal,
  Activity,
  Cpu,
  Radio,
  Compass
} from 'lucide-react';
import { generateAutonomousAnswer } from '../../utils/orbitKnowledgeEngine';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function OrbitTerminalWorkspace() {
  const { telemetry, systemStatus, activeWorkspace, activeDataset, selectedObservation } = useWorkspace();
  const [chatMode, setChatMode] = useState<'guide' | 'general'>('general');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'assistant',
      content: '**ORBIT Planetary Flight Terminal Online**.\nI am the Operational Rover & Beyond Intelligence Terminal for MARSNAV. I can analyze rover trajectories, explain terrain segmentation layers, calculate mechanical energies, or answer any STEM and planetary science inquiries. All Jezero Crater communication links are nominal.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = chatMode === 'guide' ? [
    "How do I use MARSNAV?",
    "Explain the 3D Mars Explorer",
    "What are the four AI4Mars terrain classes?",
    "How does the A* cost equation calculate slopes?",
    "Explain the three Verify cards"
  ] : [
    "Why is Mars red?",
    "Calculate rover travel time for 4.8 km at 0.04 km/h",
    "Write Python code for A* pathfinding with slope penalties",
    "Explain quantum computing in simple terms",
    "How does the rocker-bogie suspension climb 45-degree obstacles?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const q = queryText || input.trim();
    if (!q || loading) return;

    const userMsg = { role: 'user', content: q };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('/api/orbit/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updated,
          mode: chatMode,
          appContext: {
            activeWorkspace,
            activeDataset,
            selectedObservation,
            telemetry
          }
        })
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || generateAutonomousAnswer(q, { mode: chatMode, messages: updated });
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch {
      clearTimeout(timer);
      const reply = generateAutonomousAnswer(q, { mode: chatMode, messages: updated });
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderContent = (text: string) => {
    const lines = text.split('\n');
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
                    <code key={k} className="px-1.5 py-0.5 rounded bg-black/50 text-emerald-300 font-mono text-[11px] border border-white/10">
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
    <div className="h-full flex flex-col p-4 max-w-6xl mx-auto font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="bg-[#0B1020] border border-slate-800 rounded-t-2xl px-5 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">ORBIT MISSION TERMINAL</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {chatMode === 'guide' ? 'GUIDE MODE' : 'GENERAL AI MODE'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Telemetry: Active • Latency: {systemStatus.backendLatencyMs || 8}ms</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChatMode(prev => prev === 'guide' ? 'general' : 'guide')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 cursor-pointer ${
              chatMode === 'guide'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : 'bg-purple-950/30 border-purple-500/40 text-purple-300'
            }`}
          >
            {chatMode === 'guide' ? <BookOpen className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
            <span>Mode: {chatMode === 'guide' ? 'Guide' : 'General AI'}</span>
          </button>

          <button
            onClick={() => setMessages([{ role: 'assistant', content: 'ORBIT Terminal conversation reset. Standing by for query.' }])}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset Terminal Log"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Messages Area */}
      <div className="flex-1 bg-[#050813] border-x border-slate-800 p-5 overflow-y-auto space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                : 'bg-[#0B1020] text-slate-200 border border-slate-800 shadow-xl'
            }`}>
              {renderContent(msg.content)}

              {msg.role === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>ORBIT Telemetry Link</span>
                  <button
                    onClick={() => copyToClipboard(msg.content, i)}
                    className="hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedIndex === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs p-3 bg-[#0B1020] rounded-xl w-fit border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            <span>ORBIT is synthesizing response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Chips */}
      <div className="px-4 py-2 bg-[#080D1C] border-x border-t border-slate-800 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={loading}
            className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Terminal Input Bar */}
      <div className="p-3 bg-[#0B1020] border border-slate-800 rounded-b-2xl flex items-center space-x-2 shadow-xl">
        <Terminal className="w-4 h-4 text-orange-400 shrink-0 ml-2" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
          placeholder={chatMode === 'guide' ? "Ask about MARSNAV features, tools, and workflows..." : "Ask me anything about Mars science, math, robotics, physics..."}
          disabled={loading}
          className="flex-1 bg-transparent px-3 py-2 text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold disabled:opacity-40 transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-orange-600/30"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
