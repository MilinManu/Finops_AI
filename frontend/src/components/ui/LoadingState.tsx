import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading FinOps analytics...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#0b1329]/50 border border-slate-800/80">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-300">{message}</p>
      <p className="text-xs text-slate-500 mt-1">Aggregating telemetry & computing recommendations</p>
    </div>
  );
};
