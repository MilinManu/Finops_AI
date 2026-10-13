import axios from 'axios';
import {
  PredictionRequest,
  PredictionResponse,
  BackendStatus,
  VMInstanceOption,
  ProjectAnalysisResponse,
  GitAnalysisRequest,
  HistoryItem,
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token automatically if stored
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Reusable-auth api alias
export const api = apiClient;

// VM catalog mirroring ml/vm_catalog.csv
export const VM_CATALOG = [
  { provider: 'AWS', region: 'asia-south', vm_type: 't3.medium', vcpu: 2, ram_gb: 4, price_per_hour: 0.0416 },
  { provider: 'AWS', region: 'asia-south', vm_type: 't3.xlarge', vcpu: 4, ram_gb: 8, price_per_hour: 0.1664 },
  { provider: 'AWS', region: 'asia-south', vm_type: 'c5.2xlarge', vcpu: 8, ram_gb: 16, price_per_hour: 0.3400 },
  { provider: 'AWS', region: 'asia-south', vm_type: 'c5.4xlarge', vcpu: 16, ram_gb: 32, price_per_hour: 0.6800 },
  { provider: 'Azure', region: 'asia-south', vm_type: 'B2s', vcpu: 2, ram_gb: 4, price_per_hour: 0.0500 },
  { provider: 'Azure', region: 'asia-south', vm_type: 'D2s_v3', vcpu: 2, ram_gb: 8, price_per_hour: 0.0960 },
  { provider: 'Azure', region: 'asia-south', vm_type: 'D4s_v3', vcpu: 4, ram_gb: 16, price_per_hour: 0.1920 },
  { provider: 'Azure', region: 'asia-south', vm_type: 'D8s_v3', vcpu: 8, ram_gb: 32, price_per_hour: 0.3840 },
  { provider: 'GCP', region: 'asia-south', vm_type: 'e2-medium', vcpu: 2, ram_gb: 4, price_per_hour: 0.0330 },
  { provider: 'GCP', region: 'asia-south', vm_type: 'n2-standard-4', vcpu: 4, ram_gb: 16, price_per_hour: 0.1940 },
  { provider: 'GCP', region: 'asia-south', vm_type: 'n2-standard-8', vcpu: 8, ram_gb: 32, price_per_hour: 0.3880 },

  { provider: 'AWS', region: 'us-east', vm_type: 't3.medium', vcpu: 2, ram_gb: 4, price_per_hour: 0.0416 },
  { provider: 'AWS', region: 'us-east', vm_type: 't3.xlarge', vcpu: 4, ram_gb: 8, price_per_hour: 0.1664 },
  { provider: 'AWS', region: 'us-east', vm_type: 'c5.2xlarge', vcpu: 8, ram_gb: 16, price_per_hour: 0.3400 },
  { provider: 'AWS', region: 'us-east', vm_type: 'c5.4xlarge', vcpu: 16, ram_gb: 32, price_per_hour: 0.6800 },
  { provider: 'Azure', region: 'us-east', vm_type: 'B2s', vcpu: 2, ram_gb: 4, price_per_hour: 0.0500 },
  { provider: 'Azure', region: 'us-east', vm_type: 'D2s_v3', vcpu: 2, ram_gb: 8, price_per_hour: 0.0960 },
  { provider: 'Azure', region: 'us-east', vm_type: 'D4s_v3', vcpu: 4, ram_gb: 16, price_per_hour: 0.1920 },
  { provider: 'Azure', region: 'us-east', vm_type: 'D8s_v3', vcpu: 8, ram_gb: 32, price_per_hour: 0.3840 },
  { provider: 'GCP', region: 'us-east', vm_type: 'e2-medium', vcpu: 2, ram_gb: 4, price_per_hour: 0.0330 },
  { provider: 'GCP', region: 'us-east', vm_type: 'n2-standard-4', vcpu: 4, ram_gb: 16, price_per_hour: 0.1940 },
  { provider: 'GCP', region: 'us-east', vm_type: 'n2-standard-8', vcpu: 8, ram_gb: 32, price_per_hour: 0.3880 },

  { provider: 'AWS', region: 'europe-west', vm_type: 't3.medium', vcpu: 2, ram_gb: 4, price_per_hour: 0.0416 },
  { provider: 'AWS', region: 'europe-west', vm_type: 't3.xlarge', vcpu: 4, ram_gb: 8, price_per_hour: 0.1664 },
  { provider: 'AWS', region: 'europe-west', vm_type: 'c5.2xlarge', vcpu: 8, ram_gb: 16, price_per_hour: 0.3400 },
  { provider: 'AWS', region: 'europe-west', vm_type: 'c5.4xlarge', vcpu: 16, ram_gb: 32, price_per_hour: 0.6800 },
  { provider: 'Azure', region: 'europe-west', vm_type: 'B2s', vcpu: 2, ram_gb: 4, price_per_hour: 0.0500 },
  { provider: 'Azure', region: 'europe-west', vm_type: 'D2s_v3', vcpu: 2, ram_gb: 8, price_per_hour: 0.0960 },
  { provider: 'Azure', region: 'europe-west', vm_type: 'D4s_v3', vcpu: 4, ram_gb: 16, price_per_hour: 0.1920 },
  { provider: 'Azure', region: 'europe-west', vm_type: 'D8s_v3', vcpu: 8, ram_gb: 32, price_per_hour: 0.3840 },
  { provider: 'GCP', region: 'europe-west', vm_type: 'e2-medium', vcpu: 2, ram_gb: 4, price_per_hour: 0.0330 },
  { provider: 'GCP', region: 'europe-west', vm_type: 'n2-standard-4', vcpu: 4, ram_gb: 16, price_per_hour: 0.1940 },
  { provider: 'GCP', region: 'europe-west', vm_type: 'n2-standard-8', vcpu: 8, ram_gb: 32, price_per_hour: 0.3880 },
] as const;

export const REGION_MULTIPLIERS: Record<string, number> = {
  'asia-south': 1.00,
  'us-east': 0.95,
  'europe-west': 1.10,
};

export const finopsApi = {
  // Check live FastAPI status at GET /
  async checkBackendHealth(): Promise<BackendStatus> {
    try {
      const res = await apiClient.get('/', { timeout: 3000 });
      return {
        status: 'online',
        message: res.data?.message || 'FastAPI service is online',
        url: API_BASE_URL,
      };
    } catch {
      return {
        status: 'offline',
        message: 'FastAPI backend not detected on port 8000',
        url: API_BASE_URL,
      };
    }
  },

  // Call the core ML inference endpoint POST /api/predict without hardcoded fallbacks
  async predictResources(payload: PredictionRequest): Promise<PredictionResponse> {
    const res = await apiClient.post<PredictionResponse>('/api/predict', payload, {
      timeout: 60000,
    });
    return res.data;
  },

  // Upload and analyze a project ZIP via POST /api/analyze/zip
  async analyzeZip(file: File): Promise<ProjectAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ProjectAnalysisResponse>('/api/analyze/zip', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 180000,
    });
    return res.data;
  },

  // Analyze a public Git repository via POST /api/analyze/git
  async analyzeGit(repositoryUrl: string): Promise<ProjectAnalysisResponse> {
    const body: GitAnalysisRequest = { repository_url: repositoryUrl.trim() };
    const res = await apiClient.post<ProjectAnalysisResponse>('/api/analyze/git', body, {
      timeout: 180000,
    });
    return res.data;
  },

  // Cross-cloud comparison for given vcpu, ram, and region based on catalog
  getCrossCloudComparison(vcpu: number, ram: number, region: string): VMInstanceOption[] {
    const multiplier = REGION_MULTIPLIERS[region] || 1.0;
    const regional = VM_CATALOG.filter((v) => v.region === region);
    const suitable = regional.filter((v) => v.vcpu >= vcpu && v.ram_gb >= ram);

    const providers = ['AWS', 'Azure', 'GCP'] as const;
    const comparison: VMInstanceOption[] = [];

    providers.forEach((p) => {
      const provSuitable = suitable.filter((s) => s.provider === p);
      if (provSuitable.length > 0) {
        const sorted = [...provSuitable].sort((a, b) => a.price_per_hour - b.price_per_hour);
        const best = sorted[0];
        comparison.push({
          provider: p,
          region: best.region,
          vm_type: best.vm_type,
          vcpu: best.vcpu,
          ram_gb: best.ram_gb,
          price_per_hour: best.price_per_hour,
          regional_price_per_hour: Number((best.price_per_hour * multiplier).toFixed(4)),
        });
      }
    });

    if (comparison.length > 0) {
      comparison.sort((a, b) => a.regional_price_per_hour - b.regional_price_per_hour);
      comparison[0].is_cheapest = true;
    }

    return comparison;
  },

  // User History API
  async getHistory(): Promise<HistoryItem[]> {
    const res = await apiClient.get<{ status: string; data: HistoryItem[] }>('/api/history');
    return res.data.data;
  },

  async saveHistory(payload: {
    type: string;
    title: string;
    summary: string;
    inputs: any;
    results: any;
  }): Promise<HistoryItem> {
    const res = await apiClient.post<{ status: string; data: HistoryItem }>('/api/history', payload);
    return res.data.data;
  },

  async deleteHistory(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ status: string; deleted: boolean }>(`/api/history/${id}`);
    return res.data.deleted;
  },

  async clearHistory(): Promise<boolean> {
    const res = await apiClient.delete<{ status: string; cleared: boolean }>('/api/history');
    return res.data.cleared;
  },
};

