/**
 * useCapabilities Hook
 *
 * Thin wrapper around useAuth() providing a concise API for capability checks.
 * - Auth disabled → everything allowed (backwards-compatible)
 * - Admin → everything allowed (matches backend resolveCapabilities())
 * - Otherwise checks capabilities array from session
 */

import { useAuth } from '../contexts/AuthContext.js';
import { useCallback } from 'https://esm.sh/react@18.2.0';

/**
 * Map each view to the capability required to see its nav item.
 * null = always visible (no capability gate).
 */
export const VIEW_CAPABILITIES = {
  home: null,
  downloads: null,
  search: 'search',
  'search-results': 'search',
  history: 'view_history',
  shared: 'view_shared',
  uploads: 'view_uploads',
  categories: null,
  servers: 'view_servers',
  logs: 'view_logs',
  statistics: 'view_statistics',
};

export function useCapabilities() {
  const { authEnabled, isAdmin, capabilities } = useAuth();

  const hasCap = useCallback((...caps) => {
    if (!authEnabled) return true;
    if (isAdmin) return true;
    if (!Array.isArray(capabilities)) return false;
    return caps.every(c => capabilities.includes(c));
  }, [authEnabled, isAdmin, capabilities]);

  return { hasCap, isAdmin: !authEnabled || isAdmin, authEnabled };
}
