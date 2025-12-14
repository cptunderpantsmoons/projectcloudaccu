import type { z } from 'zod';
import type { User, UserRole, Permission } from '@accu/shared';

// Extended types for frontend-specific needs
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];
  roles: UserRole[];
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form state types
export interface FormState {
  isSubmitting: boolean;
  errors: Record<string, string>;
  touchedFields: Set<string>;
}

// UI state types
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  modals: Record<string, boolean>;
  loading: Record<string, boolean>;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: keyof T, order: 'asc' | 'desc') => void;
  onRowClick?: (record: T) => void;
  className?: string;
}

// Navigation types
export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  permission?: Permission;
  children?: NavigationItem[];
}

// Search and filter types
export interface SearchFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: any;
}

// Export commonly used types
export type { User, UserRole, Permission } from '@accu/shared';