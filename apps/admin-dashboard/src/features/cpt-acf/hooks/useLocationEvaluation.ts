/**
 * Location Evaluation Hook
 * React hook for evaluating location rules in the current context
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  evaluateLocationRules,
  shouldShowFieldGroup,
  buildLocationContext,
  type LocationContext,
} from '../utils/locationEvaluation';
import type { FieldLocation, FieldGroup } from '../types/acf.types';

interface UseLocationEvaluationOptions {
  // Current post/page context
  postType?: string;
  postId?: string;
  postStatus?: string;
  postFormat?: string;
  postTemplate?: string;
  categories?: string[];
  taxonomies?: Record<string, string[]>;

  // Page specific
  pageType?: 'front_page' | 'posts_page' | 'top_level' | 'parent' | 'child';
  pageTemplate?: string;
  pageParent?: string;
}

interface UseLocationEvaluationReturn {
  context: LocationContext;
  shouldShow: (location: FieldLocation[][] | undefined) => boolean;
  filterFieldGroups: (groups: FieldGroup[]) => FieldGroup[];
  evaluateRules: (rules: FieldLocation[][]) => boolean;
}

/**
 * Hook for evaluating location rules based on current context
 * Automatically includes current user information
 */
export function useLocationEvaluation(
  options: UseLocationEvaluationOptions = {}
): UseLocationEvaluationReturn {
  // Get current user from auth store
  const user = useAuthStore((state) => state.user);

  // Build location context with user info
  const context = useMemo<LocationContext>(() => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const userRole = user?.role || userRoles[0];

    return buildLocationContext({
      ...options,
      userId: user?.id,
      userRole,
      userRoles,
    });
  }, [options, user]);

  // Function to check if a field group should be shown
  const shouldShow = useMemo(
    () => (location: FieldLocation[][] | undefined) => {
      return shouldShowFieldGroup(location, context);
    },
    [context]
  );

  // Function to filter field groups based on location rules
  const filterFieldGroups = useMemo(
    () => (groups: FieldGroup[]) => {
      return groups.filter((group) => {
        // If group has no location rules, don't show it
        if (!group.location || group.location.length === 0) {
          return false;
        }

        // Evaluate location rules
        return shouldShowFieldGroup(group.location, context);
      });
    },
    [context]
  );

  // Function to evaluate location rules directly
  const evaluateRules = useMemo(
    () => (rules: FieldLocation[][]) => {
      return evaluateLocationRules(rules, context);
    },
    [context]
  );

  return {
    context,
    shouldShow,
    filterFieldGroups,
    evaluateRules,
  };
}

/**
 * Hook for getting field groups that match the current location
 * Automatically filters based on location rules
 */
export function useFieldGroupsByLocation(
  fieldGroups: FieldGroup[],
  options: UseLocationEvaluationOptions = {}
): FieldGroup[] {
  const { filterFieldGroups } = useLocationEvaluation(options);

  return useMemo(
    () => filterFieldGroups(fieldGroups),
    [fieldGroups, filterFieldGroups]
  );
}

export default useLocationEvaluation;
