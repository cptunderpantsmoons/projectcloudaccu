import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types';

class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor() {
    const configuredBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api' : '');

    if (!configuredBaseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is required at build/runtime.');
    }

    this.baseURL = configuredBaseUrl.replace(/\/$/, '');
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token if available
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling common errors
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized) - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  private getCSRFToken(): string | null {
    if (typeof window !== 'undefined') {
      return document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf_token='))
        ?.split('=')[1] || null;
    }
    return null;
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data.data;
      
      // Store new access token
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', accessToken);
      }

      return accessToken;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      return null;
    }
  }

  private handleAuthError() {
    // Clear auth data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Redirect to login
      window.location.href = '/login';
    }
  }

  private handleApiError(error: any) {
    if (error.response?.data) {
      const { code, message } = error.response.data.error || {};
      
      // Log error for debugging
      console.error('API Error:', {
        code,
        message,
        url: error.config?.url,
        method: error.config?.method,
      });

      // Handle specific error codes
      switch (code) {
        case 'FORBIDDEN':
          // Handle forbidden access
          break;
        case 'RATE_LIMIT_EXCEEDED':
          // Handle rate limiting
          break;
        case 'VALIDATION_ERROR':
          // Handle validation errors
          break;
        default:
          // Handle generic errors
          break;
      }
    }
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  // File upload
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.instance.post(url, formData, config);
    return response.data;
  }

  // Batch requests
  /**
   * Execute multiple API calls in parallel and return their `data` payloads.
   * If **any** request fails the whole batch rejects – matching typical
   * transactional UX and preserving a clean `T[]` return type.
   */
  async batch<T = unknown>(requests: Array<() => Promise<ApiResponse<T>>>): Promise<T[]> {
    const settled = await Promise.allSettled(requests.map((r) => r()));

    // Collect data or raise first error
    const data: T[] = [];
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      if (result.status === 'fulfilled') {
        data.push(result.value.data as T);
      } else {
        console.error(`Batch request ${i} failed:`, result.reason);
        throw result.reason;
      }
    }
    return data;
  }

  // Set auth tokens manually (useful for testing or manual login)
  setTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  // Clear auth tokens
  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  // Get current user info
  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  // Set current user info
  setCurrentUser(user: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;
