/**
 * useConditionalLogic Hook
 * React hook for managing conditional logic and field visibility
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CustomField, ConditionalLogic } from '../types/acf.types';
import {
  evaluateAllFields,
  hasCircularDependency,
  getFieldDependencies,
} from '../utils/conditionalLogic';

interface UseConditionalLogicProps {
  fields: CustomField[];
  fieldValues: Record<string, any>;
}

interface UseConditionalLogicReturn {
  fieldVisibility: Map<string, boolean>;
  isFieldVisible: (fieldName: string) => boolean;
  hasCircularDeps: boolean;
  circularFields: string[];
}

/**
 * Hook for managing conditional logic evaluation
 */
export function useConditionalLogic({
  fields,
  fieldValues,
}: UseConditionalLogicProps): UseConditionalLogicReturn {
  const [fieldVisibility, setFieldVisibility] = useState<Map<string, boolean>>(
    new Map()
  );

  // Build logic map from fields
  const fieldsLogic = useMemo(() => {
    const map = new Map<string, ConditionalLogic | undefined>();
    fields.forEach((field) => {
      map.set(field.name, field.conditionalLogic);
    });
    return map;
  }, [fields]);

  // Detect circular dependencies
  const { hasCircularDeps, circularFields } = useMemo(() => {
    const circular: string[] = [];
    let hasCircular = false;

    fields.forEach((field) => {
      if (field.conditionalLogic && field.conditionalLogic.enabled) {
        const isCircular = hasCircularDependency(
          field.name,
          field.conditionalLogic,
          fieldsLogic
        );
        if (isCircular) {
          hasCircular = true;
          circular.push(field.name);
        }
      }
    });

    return { hasCircularDeps: hasCircular, circularFields: circular };
  }, [fields, fieldsLogic]);

  // Re-evaluate field visibility when values change
  useEffect(() => {
    const visibility = evaluateAllFields(fieldsLogic, fieldValues);
    setFieldVisibility(visibility);
  }, [fieldsLogic, fieldValues]);

  // Helper function to check if a field is visible
  const isFieldVisible = useCallback(
    (fieldName: string): boolean => {
      // If no conditional logic, always visible
      if (!fieldVisibility.has(fieldName)) {
        return true;
      }
      return fieldVisibility.get(fieldName) || false;
    },
    [fieldVisibility]
  );

  return {
    fieldVisibility,
    isFieldVisible,
    hasCircularDeps,
    circularFields,
  };
}

/**
 * Hook for tracking field dependencies
 * Returns which fields the current field depends on
 */
export function useFieldDependencies(
  conditionalLogic: ConditionalLogic | undefined
): string[] {
  return useMemo(() => {
    return getFieldDependencies(conditionalLogic);
  }, [conditionalLogic]);
}

/**
 * Hook for optimized field value updates
 * Debounces updates to prevent excessive re-evaluations
 */
export function useDebouncedFieldValues(
  fieldValues: Record<string, any>,
  delay: number = 300
): Record<string, any> {
  const [debouncedValues, setDebouncedValues] = useState(fieldValues);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValues(fieldValues);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [fieldValues, delay]);

  return debouncedValues;
}

export default useConditionalLogic;
