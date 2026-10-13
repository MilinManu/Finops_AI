import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#0b1329]/50 border border-slate-800/80">
      <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 mb-4 text-slate-400">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-semibold text-slate-200">{title}</h4>
      <p className="text-sm text-slate-400 mt-1 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" variant="primary" className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
