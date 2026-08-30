/**
 * HeatIQ Backend API Client
 * Connects the frontend UI to the FortyGuard / HeatIQ Decision Agent Backend
 */

export interface AskRequest {
  question: string;
}

export interface ToolCallTrace {
  step: number;
  tool_name: string;
  tool_input: Record<string, any>;
  tool_output: any;
  error?: string | null;
}

export interface AskResponse {
  decision: 'Safe' | 'Caution' | 'Unsafe' | 'Unknown';
  reasoning: string;
  data_used: Record<string, any>;
  trace: ToolCallTrace[];
  raw_final_text?: string | null;
}

export interface AlertsStatusResponse {
  last_check: string | null;
  minutes_ago: number | null;
  tracked_count: number;
  unsafe_locations: string[];
}

export interface HeatSnapshot {
  lat: number;
  lon: number;
  temperature_c: number;
  heat_index_c: number;
  relative_humidity_pct?: number;
  status: 'nominal' | 'warning' | 'critical';
  surface_temp_c?: number;
  wbgt_c?: number;
  solar_flux_wm2?: number;
}

export interface ScoredRoute {
  route_id: string;
  distance_m: number;
  duration_s: number;
  avg_temperature_c: number;
  avg_heat_index_c: number;
}

export interface RouteScoreResponse {
  recommended_route?: ScoredRoute | null;
  all_routes_scored: ScoredRoute[];
  reasoning?: string;
  error?: string;
}

export class HeatIQApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Default to the internal proxy endpoint or local python server
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async checkHealth(): Promise<{ status: string; backend: string }> {
    const res = await fetch(`${this.baseUrl}/api/backend/health`, { method: 'GET' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Backend health check failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    return { status: data.status || 'ok', backend: 'live' };
  }

  async askAgent(question: string): Promise<AskResponse> {
    const res = await fetch(`${this.baseUrl}/api/backend/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Backend /ask failed: HTTP ${res.status}`);
    }

    return await res.json();
  }

  async getAlertsStatus(): Promise<AlertsStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/backend/alerts/status`, { method: 'GET' });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Backend /alerts/status failed: HTTP ${res.status}`);
    }

    return await res.json();
  }
}

export const api = new HeatIQApiClient();
