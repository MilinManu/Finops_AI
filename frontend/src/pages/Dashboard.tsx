import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { finopsApi, REGION_MULTIPLIERS } from '../services/api';
import {
  PredictionRequest,
  PredictionResponse,
  VMInstanceOption,
  ProjectAnalysisResponse,
} from '../types';
import {
  Sparkles,
  Cpu,
  Server,
  DollarSign,
  Calendar,
  Cloud,
  Layers,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Globe,
  UploadCloud,
  GitBranch,
  Sliders,
  AlertTriangle,
  FolderArchive,
  FileCode,
  ChevronDown,
  ChevronUp,
  Info,
  Database,
  Box,
  Terminal,
  Clock,
  Zap,
  TrendingDown,
} from 'lucide-react';

const APPLICATION_TYPES = [
  'E-Commerce',
  'Blog',
  'CRM',
  'Banking',
  'ERP',
  'Healthcare',
  'News Portal',
  'Portfolio',
  'Social Media',
  'Streaming',
];

const REGIONS = [
  { label: 'Asia South (Mumbai / ap-south-1)', value: 'asia-south' },
  { label: 'US East (N. Virginia / us-east)', value: 'us-east' },
  { label: 'Europe West (Frankfurt / europe-west)', value: 'europe-west' },
];

const TRAFFIC_PATTERNS = ['Low', 'Medium', 'High'];

type WorkflowMode = 'manual' | 'zip' | 'git';

