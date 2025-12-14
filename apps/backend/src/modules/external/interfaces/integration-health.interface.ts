export interface IntegrationHealth {
  service: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latency?: number;
  lastCheck: string;
  message?: string;
  details?: any;
}

export interface IntegrationStatusResponse {
  overallStatus: 'UP' | 'DOWN' | 'DEGRADED';
  services: IntegrationHealth[];
  timestamp: string;
}
