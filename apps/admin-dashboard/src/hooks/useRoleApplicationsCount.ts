import { useEffect, useState, useRef } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@o4o/auth-context';

export const useRoleApplicationsCount = () => {
  // DISABLED: The /v2/admin/roles/metrics/pending endpoint does not exist
  // This hook was causing 404 errors on every page load
  // TODO: Implement the backend endpoint or remove this feature entirely
  return {
    count: 0,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve()
  };
};
