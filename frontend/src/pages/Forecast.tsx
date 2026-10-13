import React, { useState } from 'react';
import { Calculator, HardDrive, Cpu, DollarSign, Calendar, Layers } from 'lucide-react';
import { REGION_MULTIPLIERS } from '../services/api';

export const Forecast: React.FC = () => {
  const [hourlyPrice, setHourlyPrice] = useState<number>(0.033);
  const [storageGb, setStorageGb] = useState<number>(100);
  const [region, setRegion] = useState<'asia-south' | 'us-east' | 'europe-west'>('asia-south');

  const multiplier = REGION_MULTIPLIERS[region] || 1.0;
  const regionalHourly = hourlyPrice * multiplier;
  const computeMonthly = regionalHourly * 720;
  const storageMonthly = storageGb * 0.10;
  const totalMonthly = computeMonthly + storageMonthly;
  const yearlyCost = totalMonthly * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
          Cost Projection & Billing Architecture
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Detailed breakdown of the mathematical formulas implemented in the backend inference runner (<code className="text-[#144D34] font-mono">ml/predict.py</code>).
        </p>
      </div>

      {/* Formula Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#E9F7EF] text-[#144D34] flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="text-sm font-bold text-gray-900">Compute Monthly Formula</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            Compute = HourlyRate × RegionMultiplier × 720
          </p>
          <p className="text-[11px] text-slate-400">Standard 24 hours × 30 days billing basis.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#E9F7EF] text-[#144D34] flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="text-sm font-bold text-gray-900">Storage Monthly Formula</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            Storage = StorageGB × $0.10 / GB-month
          </p>
          <p className="text-[11px] text-slate-400">SSD block storage allocation rate.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#E9F7EF] text-[#144D34] flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="text-sm font-bold text-gray-900">Total Run-rate Formula</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            Total = ComputeMonthly + StorageMonthly
          </p>
          <p className="text-[11px] text-slate-400">Annualized = Total × 12 months.</p>
        </div>
      </div>

      {/* Interactive Sizing Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900">Interactive Formula Sandbox</h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Base Instance Hourly Rate ($)</label>
              <input
                type="number"
                step="0.001"
                value={hourlyPrice}
                onChange={(e) => setHourlyPrice(Number(e.target.value))}
                className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as any)}
                className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium"
              >
                <option value="asia-south">Asia South (1.00x)</option>
                <option value="us-east">US East (0.95x)</option>
                <option value="europe-west">Europe West (1.10x)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Storage Allocation (GB)</label>
              <input
                type="number"
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
                className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#144D34] text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[#B8E5CA] font-bold">Calculated Projections</span>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#DCF2E4]">Regional Hourly</span>
                <p className="text-2xl font-bold text-white mt-0.5">${regionalHourly.toFixed(4)}/hr</p>
              </div>
              <div>
                <span className="text-xs text-[#DCF2E4]">Compute Cost / Month</span>
                <p className="text-2xl font-bold text-white mt-0.5">${computeMonthly.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-xs text-[#DCF2E4]">Storage Cost / Month</span>
                <p className="text-2xl font-bold text-white mt-0.5">${storageMonthly.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-xs text-[#DCF2E4]">Total Projected Run-rate</span>
                <p className="text-3xl font-extrabold text-[#6bff8f] mt-0.5">${totalMonthly.toFixed(2)} / mo</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-[#DCF2E4]">
            <span>12-Month Annual Cost: <strong className="text-white text-sm">${yearlyCost.toFixed(2)}</strong></span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold text-[#6bff8f]">
              Direct Backend Match
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
