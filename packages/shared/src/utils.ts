import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';
import type { CalendarEvent, Priority } from './types';

// Date utilities
export const formatDate = (date: string | Date, formatStr = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
};

export const isOverdue = (dueDate: string | Date): boolean => {
  const dueDateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return isBefore(dueDateObj, new Date());
};

export const getDaysUntil = (date: string | Date): number => {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// String utilities
export const generateId = (): string => {
  return crypto.randomUUID();
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncate = (text: string, length = 100): string => {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// File utilities
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isPdfFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

// Calendar utilities
export const getEventPriority = (daysUntil: number): Priority => {
  if (daysUntil < 0) return 'critical';
  if (daysUntil <= 1) return 'high';
  if (daysUntil <= 7) return 'medium';
  return 'low';
};

export const shouldSendReminder = (event: CalendarEvent, daysBefore: number): boolean => {
  const daysUntil = getDaysUntil(event.startDate);
  return daysUntil === daysBefore && !isOverdue(event.startDate);
};

export const getUpcomingDeadlines = (events: CalendarEvent[], days = 30): CalendarEvent[] => {
  const cutoffDate = addDays(new Date(), days);
  
  return events
    .filter(event => event.type === 'deadline' || event.type === 'submission')
    .filter(event => {
      const eventDate = parseISO(event.startDate);
      return isAfter(eventDate, new Date()) && isBefore(eventDate, cutoffDate);
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
};

// ACCU-specific utilities
export const calculateACCUValue = (quantity: number, pricePerUnit: number): number => {
  return quantity * pricePerUnit;
};

export const validateACCUQuantity = (quantity: number): boolean => {
  return quantity > 0 && Number.isFinite(quantity);
};

export const formatACCUQuantity = (quantity: number): string => {
  return quantity.toLocaleString('en-AU', { maximumFractionDigits: 2 });
};

// Error handling utilities
export const createError = (code: string, message: string, details?: Record<string, any>) => {
  return {
    code,
    message,
    details,
  };
};

export const isApiError = (error: any): error is { code: string; message: string } => {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
};

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(null, args);
    }
  };
};

// Local storage utilities (for frontend)
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue || null;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Handle storage quota exceeded
      console.warn('LocalStorage quota exceeded');
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};

// URL utilities
export const buildApiUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  const url = new URL(endpoint, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
  
  return url.toString();
};

export const getQueryParams = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
};