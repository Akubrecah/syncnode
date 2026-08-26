import { useEffect, useRef, useState } from 'react';
import { roleHasPermission, AdminPermission, AdminRole } from '../types/admin';

export interface AdminSessionState {
  loading: boolean;
  isAuthorized: boolean;
  error: string | null;
  session: { userId: string; email: string; role: AdminRole } | null;
  refresh: () => Promise<void>;
}

/**
 * Resolves the administrator's authoritative role from the backend
 * (GET /api/v1/admin/session). The server remains the security boundary;
 * this only drives UI visibility.
 */
export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<Omit<AdminSessionState, 'refresh'>>({
    loading: true,
    isAuthorized: false,
    error: null,
    session: null
  });

  const checkSession = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const token = localStorage.getItem('syncnode_token');
    if (!token) {
      setState({ loading: false, isAuthorized: false, error: 'Authentication required. Please sign in with an administrative account.', session: null });
      return;
    }
    try {
      const res = await fetch('/api/v1/admin/session', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 403 || res.status === 401) {
        setState({ loading: false, isAuthorized: false, error: 'Access denied: your account does not hold an administrative role.', session: null });
        return;
      }
      if (!res.ok) throw new Error(`Session check failed (HTTP ${res.status})`);
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || 'Session check failed');
      setState({ loading: false, isAuthorized: true, error: null, session: json.session });
    } catch (err) {
      setState({
        loading: false,
        isAuthorized: false,
        error: `Cannot reach the admin service: ${err instanceof Error ? err.message : String(err)}`,
        session: null
      });
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return {
    ...state,
    refresh: checkSession
  };
}

export interface PermissionsApi {
  can: (permission: AdminPermission) => boolean;
  role: AdminRole | null;
}

export function useAdminPermissions(role: AdminRole | null): PermissionsApi {
  const canRef = useRef<(p: AdminPermission) => boolean>(() => false);
  canRef.current = (permission: AdminPermission) => (role ? roleHasPermission(role, permission) : false);
  return {
    can: (permission) => canRef.current(permission),
    role
  };
}
