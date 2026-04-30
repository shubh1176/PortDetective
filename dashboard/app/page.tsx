"use client";

import dynamic from 'next/dynamic';
import { useWebSocket, Process } from '@/hooks/useWebSocket';
import { Shield, Activity, Network, Terminal, Search, Cpu, HardDrive, RefreshCcw, Camera, History, AlertCircle, X, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// Use dynamic import for Graph because React Flow requires window
const Graph = dynamic(() => import('@/components/Graph'), { ssr: false });

const SNAPSHOT_KEY = 'port-detective-snapshot';

export default function Home() {
  const { data, status } = useWebSocket('ws://localhost:8080/ws');
  const [snapshot, setSnapshot] = useState<any[] | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [isKilling, setIsKilling] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SNAPSHOT_KEY);
    if (saved) setSnapshot(JSON.parse(saved));
  }, []);

  const avgCpu = data.reduce((acc, p) => acc + p.CPU, 0) / (data.length || 1);
  const avgMem = data.reduce((acc, p) => acc + p.Mem, 0) / (data.length || 1);

  const takeSnapshot = () => {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(data));
    setSnapshot(data);
    setShowDiff(false);
  };

  const killProcess = async (pid: number) => {
    setIsKilling(true);
    try {
      const resp = await fetch(`/api/kill?pid=${pid}`, { method: 'POST' });
      if (resp.ok) {
        setSelectedProcess(null);
      } else {
        alert("Failed to kill process. It might require elevated permissions.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsKilling(false);
    }
  };

  const resetLayout = () => {
    localStorage.removeItem('port-detective-layout');
    window.location.reload();
  };

  // Find missing processes if diff mode is on
  const missingProcs = showDiff && snapshot 
    ? snapshot.filter(s => !data.find(d => d.Name === s.Name && d.GitBranch === s.GitBranch))
    : [];

  const displayData = [...data];
  if (showDiff) {
    missingProcs.forEach(m => {
      displayData.push({
        ...m,
        PID: -m.PID,
        CPU: 0,
        Mem: 0,
        IsMissing: true
      } as any);
    });
  }

  return (
    <main className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative flex items-center justify-between px-8 py-4 z-20"
      >
        <div className="absolute inset-x-4 top-4 bottom-0 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl -z-10 shadow-2xl shadow-black/50" />
        <div className="flex items-center gap-5">
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2 uppercase">
              PORT <span className="text-blue-500 italic">DETECTIVE</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter bg-zinc-800 px-1.5 py-0.5 rounded">v2.3.0</span>
              <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-tight">Active Observation Console</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-8 px-6 py-2 bg-black/20 rounded-full border border-white/5">
          <div className="flex items-center gap-4 border-r border-white/5 pr-8">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-zinc-500" />
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 font-bold leading-none uppercase">Avg CPU</span>
                <span className="text-[11px] font-mono text-blue-400 font-bold">{avgCpu.toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-zinc-500" />
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 font-bold leading-none uppercase">Avg Mem</span>
                <span className="text-[11px] font-mono text-purple-400 font-bold">{avgMem.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button onClick={takeSnapshot} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/5 transition-all text-[10px] font-bold text-zinc-300 uppercase">
               <Camera size={12} />
               Snapshot
             </button>
             {snapshot && (
               <button onClick={() => setShowDiff(!showDiff)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase ${showDiff ? 'bg-blue-500 border-blue-400 text-white' : 'bg-zinc-800 border-white/5 text-zinc-300'}`}>
                 <History size={12} />
                 Time Travel
               </button>
             )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-white/5 transition-all cursor-pointer group" onClick={resetLayout}>
            <RefreshCcw size={14} className="text-zinc-400 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Reset Layout</span>
          </div>
          <div className="h-10 w-px bg-white/5 mx-2" />
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Live Nodes</span>
              <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black">{data.length}</div>
            </div>
            <span className="text-[9px] text-zinc-700 font-bold mt-1 uppercase">Secure Link</span>
          </div>
        </div>
      </motion.header>

      {/* Main Graph Area */}
      <div className="flex-1 relative mt-2">
        <AnimatePresence>
          {showDiff && missingProcs.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-4 right-8 z-30 p-4 bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl max-w-xs">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <AlertCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Mesh Divergence</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">Detected {missingProcs.length} services missing from the current feed.</p>
            </motion.div>
          )}

          {selectedProcess && (
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-4 right-4 bottom-4 w-96 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl z-40 shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Activity size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight truncate max-w-[200px]">{selectedProcess.Name}</h2>
                    <span className="text-xs font-mono text-zinc-500">PID {selectedProcess.PID}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedProcess(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <Cpu size={12} />
                      <span className="text-[10px] font-bold uppercase">CPU</span>
                    </div>
                    <span className="text-xl font-mono font-black text-blue-400">{selectedProcess.CPU.toFixed(1)}%</span>
                  </div>
                  <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <HardDrive size={12} />
                      <span className="text-[10px] font-bold uppercase">Mem</span>
                    </div>
                    <span className="text-xl font-mono font-black text-purple-400">{selectedProcess.Mem.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Metadata</h3>
                  <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Framework</span>
                      <span className="font-bold text-zinc-300">{selectedProcess.Framework}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Branch</span>
                      <span className="font-mono text-zinc-300 truncate max-w-[150px]">{selectedProcess.GitBranch}</span>
                    </div>
                    <div className="flex justify-between items-start text-xs">
                      <span className="text-zinc-500">Ports</span>
                      <div className="flex flex-wrap justify-end gap-1 max-w-[150px]">
                        {selectedProcess.Listening?.map(p => (
                          <span key={p} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">:{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Connections</h3>
                  <div className="space-y-2">
                    {selectedProcess.Connections?.length > 0 ? selectedProcess.Connections.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-[10px]">
                        <span className="text-zinc-400 font-mono truncate max-w-[120px]">{c.RemoteAddr}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 uppercase font-black">{c.Status}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-zinc-700 text-xs italic">No active connections</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <button 
                  onClick={() => killProcess(selectedProcess.PID)} disabled={isKilling}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 group"
                >
                  <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                  {isKilling ? "Terminating..." : "Kill Process"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {status !== 'open' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
             <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
            <div className="text-center">
              <Terminal className="mx-auto text-zinc-900 mb-6" size={64} />
              <p className="text-zinc-600 font-bold tracking-tight">Silent Enclave.</p>
            </div>
          </div>
        ) : (
          <Graph processes={displayData} onProcessSelect={setSelectedProcess} />
        )}

        <div className="absolute bottom-8 left-8 z-10">
          <div className="px-6 py-3 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl">
             <div className="flex items-center gap-6 text-[10px] font-bold tracking-wide">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                  <span className="text-zinc-400 uppercase">Listener</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                  <span className="text-zinc-400 uppercase">High Load</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="text-zinc-600 flex items-center gap-2">
                  <Terminal size={12} />
                  <span>CLICK TO INSPECT • DRAG TO PIN</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
