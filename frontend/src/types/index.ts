export interface PredictionRequest {
  application_type: string;
  expected_users_per_day: number;
  concurrent_users: number;
  storage_required_gb: number;
  deployment_region: string;
  traffic_pattern: string;
}

export interface PredictionResponse {
  predicted_vcpu: number;
  predicted_ram_gb: number;
  cloud_provider?: string | null;
  recommended_vm?: string | null;
  price_per_hour_usd?: number | null;
  monthly_cost_usd?: number | null;
  yearly_cost_usd?: number | null;
}

export interface GitAnalysisRequest {
  repository_url: string;
}

export interface StaticAnalysisEvidence {
  fact?: string;
  file?: string;
}

export interface ApiEndpointItem {
  method?: string;
  path?: string;
  function?: string;
  file?: string;
}

export interface StaticAnalysis {
  project_root_name?: string;
  files_scanned: number;
  files_discovered?: number;
  file_scan_limit_reached?: boolean;
  languages?: string[];
  language_file_counts?: Record<string, number>;
  frameworks?: string[];
  api_endpoint_count?: number;
  api_endpoints?: ApiEndpointItem[];
  websocket_count?: number;
  databases_detected?: string[];
  redis_detected?: boolean;
  background_workers_detected?: boolean;
  dockerfile_detected?: boolean;
  docker_compose_service_count?: number;
  kubernetes_detected?: boolean;
  ml_libraries_detected?: string[];
  evidence?: StaticAnalysisEvidence[];
  files_sample?: string[];
  storage_required_gb?: number | null;
  storage_note?: string;
  workload_note?: string;
}

export interface WorkloadEvidenceItem {
  file?: string;
  quote?: string;
}

export interface WorkloadAnalysis {
  application_type?: string | null;
  confidence?: 'high' | 'medium' | 'low' | string;
  architecture_complexity?: string;
  database_intensity?: string;
  background_processing?: boolean | null;
  containerized?: boolean;
  orchestrated?: boolean;
  ml_workload_detected?: boolean;
  expected_users_per_day?: number | null;
  concurrent_users?: number | null;
  deployment_region?: string | null;
  storage_required_gb?: number | null;
  traffic_pattern?: string | null;
  evidence?: (string | WorkloadEvidenceItem)[];
  unknown_fields?: string[];
  status?: string;
  message?: string;
}

export interface ProjectAnalysisResponse {
  source_type: 'zip' | 'git';
  project_name: string;
  files_scanned: number;
  static_analysis: StaticAnalysis;
  workload_analysis?: WorkloadAnalysis | null;
}

export interface BackendStatus {
  status: 'online' | 'offline' | 'checking';
  message?: string;
  url: string;
}

export interface VMInstanceOption {
  provider: 'AWS' | 'Azure' | 'GCP';
  region: string;
  vm_type: string;
  vcpu: number;
  ram_gb: number;
  price_per_hour: number;
  regional_price_per_hour: number;
  is_cheapest?: boolean;
}

export interface HistoryItem {
  id: string;
  user_id?: string;
  type: 'prediction' | 'zip_analysis' | 'git_analysis';
  title: string;
  summary: string;
  inputs: any;
  results: any;
  created_at: string;
}

export * from './auth';