export const Dashboard: React.FC = () => {
  // Workflow state
  const [workflow, setWorkflow] = useState<WorkflowMode>('manual');

  // Prediction state (null initially: no hardcoded fake numbers)
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [comparisons, setComparisons] = useState<VMInstanceOption[]>([]);

  // Project analysis state
  const [selectedZip, setSelectedZip] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ProjectAnalysisResponse | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showRawStatic, setShowRawStatic] = useState(false);

  // Form handling
  const { register, handleSubmit, setValue, watch } = useForm<PredictionRequest>({
    defaultValues: {
      application_type: 'E-Commerce',
      expected_users_per_day: 10000,
      concurrent_users: 250,
      storage_required_gb: 100,
      deployment_region: 'asia-south',
      traffic_pattern: 'Medium',
    },
  });

  const watchedRegion = watch('deployment_region') || 'asia-south';
  const watchedStorage = Number(watch('storage_required_gb')) || 100;
  const watchedTraffic = watch('traffic_pattern') || 'Medium';
  const [savingsStrategy, setSavingsStrategy] = useState<'on_demand' | 'auto_schedule' | 'reserved'>('on_demand');
  const [hoveredDay, setHoveredDay] = useState<{ name: string; cost: number; load: number } | null>(null);

  // Handle ZIP project analysis
  const handleAnalyzeZip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZip) {
      setAnalysisError('Please choose a .zip file before analyzing.');
      return;
    }
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const data = await finopsApi.analyzeZip(selectedZip);
      setAnalysisResult(data);
      applyAnalysisToForm(data);

      finopsApi.saveHistory({
        type: 'zip_analysis',
        title: `ZIP Scan: ${data.project_name || selectedZip.name}`,
        summary: `${data.files_scanned} files scanned • ${data.workload_analysis?.application_type || 'Custom Workload'}`,
        inputs: { fileName: selectedZip.name, sizeBytes: selectedZip.size },
        results: data,
      }).catch((e) => console.warn('Could not save history:', e));
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to analyze the uploaded ZIP file. Ensure the backend is running.';
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Git repository analysis
  const handleAnalyzeGit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl.trim()) {
      setAnalysisError('Please enter a valid GitHub repository URL.');
      return;
    }
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const data = await finopsApi.analyzeGit(gitUrl.trim());
      setAnalysisResult(data);
      applyAnalysisToForm(data);

      finopsApi.saveHistory({
        type: 'git_analysis',
        title: `Git Scan: ${data.project_name || gitUrl.split('/').pop()}`,
        summary: `${data.files_scanned} files scanned • ${data.workload_analysis?.application_type || 'Custom Workload'}`,
        inputs: { repoUrl: gitUrl.trim() },
        results: data,
      }).catch((e) => console.warn('Could not save history:', e));
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to analyze the GitHub repository. Check repository URL and backend connectivity.';
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pre-fill form when analysis completes
  const applyAnalysisToForm = (analysis: ProjectAnalysisResponse) => {
    const workload = analysis.workload_analysis;
    if (!workload) return;

    if (workload.application_type && APPLICATION_TYPES.includes(workload.application_type)) {
      setValue('application_type', workload.application_type);
    }

    if (workload.traffic_pattern && TRAFFIC_PATTERNS.includes(workload.traffic_pattern)) {
      setValue('traffic_pattern', workload.traffic_pattern);
    }

    if (
      typeof workload.storage_required_gb === 'number' &&
      workload.storage_required_gb > 0
    ) {
      setValue('storage_required_gb', Math.min(workload.storage_required_gb, 5000000));
    }
  };

  // Submit prediction to real backend
  const onSubmitPrediction = async (data: PredictionRequest) => {
    setIsPredicting(true);
    setPredictionError(null);
    try {
      const payload: PredictionRequest = {
        application_type: data.application_type,
        expected_users_per_day: Number(data.expected_users_per_day),
        concurrent_users: Number(data.concurrent_users),
        storage_required_gb: Number(data.storage_required_gb),
        deployment_region: data.deployment_region,
        traffic_pattern: data.traffic_pattern,
      };

      const res = await finopsApi.predictResources(payload);
      setResult(res);

      const cmp = finopsApi.getCrossCloudComparison(
        res.predicted_vcpu,
        res.predicted_ram_gb,
        payload.deployment_region
      );
      setComparisons(cmp);

      finopsApi.saveHistory({
        type: 'prediction',
        title: `${payload.application_type} (${payload.deployment_region})`,
        summary: `${res.predicted_vcpu} vCPU, ${res.predicted_ram_gb} GB RAM • ${res.recommended_vm || 'Custom VM'} • $${res.price_per_hour_usd ?? '0'}/hr ($${res.monthly_cost_usd ?? '0'}/mo)`,
        inputs: payload,
        results: res,
      }).catch((e) => console.warn('Could not save history:', e));
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Prediction failed. Please ensure the backend is running at http://127.0.0.1:8000';
      setPredictionError(msg);
      setResult(null);
    } finally {
      setIsPredicting(false);
    }
  };

  // Calculations for billing projection widget
  const multiplier = REGION_MULTIPLIERS[watchedRegion] || 1.0;
  const hasPrediction = Boolean(result);
  const currentHourlyRate = result?.price_per_hour_usd ?? 0;
  const computeMonthly = Number((currentHourlyRate * 720).toFixed(2));
  const storageMonthly = hasPrediction ? Number((watchedStorage * 0.1).toFixed(2)) : 0;
  const totalMonthly = Number(
    (result ? result.monthly_cost_usd ?? computeMonthly + storageMonthly : 0).toFixed(2)
  );
  const yearlyCost = Number(
    (result ? result.yearly_cost_usd ?? totalMonthly * 12 : 0).toFixed(2)
  );

  // Dynamic weekly run-rate profile based on live traffic pattern and savings strategy
  const trafficProfiles: Record<
    string,
    { days: { day: string; name: string; pct: number }[]; savingsAutoPct: number }
  > = {
    Low: {
      days: [
        { day: 'Sun', name: 'Sunday', pct: 35 },
        { day: 'Mon', name: 'Monday', pct: 55 },
        { day: 'Tue', name: 'Tuesday', pct: 60 },
        { day: 'Wed', name: 'Wednesday', pct: 58 },
        { day: 'Thu', name: 'Thursday', pct: 52 },
        { day: 'Fri', name: 'Friday', pct: 45 },
        { day: 'Sat', name: 'Saturday', pct: 30 },
      ],
      savingsAutoPct: 34,
    },
    Medium: {
      days: [
        { day: 'Sun', name: 'Sunday', pct: 45 },
        { day: 'Mon', name: 'Monday', pct: 82 },
        { day: 'Tue', name: 'Tuesday', pct: 92 },
        { day: 'Wed', name: 'Wednesday', pct: 88 },
        { day: 'Thu', name: 'Thursday', pct: 84 },
        { day: 'Fri', name: 'Friday', pct: 76 },
        { day: 'Sat', name: 'Saturday', pct: 48 },
      ],
      savingsAutoPct: 28,
    },
    High: {
      days: [
        { day: 'Sun', name: 'Sunday', pct: 72 },
        { day: 'Mon', name: 'Monday', pct: 95 },
        { day: 'Tue', name: 'Tuesday', pct: 100 },
        { day: 'Wed', name: 'Wednesday', pct: 98 },
        { day: 'Thu', name: 'Thursday', pct: 96 },
        { day: 'Fri', name: 'Friday', pct: 92 },
        { day: 'Sat', name: 'Saturday', pct: 75 },
      ],
      savingsAutoPct: 20,
    },
  };

  const activeProfile = trafficProfiles[watchedTraffic] || trafficProfiles['Medium'];
  const baselineMonthly = hasPrediction
    ? totalMonthly > 0
      ? totalMonthly
      : computeMonthly > 0
        ? computeMonthly + storageMonthly
        : 0
    : 0;
  const dailyBase = baselineMonthly > 0 ? baselineMonthly / 30 : 0;

  const strategyMultiplier =
    savingsStrategy === 'reserved'
      ? 0.68
      : savingsStrategy === 'auto_schedule'
        ? 1 - activeProfile.savingsAutoPct / 100
        : 1.0;

  const simulatedMonthly = Number((baselineMonthly * strategyMultiplier).toFixed(2));
  const estimatedSavings = Number((baselineMonthly - simulatedMonthly).toFixed(2));

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl lg:text-[34px] font-extrabold text-[#112219] tracking-tight">
              Cost Optimizer Dashboard
            </h1>

          </div>
          <p className="text-[14px] text-[#7A8B81] mt-1 font-medium">
            AI-driven cloud resource sizing, static code analysis & cross-cloud cost optimization.
          </p>
        </div>
      </section>

      {/* Workflow Switcher Tabs */}
      <section className="bg-white rounded-[24px] p-2.5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              setWorkflow('manual');
              setAnalysisError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all ${workflow === 'manual'
              ? 'bg-[#144D34] text-white shadow-md shadow-emerald-950/15'
              : 'text-[#506257] hover:bg-[#F2F6F3]'
              }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Manual Input</span>
          </button>

          <button
            onClick={() => {
              setWorkflow('zip');
              setAnalysisError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all ${workflow === 'zip'
              ? 'bg-[#144D34] text-white shadow-md shadow-emerald-950/15'
              : 'text-[#506257] hover:bg-[#F2F6F3]'
              }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Upload ZIP Project</span>
          </button>

          <button
            onClick={() => {
              setWorkflow('git');
              setAnalysisError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all ${workflow === 'git'
              ? 'bg-[#144D34] text-white shadow-md shadow-emerald-950/15'
              : 'text-[#506257] hover:bg-[#F2F6F3]'
              }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Analyze GitHub Repo</span>
          </button>
        </div>
      </section>

      {/* Mode 2: Upload ZIP Section */}
      {workflow === 'zip' && (
        <section className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-9 h-9 rounded-2xl bg-[#E9F7EF] text-[#144D34] flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#14231B]">Upload Source Code Archive</h3>
              <p className="text-xs text-slate-400">
                Upload a ZIP file (up to 50 MB) containing your repository files to extract static facts and infer workload patterns.
              </p>
            </div>
          </div>

          <form onSubmit={handleAnalyzeZip} className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 hover:border-[#144D34]/50 rounded-2xl p-6 text-center bg-[#F7F9F8] transition-all">
              <input
                id="zip-upload"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedZip(e.target.files[0]);
                    setAnalysisError(null);
                  }
                }}
              />
              <label htmlFor="zip-upload" className="cursor-pointer flex flex-col items-center">
                <FolderArchive className="w-10 h-10 text-[#144D34] mb-2" />
                <span className="text-sm font-bold text-[#14231B]">
                  {selectedZip ? selectedZip.name : 'Click to select project .zip'}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {selectedZip
                    ? `${(selectedZip.size / (1024 * 1024)).toFixed(2)} MB selected`
                    : 'Maximum upload size: 50 MB'}
                </span>
              </label>
            </div>

            {analysisError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{analysisError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing || !selectedZip}
              className="py-3 px-6 rounded-full bg-[#144D34] hover:bg-[#0E3624] text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Project Codebase...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze ZIP Project</span>
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Mode 3: Git Repository Section */}
      {workflow === 'git' && (
        <section className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-9 h-9 rounded-2xl bg-[#E9F7EF] text-[#144D34] flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#14231B]">Analyze Public GitHub Repository</h3>
              <p className="text-xs text-slate-400">
                Clone and inspect repository structure, dependencies, frameworks, databases, and LLM workload interpretation.
              </p>
            </div>
          </div>

          <form onSubmit={handleAnalyzeGit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Repository URL
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <input
                  type="url"
                  value={gitUrl}
                  onChange={(e) => {
                    setGitUrl(e.target.value);
                    setAnalysisError(null);
                  }}
                  placeholder="https://github.com/owner/repository"
                  className="h-11 flex-1 w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-4 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#144D34]"
                />
                <button
                  type="submit"
                  disabled={isAnalyzing || !gitUrl.trim()}
                  className="h-11 px-6 rounded-xl bg-[#144D34] hover:bg-[#0E3624] text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Cloning & Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Git Repo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {analysisError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{analysisError}</span>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Display Project Analysis Results (If ZIP or Git was analyzed) */}
      {analysisResult && (workflow === 'zip' || workflow === 'git') && (
        <section className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#14231B]">
                  Project Codebase Analysis: {analysisResult.project_name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E9F7EF] text-[#144D34] text-xs font-bold uppercase tracking-wider">
                  {analysisResult.source_type}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Scanned {analysisResult.files_scanned} files across repository.
              </p>
            </div>

            {analysisResult.workload_analysis?.confidence && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E7EFEA] text-[#144D34] text-xs font-semibold">
                <span>Inference Confidence:</span>
                <strong className="uppercase font-bold">
                  {analysisResult.workload_analysis.confidence}
                </strong>
              </div>
            )}
          </div>

          {/* Key Inferred Signals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Inferred Application Type */}
            <div className="p-4 rounded-2xl bg-[#F7F9F8] border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Application Type
              </span>
              <p className="text-base font-extrabold text-[#144D34]">
                {analysisResult.workload_analysis?.application_type || 'Unclassified / General'}
              </p>
              <span className="text-[11px] text-slate-500">
                {analysisResult.workload_analysis?.application_type
                  ? 'Inferred from source signals'
                  : 'Needs manual selection'}
              </span>
            </div>

            {/* Architecture Complexity */}
            <div className="p-4 rounded-2xl bg-[#F7F9F8] border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Architecture Complexity
              </span>
              <p className="text-base font-extrabold text-[#112419]">
                {analysisResult.workload_analysis?.architecture_complexity || 'Standard'}
              </p>
              <span className="text-[11px] text-slate-500">
                {analysisResult.static_analysis?.api_endpoint_count ?? 0} API Endpoints Scanned
              </span>
            </div>

            {/* Containerization */}
            <div className="p-4 rounded-2xl bg-[#F7F9F8] border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Containers & Orchestration
              </span>
              <p className="text-base font-extrabold text-[#112419]">
                {analysisResult.workload_analysis?.containerized ? 'Dockerized' : 'Baremetal / Non-Docker'}
              </p>
              <span className="text-[11px] text-slate-500">
                {analysisResult.workload_analysis?.orchestrated ? 'Kubernetes active' : 'Standalone service'}
              </span>
            </div>

            {/* Databases & Services */}
            <div className="p-4 rounded-2xl bg-[#F7F9F8] border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Databases & Cache
              </span>
              <p className="text-base font-extrabold text-[#112419]">
                {analysisResult.static_analysis?.databases_detected?.length
                  ? analysisResult.static_analysis.databases_detected.join(', ')
                  : 'None Detected'}
              </p>
              <span className="text-[11px] text-slate-500">
                {analysisResult.static_analysis?.redis_detected ? 'Redis detected' : 'Standard I/O'}
              </span>
            </div>
          </div>

          {/* Tech Stack Chips */}
          <div className="space-y-3 pt-2">
            <div>
              <span className="text-xs font-bold text-gray-700 block mb-1.5">Languages Detected</span>
              <div className="flex flex-wrap gap-1.5">
                {(analysisResult.static_analysis?.languages || []).map((lang) => (
                  <span
                    key={lang}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-800"
                  >
                    {lang}{' '}
                    {analysisResult.static_analysis?.language_file_counts?.[lang]
                      ? `(${analysisResult.static_analysis.language_file_counts[lang]} files)`
                      : ''}
                  </span>
                ))}
              </div>
            </div>

            {analysisResult.static_analysis?.frameworks &&
              analysisResult.static_analysis.frameworks.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1.5">Frameworks & Libraries</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.static_analysis.frameworks.map((fw) => (
                      <span
                        key={fw}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#E9F7EF] text-[#144D34]"
                      >
                        {fw}
                      </span>
                    ))}
                    {(analysisResult.static_analysis?.ml_libraries_detected || []).map((ml) => (
                      <span
                        key={ml}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                      >
                        ML: {ml}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Collapsible Evidence Section */}
          {analysisResult.workload_analysis?.evidence &&
            analysisResult.workload_analysis.evidence.length > 0 && (
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="w-full flex items-center justify-between p-3.5 bg-[#F7F9F8] hover:bg-[#F0F3F1] transition text-xs font-bold text-gray-800"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#144D34]" />
                    <span>View Grounded Model Evidence ({analysisResult.workload_analysis.evidence.length} citations)</span>
                  </span>
                  {showEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showEvidence && (
                  <div className="p-4 bg-white space-y-2 text-xs text-gray-700 max-h-60 overflow-y-auto">
                    {analysisResult.workload_analysis.evidence.map((item, idx) => {
                      if (typeof item === 'string') {
                        return (
                          <div key={idx} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                            • {item}
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-1">
                          <div className="font-mono text-[11px] font-bold text-[#144D34]">
                            {item.file || 'Repository citation'}
                          </div>
                          {item.quote && (
                            <blockquote className="italic text-gray-600 pl-2 border-l-2 border-[#144D34]">
                              "{item.quote}"
                            </blockquote>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          {/* Raw Static Analysis View (Accordion) */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRawStatic(!showRawStatic)}
              className="w-full flex items-center justify-between p-3.5 bg-[#F7F9F8] hover:bg-[#F0F3F1] transition text-xs font-bold text-gray-800"
            >
              <span className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#144D34]" />
                <span>Raw Static Analysis Report</span>
              </span>
              {showRawStatic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRawStatic && (
              <div className="p-4 bg-[#0d141e] text-[#a5d6a7] font-mono text-[11px] max-h-72 overflow-y-auto">
                <pre>{JSON.stringify(analysisResult.static_analysis, null, 2)}</pre>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Middle Grid: Workload Specifications Form + Billing Breakdown / Optimal VM */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Workload Inputs Console (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[28px] p-6 border border-slate-200/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E9F7EF] text-[#144D34] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#14231B]">Workload Specifications</h3>
                  <p className="text-xs text-slate-400">Parameters fed to backend /api/predict</p>
                </div>
              </div>

              {analysisResult?.workload_analysis?.application_type && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#DCF2E4] text-[#144D34]">
                  Inferred from code
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit(onSubmitPrediction)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Application Type</label>
                <select
                  {...register('application_type')}
                  className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#144D34]"
                >
                  {APPLICATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Users/Day</label>
                  <input
                    type="number"
                    {...register('expected_users_per_day')}
                    min={1}
                    max={100000000}
                    className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#144D34]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Peak Concurrent Users</label>
                  <input
                    type="number"
                    {...register('concurrent_users')}
                    min={1}
                    max={5000000}
                    className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#144D34]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Storage Required (GB)</label>
                <input
                  type="number"
                  {...register('storage_required_gb')}
                  min={1}
                  max={5000000}
                  className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#144D34]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Deployment Region</label>
                  <select
                    {...register('deployment_region')}
                    className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#144D34]"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Traffic Pattern</label>
                  <select
                    {...register('traffic_pattern')}
                    className="w-full bg-[#F7F9F8] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#144D34]"
                  >
                    {TRAFFIC_PATTERNS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {predictionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{predictionError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPredicting}
                className="w-full py-3 rounded-full bg-[#144D34] hover:bg-[#0E3624] text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
              >
                {isPredicting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Predict Resources and Optimize Cost </span>
              </button>
            </form>
          </div>
        </div>

        {/* Optimal VM Recommendation Card & Pill Chart (4 cols) */}
        <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
          {/* Optimal Instance Card */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#144D34] to-[#103D2A] p-6 text-white shadow-xl shadow-emerald-950/15">
            <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#86D1A6]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Recommended Instance</h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-[#6bff8f]">
                Cheapest Fit
              </span>
            </div>

            {result ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <span className="text-[11px] text-[#B8E5CA]">Provider</span>
                    <p className="text-xl font-bold text-white mt-0.5">{result.cloud_provider || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#B8E5CA]">Instance Type</span>
                    <p className="text-xl font-bold text-[#6bff8f] font-mono mt-0.5">
                      {result.recommended_vm || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/25 text-xs flex items-center justify-between text-[#DCF2E4]">
                  <span>Rate: <strong>${(result.price_per_hour_usd ?? 0).toFixed(4)}/hr</strong></span>
                  <span>Month: <strong>${(result.monthly_cost_usd ?? 0).toFixed(2)}</strong></span>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-[#B8E5CA]/80">
                Submit specifications above to view optimal VM recommendation.
              </div>
            )}
          </div>

          {/* Dynamic Workload Run-Rate Cycle & Auto-Scaling Simulator */}
          <div className="bg-white rounded-[26px] p-5 border border-slate-200/70 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#144D34]" />
                  <span>Workload Run-Rate Cycle</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  {watchedTraffic} Traffic Pattern • Weekly Curve
                </span>
              </div>

              {/* Live Status Tag */}
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#E7EFEA] text-[#144D34]">
                {!hasPrediction
                  ? 'Awaiting Input'
                  : savingsStrategy === 'auto_schedule'
                    ? `-${activeProfile.savingsAutoPct}% Auto`
                    : savingsStrategy === 'reserved'
                      ? '-32% Reserved'
                      : 'On-Demand'}
              </span>
            </div>

            {/* Strategy Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#EEF2EF] p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSavingsStrategy('on_demand')}
                className={`py-1 px-1.5 rounded-lg transition-all ${
                  savingsStrategy === 'on_demand'
                    ? 'bg-white text-[#0E3624] shadow-xs'
                    : 'text-[#606E66] hover:text-[#11241A]'
                }`}
              >
                On-Demand
              </button>
              <button
                type="button"
                onClick={() => setSavingsStrategy('auto_schedule')}
                className={`py-1 px-1.5 rounded-lg transition-all ${
                  savingsStrategy === 'auto_schedule'
                    ? 'bg-white text-[#0E3624] shadow-xs'
                    : 'text-[#606E66] hover:text-[#11241A]'
                }`}
              >
                Auto-Scale
              </button>
              <button
                type="button"
                onClick={() => setSavingsStrategy('reserved')}
                className={`py-1 px-1.5 rounded-lg transition-all ${
                  savingsStrategy === 'reserved'
                    ? 'bg-white text-[#0E3624] shadow-xs'
                    : 'text-[#606E66] hover:text-[#11241A]'
                }`}
              >
                1-Yr Plan
              </button>
            </div>

            {/* Dynamic Pill Bars */}
            <div className="pt-2">
              <div className="flex items-end justify-between px-1.5 h-28">
                {activeProfile.days.map((item, idx) => {
                  const dayLoad = hasPrediction ? Math.round(item.pct * strategyMultiplier) : 0;
                  const dayCost = hasPrediction
                    ? Number(
                        (dailyBase * (item.pct / 75) * strategyMultiplier).toFixed(2)
                      )
                    : 0;
                  const isHovered = hoveredDay?.name === item.name;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() =>
                        setHoveredDay({ name: item.name, cost: dayCost, load: dayLoad })
                      }
                      onMouseLeave={() => setHoveredDay(null)}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer relative"
                    >
                      {/* Day Load Bar */}
                      <div className="w-8 h-20 bg-slate-100 rounded-full flex flex-col justify-end p-0.5 relative overflow-hidden">
                        <div
                          style={{
                            height: hasPrediction ? `${Math.max(22, Math.min(100, dayLoad))}%` : '8%',
                          }}
                          className={`w-full rounded-full transition-all duration-300 ${
                            !hasPrediction
                              ? 'bg-slate-200'
                              : savingsStrategy === 'auto_schedule' &&
                                (item.day === 'Sun' || item.day === 'Sat')
                                ? 'bg-[#86D1A6]'
                                : dayLoad >= 85
                                  ? 'bg-[#144D34]'
                                  : dayLoad >= 60
                                    ? 'bg-[#207C4A]'
                                    : 'bg-[#52B87F]'
                          } ${isHovered && hasPrediction ? 'ring-2 ring-[#144D34]/40' : ''}`}
                        ></div>
                      </div>

                      {/* Day label */}
                      <span
                        className={`text-[10px] font-bold ${
                          isHovered && hasPrediction ? 'text-[#144D34]' : 'text-slate-400'
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Info Line */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                {!hasPrediction ? (
                  <span className="text-slate-400 font-medium italic">
                    Submit specifications above to simulate weekly run-rate
                  </span>
                ) : hoveredDay ? (
                  <span className="text-[#144D34] font-bold">
                    {hoveredDay.name}: ~${hoveredDay.cost}/day ({hoveredDay.load}% load)
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium">
                    {savingsStrategy === 'on_demand'
                      ? 'Baseline 24/7 on-demand execution'
                      : savingsStrategy === 'auto_schedule'
                        ? `Est. savings: ~$${estimatedSavings}/mo off-peak`
                        : `Est. savings: ~$${estimatedSavings}/mo commitment`}
                  </span>
                )}

                <span className="font-mono font-bold text-[#144D34]">
                  ${simulatedMonthly.toFixed(2)}/mo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Cost Breakdown Card (3 cols) */}
        <div className="lg:col-span-3 bg-[#0B2519] rounded-[28px] p-6 text-white flex flex-col justify-between shadow-xl shadow-emerald-950/20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <svg className="w-full h-full object-cover" preserveAspectRatio="none" viewBox="0 0 300 300">
              <path d="M0,80 C100,200 200,50 300,180 L300,300 L0,300 Z" fill="#144D34"></path>
              <path d="M0,140 C80,240 180,90 300,220 L300,300 L0,300 Z" fill="#207C4A" opacity="0.5"></path>
            </svg>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#86D1A6]" />
                <span className="text-[13px] font-bold text-white tracking-wide">Cost Breakdown</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#144D34] text-[#B8E5CA]">
                {multiplier.toFixed(2)}x {watchedRegion}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[#DCF2E4]">
              <div className="flex justify-between items-center p-2 rounded-xl bg-black/20">
                <span className="text-[#86D1A6] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  Compute (720h):
                </span>
                <span className="font-mono font-bold text-white">${computeMonthly.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-xl bg-black/20">
                <span className="text-[#86D1A6] flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  Storage ({watchedStorage}GB):
                </span>
                <span className="font-mono font-bold text-white">${storageMonthly.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-xl bg-black/20">
                <span className="text-[#86D1A6] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Multiplier:
                </span>
                <span className="font-mono font-bold text-white">{multiplier.toFixed(2)}x</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#86D1A6]">Total Monthly:</span>
                <span className="text-2xl font-bold text-[#6bff8f]">${totalMonthly.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1 text-[11px] text-[#DCF2E4]/80">
                <span>Annualized (12m):</span>
                <span className="font-semibold text-white">${yearlyCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-center mt-4">
            <span className="text-[10px] text-[#B8E5CA]/70 font-semibold uppercase tracking-widest">
              Formula: Compute + SSD Storage ($0.10/GB)
            </span>
          </div>
        </div>
      </section>

      {/* Top 4 KPI Metrics Row (Shown when result is available) */}
      {result && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#112419]">Optimization Recommendations</h3>
            <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Inference Complete
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Predicted Compute */}
            <div className="relative bg-gradient-to-br from-[#144D34] to-[#103D2A] text-white rounded-[26px] p-6 flex flex-col justify-between shadow-lg shadow-emerald-950/10 min-h-[160px] overflow-hidden">
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold text-[#DCF2E4]/90">Predicted Compute</span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-[#B8E5CA]" />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold tracking-tight mt-2 text-white">
                  {result.predicted_vcpu}{' '}
                  <span className="text-xl font-medium text-[#B8E5CA]">vCPUs</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2 py-0.5 rounded-md bg-[#256847] text-[#B8E5CA]">
                    <span>ML Model Inferred</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Predicted Memory */}
            <div className="bg-white rounded-[26px] p-6 flex flex-col justify-between border border-slate-200/70 shadow-sm min-h-[160px]">
              <div className="flex items-start justify-between">
                <span className="text-sm font-bold text-[#35483E]">Predicted Memory</span>
                <div className="w-8 h-8 rounded-full bg-[#E9F7EF] flex items-center justify-center text-[#144D34]">
                  <Server className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-[#112419] tracking-tight mt-2">
                  {result.predicted_ram_gb}{' '}
                  <span className="text-xl font-medium text-slate-400">GB RAM</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2 py-0.5 rounded-md bg-[#E8F5EE] text-[#1A633C]">
                    <span>Peak Concurrency Fit</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Hourly Instance Price */}
            <div className="bg-white rounded-[26px] p-6 flex flex-col justify-between border border-slate-200/70 shadow-sm min-h-[160px]">
              <div className="flex items-start justify-between">
                <span className="text-sm font-bold text-[#35483E]">Hourly Compute Rate</span>
                <div className="w-8 h-8 rounded-full bg-[#E9F7EF] flex items-center justify-center text-[#144D34]">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-[#112419] tracking-tight mt-2">
                  ${(result.price_per_hour_usd ?? 0).toFixed(4)}
                  <span className="text-sm font-medium text-slate-400 ml-1">/ hr</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[12px] text-[#7B8B81] font-semibold">
                    {result.cloud_provider} • {result.recommended_vm}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Monthly Projected Cost */}
            <div className="bg-white rounded-[26px] p-6 flex flex-col justify-between border border-slate-200/70 shadow-sm min-h-[160px]">
              <div className="flex items-start justify-between">
                <span className="text-sm font-bold text-[#35483E]">Estimated Monthly Cost</span>
                <div className="w-8 h-8 rounded-full bg-[#E9F7EF] flex items-center justify-center text-[#144D34]">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-[#144D34] tracking-tight mt-2">
                  ${(result.monthly_cost_usd ?? 0).toFixed(2)}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[12px] text-[#7B8B81] font-medium">
                    Annual: <strong>${(result.yearly_cost_usd ?? 0).toFixed(2)} / yr</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom Section: Multi-Cloud VM Comparison Table */}
      {comparisons.length > 0 && result && (
        <section className="bg-white rounded-[28px] p-6 border border-slate-200/70 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">Multi-Cloud Instance Suitability Matrix</h3>
              <p className="text-xs text-slate-400">
                Evaluated across AWS, Azure, and GCP catalogs for {result.predicted_vcpu} vCPU & {result.predicted_ram_gb} GB RAM
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#E9F7EF] text-[#144D34]">
              Algorithm: Cheapest Regional Fit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Cloud Provider</th>
                  <th className="px-4 py-3">Instance Type</th>
                  <th className="px-4 py-3">Compute Capacity</th>
                  <th className="px-4 py-3">Base Price/Hour</th>
                  <th className="px-4 py-3">Regional Adjusted Rate</th>
                  <th className="px-4 py-3">Estimated Monthly</th>
                  <th className="px-4 py-3 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {comparisons.map((c) => (
                  <tr key={c.provider + c.vm_type} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${c.provider === 'AWS'
                          ? 'bg-amber-500'
                          : c.provider === 'Azure'
                            ? 'bg-sky-500'
                            : 'bg-emerald-500'
                          }`}
                      ></span>
                      <span>{c.provider}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#144D34]">{c.vm_type}</td>
                    <td className="px-4 py-3">
                      {c.vcpu} vCPU / {c.ram_gb} GB RAM
                    </td>
                    <td className="px-4 py-3">${c.price_per_hour.toFixed(4)}/hr</td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      ${c.regional_price_per_hour.toFixed(4)}/hr
                    </td>
                    <td className="px-4 py-3 font-bold text-[#144D34]">
                      ${(c.regional_price_per_hour * 720 + storageMonthly).toFixed(2)}/mo
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.is_cheapest ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E9F7EF] text-[#144D34]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                          Selected Optimal VM
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Alternative Fit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Guide Card When No Prediction Has Been Run */}
      {!result && !isPredicting && (
        <section className="bg-white rounded-[28px] p-8 border border-slate-200/70 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E9F7EF] text-[#144D34] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">Ready to Optimize Cloud Resources</h4>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
              Choose your workflow above (Manual Input, Upload ZIP, or GitHub Repository) to analyze application architecture and predict right-sized cloud compute and storage specifications.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-3xl mx-auto pt-2">
            <div className="p-4 rounded-2xl bg-[#F7F9F8] border border-slate-200/60 text-xs">
              <strong className="text-[#144D34] block mb-1">1. Static & AI Analysis</strong>
              Automatically scans codebase languages, frameworks, dockerfiles, and database patterns.
            </div>
            <div className="p-4 rounded-2xl bg-[#F7F9F8] border border-slate-200/60 text-xs">
              <strong className="text-[#144D34] block mb-1">2. ML Right-Sizing</strong>
              Machine learning models infer vCPU and RAM requirements based on expected concurrency.
            </div>
            <div className="p-4 rounded-2xl bg-[#F7F9F8] border border-slate-200/60 text-xs">
              <strong className="text-[#144D34] block mb-1">3. Cross-Cloud Pricing</strong>
              Real-time regional catalog matching across AWS, Azure, and GCP for lowest cost.
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
