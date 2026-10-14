import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Cpu,
  Server,
  HardDrive,
  DollarSign,
  Cloud,
} from 'lucide-react';
import { FloatingParticles } from '../components/FloatingParticles';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail?.message ||
        'Unable to log in. Please check your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('demo@finops.ai');
    setPassword('Demo123!');
  };

  return (
    <div className="relative min-h-screen bg-[#F6FAF7] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Animated Floating Pastel Icons Background */}
      <FloatingParticles />

      {/* Unified Connected Horizontal Split-Card */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-[32px] shadow-2xl shadow-emerald-950/15 border border-[#176044]/20 overflow-hidden flex flex-col lg:flex-row items-stretch my-auto">
        {/* Left Side: White Login Panel */}
        <div className="w-full lg:w-[440px] bg-white p-8 sm:p-9 space-y-6 flex flex-col justify-between shrink-0">
          {/* Brand Header with Logo on the Left Side of FinOps AI */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#144D34] flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0">
              <svg
                className="w-6 h-6 text-[#86D1A6]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.3"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7a5 5 0 1 0 5 5"></path>
                <circle cx="12" cy="12" fill="currentColor" r="1.5"></circle>
              </svg>
            </div>
            <div className="flex items-baseline gap-1 text-2xl font-black text-[#11241A] tracking-tight">
              <span>FinOps</span>
              <span className="text-[#207C4A]">AI</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#14231B] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1B2520] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144D34]/20 focus:border-[#144D34] transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-[#14231B] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-[#1B2520] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144D34]/20 focus:border-[#144D34] transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#144D34] hover:bg-[#0E3624] text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials helper */}
          <div className="pt-2 border-t border-slate-200/70 space-y-2">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2 px-3 bg-[#EEF5F1] hover:bg-[#E3EFE8] text-[#144D34] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#86D1A6]/40 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#207C4A]" />
              <span>Fill Demo Credentials</span>
            </button>
          </div>

          {/* Footer Link */}
          <div className="text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-[#144D34] hover:underline"
            >
              Create an Account
            </Link>
          </div>
        </div>

        {/* Right Side: Deep Emerald Welcome Panel (Edge-to-Edge connected & Vertically Balanced) */}
        <div className="w-full lg:flex-1 bg-gradient-to-br from-[#124C37] via-[#15543D] to-[#0E3D2C] p-8 sm:p-9 text-[#F8FCF9] flex flex-col justify-between relative overflow-hidden shrink-0">
          {/* Ambient soft mint depth glow */}
          <div className="absolute inset-0 pointer-events-none opacity-25">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#C6F6D9] blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#176044] blur-3xl" />
          </div>

          {/* Top: Welcome Header (positioned up) */}
          <div className="relative z-10 space-y-2 pt-1">
            <h2 className="text-3xl sm:text-[34px] font-black text-white tracking-tight leading-tight">
              Welcome
            </h2>

            <p className="text-xs sm:text-[13.5px] text-[#C6F6D9] font-medium leading-relaxed max-w-sm">
              Predict cloud resources. Understand costs. Optimize smarter.
            </p>
          </div>

          {/* Bottom: Minimal 4-Resource Illustration (moved down) */}
          <div className="relative z-10 mt-auto pt-8 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Compute */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.13] border border-[#C6F6D9]/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-xl bg-[#C6F6D9]/15 border border-[#C6F6D9]/30 flex items-center justify-center shrink-0 text-[#C6F6D9]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9.5px] uppercase font-bold text-[#C6F6D9]/70 tracking-wider">Compute</div>
                  <div className="text-xs font-bold text-[#F8FCF9] truncate">vCPU Sizing</div>
                </div>
              </div>

              {/* Memory */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.13] border border-[#C6F6D9]/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-xl bg-[#C6F6D9]/15 border border-[#C6F6D9]/30 flex items-center justify-center shrink-0 text-[#C6F6D9]">
                  <Server className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9.5px] uppercase font-bold text-[#C6F6D9]/70 tracking-wider">Memory</div>
                  <div className="text-xs font-bold text-[#F8FCF9] truncate">RAM Capacity</div>
                </div>
              </div>

              {/* Storage */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.13] border border-[#C6F6D9]/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-xl bg-[#C6F6D9]/15 border border-[#C6F6D9]/30 flex items-center justify-center shrink-0 text-[#C6F6D9]">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9.5px] uppercase font-bold text-[#C6F6D9]/70 tracking-wider">Storage</div>
                  <div className="text-xs font-bold text-[#F8FCF9] truncate">Disk Volumes</div>
                </div>
              </div>

              {/* Economy */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.13] border border-[#C6F6D9]/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-xl bg-[#C6F6D9]/15 border border-[#C6F6D9]/30 flex items-center justify-center shrink-0 text-[#C6F6D9]">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9.5px] uppercase font-bold text-[#C6F6D9]/70 tracking-wider">Economy</div>
                  <div className="text-xs font-bold text-[#F8FCF9] truncate">Cross-Cloud</div>
                </div>
              </div>
            </div>

            {/* Cloud-Provider Cost-Intelligence Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-[#C6F6D9] font-bold">
              <Cloud className="w-3.5 h-3.5 text-[#C6F6D9]" />
              <span>AWS • Azure • GCP Cost Intelligence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
