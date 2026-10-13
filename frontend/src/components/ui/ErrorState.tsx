import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load telemetry',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl bg-rose-950/20 border border-rose-500/30">
      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-3">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-rose-200">{title}</h4>
      <p className="text-xs text-rose-300/80 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outline" icon={RotateCcw} className="mt-4 border-rose-500/40 text-rose-300 hover:bg-rose-500/10">
          Retry Request
        </Button>
      )}
    </div>
  );
};
