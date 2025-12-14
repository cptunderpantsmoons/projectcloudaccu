import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User } from '@/types';
import { apiClient } from '@/lib/api-client';
import type { LoginRequest, AuthTokens } from '@accu/shared';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  checkAuthStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
      roles: [],

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });

        try {
          const response = await apiClient.post<AuthTokens>('/auth/login', credentials);
          
          if (response.success && response.data) {
            const { accessToken, refreshToken } = response.data;
            
            // Set tokens in API client
            apiClient.setTokens(accessToken, refreshToken);

            // Get user info after successful login
            const userResponse = await apiClient.get<User>('/auth/me');
            
            if (userResponse.success && userResponse.data) {
              const user = userResponse.data;
              
              // Store user in localStorage
              apiClient.setCurrentUser(user);
              
              // Extract permissions and roles from user
              const permissions = []; // This would come from the API
              const roles = user.roles;

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                permissions,
                roles,
              });
            }
          } else {
            throw new Error(response.error?.message || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        try {
          // Call logout API if needed
          apiClient.post('/auth/logout').catch(() => {
            // Ignore errors on logout
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }

        // Clear tokens and user data
        apiClient.clearTokens();
        
        set({
          user: null,
          isAuthenticated: false,
          permissions: [],
          roles: [],
        });
      },

      refreshAuth: async () => {
        try {
          const response = await apiClient.get<User>('/auth/me');
          
          if (response.success && response.data) {
            const user = response.data;
            apiClient.setCurrentUser(user);
            
            const permissions = []; // This would come from the API
            const roles = user.roles;

            set({
              user,
              isAuthenticated: true,
              permissions,
              roles,
            });
          } else {
            // Token might be invalid
            get().logout();
          }
        } catch (error) {
          console.error('Failed to refresh auth:', error);
          get().logout();
        }
      },

      updateUser: (user: User) => {
        apiClient.setCurrentUser(user);
        set({
          user,
          // Update roles and permissions if they changed
          roles: user.roles,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      checkAuthStatus: async () => {
        const currentUser = apiClient.getCurrentUser();
        const accessToken = typeof window !== 'undefined' 
          ? localStorage.getItem('access_token') 
          : null;

        if (currentUser && accessToken) {
          set({
            user: currentUser,
            isAuthenticated: true,
            roles: currentUser.roles,
          });
          
          // Verify token is still valid
          try {
            await get().refreshAuth();
          } catch (error) {
            // Token is invalid, user will be logged out
          }
        } else {
          // No valid auth state found
          set({
            user: null,
            isAuthenticated: false,
            permissions: [],
            roles: [],
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        roles: state.roles,
        // Don't persist permissions as they might change
        // Don't persist isAuthenticated as it needs verification
      }),
    }
  )
);

// Hook for accessing auth state with computed values
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    ...store,
    // Computed values
    hasPermission: (permission: string) => store.permissions.includes(permission as any),
    hasRole: (role: string) => store.roles.includes(role as any),
    hasAnyRole: (roles: string[]) => roles.some(role => store.roles.includes(role as any)),
    hasAllRoles: (roles: string[]) => roles.every(role => store.roles.includes(role as any)),
    isAdmin: () => store.roles.includes('admin') || store.roles.includes('super_admin'),
    isManager: () => store.roles.includes('manager') || store.isAdmin(),
  };
};