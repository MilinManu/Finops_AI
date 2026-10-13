import React, { useState, useEffect, useRef } from 'react';
import {
  LucideIcon,
  Cpu,
  Database,
  Cloud,
  HardDrive,
  DollarSign,
  Coins,
  Server,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Gauge,
  Code2,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import './FloatingParticles.css';

interface FloatingTileConfig {
  id: string;
  icon: LucideIcon;
  label: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  animationClass: string;
  delay: string;
  parallaxFactor: { x: number; y: number };
  hideOnMobile?: boolean;
}

const FLOATING_TILES: FloatingTileConfig[] = [
  // Top-left periphery
  {
    id: 'cpu',
    icon: Cpu,
    label: 'vCPU Compute',
    position: { top: '10%', left: '7%' },
    animationClass: 'anim-float-1',
    delay: '0s',
    parallaxFactor: { x: 12, y: 10 },
  },
  {
    id: 'database',
    icon: Database,
    label: 'Cloud Database',
    position: { top: '26%', left: '13%' },
    animationClass: 'anim-float-3',
    delay: '-1.8s',
    parallaxFactor: { x: -10, y: 14 },
  },
  {
    id: 'server',
    icon: Server,
    label: 'Cloud Infrastructure',
    position: { top: '48%', left: '6%' },
    animationClass: 'anim-float-2',
    delay: '-3.2s',
    parallaxFactor: { x: 14, y: -8 },
  },

  // Bottom-left periphery
  {
    id: 'coins',
    icon: Coins,
    label: 'Cloud Spend',
    position: { bottom: '26%', left: '8%' },
    animationClass: 'anim-float-4',
    delay: '-2.1s',
    parallaxFactor: { x: -8, y: -12 },
  },
  {
    id: 'storage',
    icon: HardDrive,
    label: 'Storage & Disk',
    position: { bottom: '10%', left: '15%' },
    animationClass: 'anim-float-1',
    delay: '-4.5s',
    parallaxFactor: { x: 11, y: -10 },
  },

  // Top-right periphery
  {
    id: 'cloud',
    icon: Cloud,
    label: 'Cloud Provider',
    position: { top: '10%', right: '8%' },
    animationClass: 'anim-float-2',
    delay: '-1.2s',
    parallaxFactor: { x: -12, y: 11 },
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Cost Analytics',
    position: { top: '26%', right: '14%' },
    animationClass: 'anim-float-3',
    delay: '-3.7s',
    parallaxFactor: { x: 10, y: 13 },
  },
  {
    id: 'trends',
    icon: TrendingUp,
    label: 'Growth Trends',
    position: { top: '48%', right: '6%' },
    animationClass: 'anim-float-1',
    delay: '-2.8s',
    parallaxFactor: { x: -14, y: -9 },
  },

  // Bottom-right periphery
  {
    id: 'shield',
    icon: ShieldCheck,
    label: 'FinOps Governance',
    position: { bottom: '26%', right: '8%' },
    animationClass: 'anim-float-4',
    delay: '-0.9s',
    parallaxFactor: { x: 9, y: -12 },
  },
  {
    id: 'cost',
    icon: DollarSign,
    label: 'FinOps Optimization',
    position: { bottom: '10%', right: '15%' },
    animationClass: 'anim-float-2',
    delay: '-4.1s',
    parallaxFactor: { x: -11, y: -11 },
  },

  // Subtly distributed edge accents (hidden on mobile)
  {
    id: 'ai-sparkles',
    icon: Sparkles,
    label: 'ML Inference',
    position: { top: '5%', left: '32%' },
    animationClass: 'anim-float-3',
    delay: '-2.4s',
    parallaxFactor: { x: 8, y: 7 },
    hideOnMobile: true,
  },
  {
    id: 'gauge',
    icon: Gauge,
    label: 'Performance Gauge',
    position: { top: '5%', right: '32%' },
    animationClass: 'anim-float-1',
    delay: '-3.9s',
    parallaxFactor: { x: -8, y: 8 },
    hideOnMobile: true,
  },
  {
    id: 'code',
    icon: Code2,
    label: 'Static Code Analysis',
    position: { bottom: '5%', left: '32%' },
    animationClass: 'anim-float-2',
    delay: '-1.6s',
    parallaxFactor: { x: 7, y: -8 },
    hideOnMobile: true,
  },
  {
    id: 'check',
    icon: CheckCircle2,
    label: 'Right-Sized Verification',
    position: { bottom: '5%', right: '32%' },
    animationClass: 'anim-float-4',
    delay: '-5.1s',
    parallaxFactor: { x: -7, y: -7 },
    hideOnMobile: true,
  },
];

interface FloatingParticlesProps {
  className?: string;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ className = '' }) => {
  // Track which tile was clicked for brief pulse/bounce animation
  const [bouncingId, setBouncingId] = useState<string | null>(null);

  // Parallax coordinates normalized between -1 and 1
  const [parallaxOffset, setParallaxOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect reduced-motion preferences
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    let targetX = 0;
    let targetY = 0;
    let isMoving = false;

    const handlePointerMove = (e: PointerEvent) => {
      // Normalize pointer location relative to viewport center (-1 to 1)
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      targetX = Math.max(-1, Math.min(1, (e.clientX - centerX) / centerX));
      targetY = Math.max(-1, Math.min(1, (e.clientY - centerY) / centerY));

      if (!isMoving) {
        isMoving = true;
        animFrameRef.current = requestAnimationFrame(() => {
          setParallaxOffset({ x: targetX, y: targetY });
          isMoving = false;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleTileClick = (id: string) => {
    setBouncingId(id);
    setTimeout(() => {
      setBouncingId((current) => (current === id ? null : current));
    }, 450);
  };

  return (
    <div
      aria-hidden="true"
      className={`pastel-auth-background ${className}`}
    >
      {/* Soft ambient depth orbs in brand mint & pale green */}
      <div className="pastel-glow-orb pastel-glow-mint-top" />
      <div className="pastel-glow-orb pastel-glow-mint-bottom" />
      <div className="pastel-glow-orb pastel-glow-pale-right" />
      <div className="pastel-glow-orb pastel-glow-pale-left" />

      {/* Interactive floating icon tiles */}
      {FLOATING_TILES.map((tile) => {
        const IconComponent = tile.icon;
        const isBouncing = bouncingId === tile.id;

        // Subtle pointer-based parallax drift
        const driftX = (parallaxOffset.x * tile.parallaxFactor.x).toFixed(2);
        const driftY = (parallaxOffset.y * tile.parallaxFactor.y).toFixed(2);

        return (
          <div
            key={tile.id}
            className={`pastel-tile-anchor ${tile.hideOnMobile ? 'tile-hide-mobile' : ''}`}
            style={{
              ...tile.position,
              transform: `translate3d(${driftX}px, ${driftY}px, 0)`,
            }}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label={tile.label}
              onClick={() => handleTileClick(tile.id)}
              className={`pastel-icon-tile ${tile.animationClass} ${
                isBouncing ? 'tile-bounced' : ''
              }`}
              style={{
                animationDelay: tile.delay,
              }}
            >
              <IconComponent size={20} strokeWidth={2.2} className="shrink-0" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
