"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/store/auth-store";
import { LoadingSpinner } from "@/components/ui/loading";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, hasPermission, hasAnyRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If still loading auth state, wait
      if (isLoading) return;

      // If not authenticated, redirect to login
      if (!isAuthenticated || !user) {
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('redirect', pathname);
        router.push(loginUrl.toString());
        return;
      }

      // Check required permissions
      if (requiredPermissions.length > 0) {
        const hasRequiredPermissions = requiredPermissions.every(permission => 
          hasPermission(permission)
        );

        if (!hasRequiredPermissions) {
          // User doesn't have required permissions
          console.warn(`Access denied: Missing required permissions: ${requiredPermissions.join(', ')}`);
          // You might want to redirect to an unauthorized page or show a message
          return;
        }
      }

      // Check required roles
      if (requiredRoles.length > 0) {
        const hasRequiredRoles = hasAnyRole(requiredRoles);

        if (!hasRequiredRoles) {
          // User doesn't have required roles
          console.warn(`Access denied: Missing required roles: ${requiredRoles.join(', ')}`);
          // You might want to redirect to an unauthorized page or show a message
          return;
        }
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [user, isAuthenticated, isLoading, hasPermission, hasAnyRole, requiredPermissions, requiredRoles, router, pathname]);

  // Show loading spinner while checking authentication and permissions
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is not authenticated or doesn't have required permissions/roles, show fallback
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You need to be logged in to access this page.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check permissions and roles again for rendering
  if (requiredPermissions.length > 0 && !requiredPermissions.every(permission => hasPermission(permission))) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Insufficient Permissions</h2>
          <p className="text-gray-600 mb-4">
            You don't have the required permissions to access this page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Insufficient Role</h2>
          <p className="text-gray-600 mb-4">
            You don't have the required role to access this page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// HOC for easier usage
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredPermissions?: string[];
    requiredRoles?: string[];
  }
) {
  const AuthenticatedComponent = (props: P) => (
    <ProtectedRoute
      requiredPermissions={options?.requiredPermissions}
      requiredRoles={options?.requiredRoles}
    >
      <Component {...props} />
    </ProtectedRoute>
  );

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}