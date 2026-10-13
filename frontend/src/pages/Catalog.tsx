import React, { useState } from 'react';
import { VM_CATALOG, REGION_MULTIPLIERS } from '../services/api';
import { Server, Filter, CheckCircle2, DollarSign, Globe, Cpu } from 'lucide-react';

export const Catalog: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<'asia-south' | 'us-east' | 'europe-west'>('asia-south');
  const [selectedProvider, setSelectedProvider] = useState<'ALL' | 'AWS' | 'Azure' | 'GCP'>('ALL');

  const multiplier = REGION_MULTIPLIERS[selectedRegion] || 1.0;

  const filtered = VM_CATALOG.filter((v) => {
    const matchesRegion = v.region === selectedRegion;
    const matchesProvider = selectedProvider === 'ALL' || v.provider === selectedProvider;
    return matchesRegion && matchesProvider;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
            Multi-Cloud VM Instance Catalog
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Browse the 34 virtual machine configurations across AWS, Azure, and GCP utilized by the backend optimization engine.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#E9F7EF] text-[#144D34] border border-emerald-200">
          <Globe className="w-3.5 h-3.5" />
          <span>Regional Multiplier: {multiplier}x</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Region Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1">Region:</span>
          {(['asia-south', 'us-east', 'europe-west'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedRegion === r
                  ? 'bg-[#144D34] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Provider Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1">Provider:</span>
          {(['ALL', 'AWS', 'Azure', 'GCP'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedProvider(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedProvider === p
                  ? 'bg-[#144D34] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Instance Type</th>
                <th className="px-4 py-3">vCPU</th>
                <th className="px-4 py-3">RAM</th>
                <th className="px-4 py-3">Base Price/Hr</th>
                <th className="px-4 py-3">Regional Price/Hr</th>
                <th className="px-4 py-3 text-right">Estimated 720h Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
              {filtered.map((vm) => {
                const regionalRate = vm.price_per_hour * multiplier;
                const monthly = regionalRate * 720;
                return (
                  <tr key={vm.provider + vm.vm_type + vm.region} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          vm.provider === 'AWS' ? 'bg-amber-500' : vm.provider === 'Azure' ? 'bg-sky-500' : 'bg-emerald-500'
                        }`}
                      ></span>
                      <span>{vm.provider}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#144D34]">{vm.vm_type}</td>
                    <td className="px-4 py-3">{vm.vcpu} vCPUs</td>
                    <td className="px-4 py-3">{vm.ram_gb} GB</td>
                    <td className="px-4 py-3">${vm.price_per_hour.toFixed(4)}/hr</td>
                    <td className="px-4 py-3 font-bold text-gray-900">${regionalRate.toFixed(4)}/hr</td>
                    <td className="px-4 py-3 font-bold text-[#144D34] text-right">${monthly.toFixed(2)}/mo</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
