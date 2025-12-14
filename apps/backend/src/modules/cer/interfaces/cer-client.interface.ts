export interface CerApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export interface CerAuthToken {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface CerSubmissionResponse {
  success: boolean;
  referenceId: string;
  timestamp: string;
  status: string;
  message?: string;
  errors?: string[];
}
