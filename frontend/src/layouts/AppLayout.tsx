import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#ECEEEB] text-[#1B2520] font-sans antialiased p-3 sm:p-5 md:p-6 lg:p-8 flex items-center justify-center">
      {/* Master SaaS Application Container */}
      <div className="w-full max-w-[1560px] bg-[#F7F9F8] rounded-[36px] shadow-2xl shadow-slate-400/20 border border-white/80 overflow-hidden flex flex-col min-h-[920px]">
        <Navbar />
        <main className="flex-1 flex flex-col px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
