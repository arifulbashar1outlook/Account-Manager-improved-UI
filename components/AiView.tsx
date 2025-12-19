
import React, { useState } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  Camera, 
  Mic, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Bot,
  MessageSquareText,
  ScanLine
} from 'lucide-react';

interface AiViewProps {
  onBack: () => void;
}

const AiView: React.FC<AiViewProps> = ({ onBack }) => {
  const isAiActive = !!process.env.API_KEY && process.env.API_KEY !== "undefined";

  const aiFeatures = [
    {
      icon: ScanLine,
      title: "Receipt Scanning",
      desc: "Instant data extraction from physical bazar memos and grocery receipts.",
      status: "Active"
    },
    {
      icon: MessageSquareText,
      title: "Smart Voice Entries",
      desc: "Log transactions naturally by speaking. Gemini parses your intent.",
      status: "Active"
    },
    {
      icon: BrainCircuit,
      title: "Financial Coaching",
      desc: "Intelligent insights on your spending habits and health score.",
      status: "Active"
    }
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 animate-in fade-in duration-300">
      <div className="px-6 space-y-6">
          <div className="flex items-center gap-3 pt-4 pb-2">
              <Sparkles className="text-md-primary" size={24} />
              <h2 className="text-3xl font-black tracking-tight text-md-on-surface dark:text-white">AI Integration</h2>
          </div>
      </div>

      <div className="p-5 space-y-8">
        {/* Connection Status Card with AI Mesh Gradient */}
        <div className={`p-8 rounded-[40px] border border-white/20 shadow-2xl transition-all relative overflow-hidden group ${isAiActive ? 'mesh-gradient-ai' : 'bg-amber-500/10 dark:bg-amber-900/10 border-amber-500/20'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity animate-mesh">
               <Zap size={120} />
            </div>
            <div className="relative z-10 flex items-center justify-between mb-4">
               <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-[20px] ${isAiActive ? 'bg-white/20 backdrop-blur-md' : 'bg-amber-500'} text-white shadow-lg border border-white/20`}>
                     {isAiActive ? <Zap size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div>
                    <h3 className={`font-extrabold text-lg tracking-tight ${isAiActive ? 'text-white' : 'text-amber-900 dark:text-amber-400'}`}>
                        {isAiActive ? 'Gemini AI Online' : 'AI Offline'}
                    </h3>
                    <p className={`text-[10px] font-medium uppercase tracking-[0.2em] ${isAiActive ? 'text-white/60' : 'text-amber-700/60'}`}>
                        v2.5 Flash native
                    </p>
                  </div>
               </div>
            </div>
            {isAiActive ? (
                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full w-fit border border-white/10">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-white">Neural Engine Ready</span>
                </div>
            ) : (
                <p className="mt-4 text-[11px] font-semibold text-amber-700 leading-relaxed uppercase tracking-wider dark:text-amber-500">
                    Neural engine requires API configuration to enable multi-modal intelligence.
                </p>
            )}
        </div>

        {/* Feature List */}
        <div className="space-y-4">
             <div className="flex items-center gap-2 ml-2">
                <Bot size={14} className="text-md-primary" />
                <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-md-on-surface-variant opacity-60">Cognitive Features</h3>
            </div>

            {aiFeatures.map((feature, idx) => (
                <div key={idx} className="glass p-6 rounded-[32px] shadow-sm flex gap-5 group hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all border border-black/5 dark:border-white/5">
                    <div className="w-14 h-14 rounded-[20px] bg-md-primary/5 dark:bg-white/5 text-md-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <feature.icon size={26} />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-sm tracking-tight text-md-on-surface dark:text-white">{feature.title}</h4>
                            <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full tracking-widest">Live</span>
                        </div>
                        <p className="text-[11px] text-md-on-surface-variant leading-relaxed font-medium opacity-70">
                            {feature.desc}
                        </p>
                    </div>
                </div>
            ))}
        </div>

        {/* Info Card */}
        <div className="flex items-start gap-4 p-5 glass rounded-[24px] border border-black/5 dark:border-white/5 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-md-primary shrink-0 opacity-60" />
            <p className="text-[10px] font-semibold text-md-on-surface-variant leading-relaxed uppercase tracking-widest opacity-60">
                Ethical AI Disclosure: Personal data is processed on-demand for analysis and extraction. Recordings and images are processed in memory and are not persisted on our servers.
            </p>
        </div>
      </div>
    </div>
  );
};

export default AiView;
