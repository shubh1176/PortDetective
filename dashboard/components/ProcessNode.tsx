import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Cpu, HardDrive, GitBranch, Layout } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ProcessNodeData = {
  pid: number;
  name: string;
  listening: number[];
  framework: string;
  branch: string;
  cpu: number;
  mem: number;
  IsMissing?: boolean;
};

const ProcessNode = ({ data }: NodeProps<ProcessNodeData>) => {
  const isHighCPU = data.cpu > 10;
  const isMissing = data.IsMissing;

  return (
    <div className={cn(
      "px-4 py-3 shadow-2xl rounded-xl border bg-zinc-900/90 backdrop-blur-md min-w-[200px]",
      isMissing ? "border-zinc-700/50 border-dashed opacity-40 grayscale" : (isHighCPU ? "border-red-500/50 shadow-red-500/10" : "border-zinc-800"),
      "transition-all duration-500 hover:scale-105 hover:border-blue-500/50"
    )}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-blue-500 border-none" />
      
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "p-2 rounded-lg",
          isMissing ? "bg-zinc-800 text-zinc-600" : (isHighCPU ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400")
        )}>
          <Layout size={18} />
        </div>
        <div>
          <h3 className="text-zinc-100 font-semibold text-sm leading-tight truncate max-w-[120px]">
            {data.name}
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">
            {isMissing ? "SERVICE MISSING" : `PID ${data.pid}`}
          </span>
        </div>
      </div>

      {!isMissing && (
        <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-zinc-600" />
            <span>{data.cpu.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive size={12} className="text-zinc-600" />
            <span>{data.mem.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <GitBranch size={12} className="text-zinc-600" />
            <span className="truncate">{data.branch || '-'}</span>
          </div>
        </div>
      )}

      {data.listening.length > 0 && (
        <div className="mt-3 pt-2 border-t border-zinc-800/50 flex flex-wrap gap-1">
          {data.listening.map(port => (
            <span key={port} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-medium">
              :{port}
            </span>
          ))}
        </div>
      )}

      {isHighCPU && !isMissing && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-blue-500 border-none" />
    </div>
  );
};

export default memo(ProcessNode);
