import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { finopsApi } from '../services/api';
import { HistoryItem } from '../types';
import {
  History as HistoryIcon,
  Trash2,
  Search,
  Cpu,
  FolderArchive,
  GitBranch,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await finopsApi.getHistory();
      setHistoryItems(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteItem = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ id: item.id, title: item.title });
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const { id } = itemToDelete;
    setIsDeleting(id);
    try {
      await finopsApi.deleteHistory(id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete history item:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const confirmClearAll = async () => {
    setIsClearing(true);
    try {
      await finopsApi.clearHistory();
      setHistoryItems([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Filter items based on search and type
  const filteredItems = historyItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'prediction') return matchesSearch && item.type === 'prediction';
    if (filterType === 'code')
      return matchesSearch && (item.type === 'zip_analysis' || item.type === 'git_analysis');

    return matchesSearch;
  });

  const predictionCount = historyItems.filter((i) => i.type === 'prediction').length;
  const scanCount = historyItems.filter(
    (i) => i.type === 'zip_analysis' || i.type === 'git_analysis'
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl lg:text-[34px] font-extrabold text-[#112219] tracking-tight">
              Optimization History
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#144D34]/10 text-[#144D34] text-xs font-bold flex items-center gap-1">
              <HistoryIcon className="w-3.5 h-3.5 text-[#144D34]" />
              {historyItems.length} Records
            </span>
          </div>
          <p className="text-[14px] text-[#7A8B81] mt-1 font-medium">
            Review previous cloud cost estimates, machine learning predictions, and code scan logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadHistory}
            title="Refresh History"
            className="p-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {historyItems.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </section>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#DCF2E4] text-[#144D34] flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#11241A]">{historyItems.length}</div>
            <div className="text-xs font-semibold text-slate-500">Total Runs Stored</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#11241A]">{predictionCount}</div>
            <div className="text-xs font-semibold text-slate-500">ML Predictions</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#11241A]">{scanCount}</div>
            <div className="text-xs font-semibold text-slate-500">Codebase Scans</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-[24px] p-3 sm:p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              filterType === 'all'
                ? 'bg-[#144D34] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Runs ({historyItems.length})
          </button>
          <button
            onClick={() => setFilterType('prediction')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              filterType === 'prediction'
                ? 'bg-[#144D34] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ML Predictions ({predictionCount})
          </button>
          <button
            onClick={() => setFilterType('code')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              filterType === 'code'
                ? 'bg-[#144D34] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Code Scans ({scanCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search history records..."
            className="w-full bg-[#F7F9F8] border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-[#1B2520] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144D34]/20 focus:border-[#144D34] transition"
          />
        </div>
      </div>

      {/* History Items List */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#144D34]/20 border-t-[#144D34] rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500">Loading your history records...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 sm:p-16 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#EEF5F1] text-[#144D34] mx-auto flex items-center justify-center shadow-inner">
            <HistoryIcon className="w-8 h-8 text-[#207C4A]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-[#11241A]">No History Records Found</h3>
            <p className="text-xs text-slate-500">
              {searchTerm || filterType !== 'all'
                ? 'No matching history found for the current search or filter.'
                : 'You have not executed any optimizations or code scans yet. Run a prediction to see your saved records here!'}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#144D34] hover:bg-[#0E3624] text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition"
          >
            <span>Run New Optimization</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const dateStr = new Date(item.created_at).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={item.id}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#144D34]/30 transition cursor-pointer space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Badge Icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        item.type === 'prediction'
                          ? 'bg-[#DCF2E4] text-[#144D34]'
                          : item.type === 'zip_analysis'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {item.type === 'prediction' && <Cpu className="w-5 h-5" />}
                      {item.type === 'zip_analysis' && <FolderArchive className="w-5 h-5" />}
                      {item.type === 'git_analysis' && <GitBranch className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-[15px] font-bold text-[#11241A]">{item.title}</h4>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            item.type === 'prediction'
                              ? 'bg-[#E7EFEA] text-[#144D34]'
                              : item.type === 'zip_analysis'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {item.type === 'prediction'
                            ? 'ML Prediction'
                            : item.type === 'zip_analysis'
                            ? 'ZIP Scan'
                            : 'Git Scan'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">{item.summary}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateStr}
                    </span>

                    <button
                      onClick={(e) => handleDeleteItem(item, e)}
                      disabled={isDeleting === item.id}
                      title="Delete record"
                      className="w-8 h-8 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Breakdown */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-4 border-t border-slate-100 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Inputs Card */}
                      <div className="bg-[#F7F9F8] rounded-2xl p-4 border border-slate-200/60 space-y-2">
                        <div className="text-xs font-bold text-[#14231B] uppercase tracking-wider">
                          Run Inputs
                        </div>
                        <pre className="text-[11px] text-slate-700 bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto font-mono">
                          {JSON.stringify(item.inputs, null, 2)}
                        </pre>
                      </div>

                      {/* Results Card */}
                      <div className="bg-[#F7F9F8] rounded-2xl p-4 border border-slate-200/60 space-y-2">
                        <div className="text-xs font-bold text-[#14231B] uppercase tracking-wider">
                          Output Metrics & Recommendations
                        </div>
                        <pre className="text-[11px] text-slate-700 bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto font-mono">
                          {JSON.stringify(item.results, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Themed Confirmation Modal: Clear Entire History */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isClearing && setShowClearConfirm(false)}
        >
          <div
            className="bg-white rounded-[28px] border border-slate-200/90 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#11241A] tracking-tight">
                  Clear Optimization History?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This will permanently delete all{' '}
                  <span className="font-bold text-[#11241A]">{historyItems.length} records</span> from your optimization history, including ML predictions and code scans. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6FAF7] border border-[#86D1A6]/40 flex items-center gap-3 text-xs text-[#144D34] font-medium">
              <Sparkles className="w-4 h-4 text-[#207C4A] shrink-0" />
              <span>Your trained ML models and dashboard presets will remain intact.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={confirmClearAll}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <span>Clearing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Themed Confirmation Modal: Delete Single History Record */}
      {itemToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setItemToDelete(null)}
        >
          <div
            className="bg-white rounded-[28px] border border-slate-200/90 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#11241A] tracking-tight">
                  Delete History Record?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Are you sure you want to remove{' '}
                  <span className="font-bold text-[#11241A]">"{itemToDelete.title}"</span>? This record cannot be recovered.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={Boolean(isDeleting)}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(isDeleting)}
                onClick={confirmDeleteItem}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
