import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="px-6 sm:px-8 lg:px-10 py-3.5 border-b border-[#E8ECE9]/90 bg-[#F7F9F8]">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 w-full">
        {/* Col 1: Brand Identity & Logo (Left-aligned) */}
        <div className="flex items-center justify-start">
          <Link to="/" className="flex items-center gap-3 shrink-0 select-none group">
            <div className="w-10 h-10 rounded-2xl bg-[#144D34] flex items-center justify-center text-white shadow-md shadow-emerald-950/15 group-hover:bg-[#0E3624] transition">
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
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold tracking-tight text-[#11241A]">FinOps</span>
              <span className="text-xl font-bold text-[#207C4A]">AI</span>
            </div>
          </Link>
        </div>

        {/* Col 2: Navigation Pill Tabs (Perfect Mathematical Center) */}
        <div className="flex items-center justify-center">
          <nav className="inline-flex items-center gap-1 bg-[#EEF2EF] p-1.5 rounded-2xl border border-slate-200/70 shadow-inner">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-[13.5px] font-bold transition-all ${
                  isActive
                    ? 'bg-white text-[#0E3624] shadow-sm border border-slate-200/50'
                    : 'text-[#606E66] hover:text-[#11241A] hover:bg-white/50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 text-[#144D34]" />
              <span>Cost Optimizer</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-[13.5px] font-bold transition-all ${
                  isActive
                    ? 'bg-white text-[#0E3624] shadow-sm border border-slate-200/50'
                    : 'text-[#606E66] hover:text-[#11241A] hover:bg-white/50'
                }`
              }
            >
              <History className="w-4 h-4 text-[#144D34]" />
              <span>History</span>
            </NavLink>
          </nav>
        </div>

        {/* Col 3: User Profile Widget (Right-aligned) */}
        <div className="flex items-center justify-end">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 bg-white/90 py-1.5 px-3 rounded-2xl border border-slate-200/70 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#DCF2E4] border border-[#144D34]/20 shadow-xs flex items-center justify-center text-xs font-bold text-[#0E3624] overflow-hidden select-none shrink-0">
                {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-[#14231B] leading-tight">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-[#DCF2E4] text-[#144D34] rounded-md border border-[#86D1A6]/40">
                    {user.role}
                  </span>
                </div>
                <div className="text-[11px] text-[#7A8A81] font-medium leading-tight">
                  {user.email}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200/60 hover:border-red-200 transition flex items-center justify-center shrink-0 ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 bg-[#144D34] hover:bg-[#0E3624] text-white rounded-full text-xs font-bold transition shadow-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
