import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-full lg:w-[275px] bg-[#F7F9F8] border-r border-[#E8ECE9] flex flex-col p-6 shrink-0 select-none">
      <div className="space-y-7">
        {/* Brand Identity */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-2xl bg-[#144D34] flex items-center justify-center text-white shadow-md shadow-emerald-950/15">
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
        </div>

        {/* Navigation Section */}
        <div>
          <span className="text-[11px] font-bold tracking-wider text-[#8C9891] uppercase px-3">
            Navigation
          </span>
          <nav className="mt-3 space-y-1.5">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14.5px] transition-all ${
                  isActive
                    ? 'bg-[#E7EFEA] text-[#0E3624] font-bold shadow-sm'
                    : 'text-[#606E66] hover:bg-[#EEF3F0] font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#144D34]' : 'transparent'}`}></span>
                  <LayoutDashboard className={`w-5 h-5 ${isActive ? 'text-[#144D34]' : 'text-[#7E8D85]'}`} />
                  <span>Cost Optimizer</span>
                </div>
              )}
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14.5px] transition-all ${
                  isActive
                    ? 'bg-[#E7EFEA] text-[#0E3624] font-bold shadow-sm'
                    : 'text-[#606E66] hover:bg-[#EEF3F0] font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#144D34]' : 'transparent'}`}></span>
                  <History className={`w-5 h-5 ${isActive ? 'text-[#144D34]' : 'text-[#7E8D85]'}`} />
                  <span>History</span>
                </div>
              )}
            </NavLink>
          </nav>
        </div>
      </div>
    </aside>
  );
};

