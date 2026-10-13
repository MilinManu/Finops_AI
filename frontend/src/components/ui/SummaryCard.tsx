import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/formatters';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  change?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'blue' | 'rose' | 'purple';
}

const colorMap = {
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    glow: 'hover:border-cyan-500/40',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'hover:border-emerald-500/40',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    glow: 'hover:border-amber-500/40',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    glow: 'hover:border-blue-500/40',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    glow: 'hover:border-rose-500/40',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    glow: 'hover:border-purple-500/40',
  },
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  accentColor = 'cyan',
}) => {
  const styles = colorMap[accentColor];

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-[#0b1329]/80 border transition-all duration-300 shadow-lg relative overflow-hidden group',
        styles.border,
        styles.glow
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className={cn('text-2xl font-bold mt-1 tracking-tight', styles.text)}>
            {value}
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-xl border', styles.bg, styles.border)}>
          <Icon className={cn('w-5 h-5', styles.text)} />
        </div>
      </div>

      {change && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'font-semibold px-1.5 py-0.5 rounded',
              change.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            )}
          >
            {change.value}
          </span>
          <span className="text-slate-400">vs last cycle</span>
        </div>
      )}

      {/* Subtle bottom gradient line */}
      <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 opacity-50 bg-gradient-to-r', styles.text)} />
    </div>
  );
};
