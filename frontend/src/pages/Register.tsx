import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { FloatingParticles } from '../components/FloatingParticles';

export const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await registerUser({ fullName, email, password });
      navigate('/', { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail?.message ||
        'Unable to create account. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F6FAF7] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Animated Floating Pastel Icons Background */}
      <FloatingParticles />

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-emerald-950/5 border border-slate-200/80 p-8 sm:p-10 space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#144D34] flex items-center justify-center shadow-md shadow-emerald-950/20">
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
          <p className="text-xs font-semibold text-[#66766E]">
            Create an Account to Access Cost Intelligence
          </p>
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
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1B2520] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144D34]/20 focus:border-[#144D34] transition-all shadow-sm"
              />
            </div>
          </div>

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
                placeholder="alex@company.com"
                className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1B2520] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144D34]/20 focus:border-[#144D34] transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#14231B] uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-[#1B2520] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144D34]/20 focus:border-[#144D34] transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#14231B] uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1B2520] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144D34]/20 focus:border-[#144D34] transition-all shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#144D34] hover:bg-[#0E3624] text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Register Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200/70">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-[#144D34] hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
