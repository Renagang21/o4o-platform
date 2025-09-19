import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

export interface TemplatePartBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  innerBlocks?: TemplatePartBlock[];
}

export interface TemplatePart {
  id: string;
  name: string;
  slug: string;
  description?: string;
  area: 'header' | 'footer' | 'sidebar' | 'general';
  content: TemplatePartBlock[];
  settings?: {
    containerWidth?: 'full' | 'wide' | 'narrow';
    backgroundColor?: string;
    textColor?: string;
    padding?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
    customCss?: string;
  };
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  conditions?: {
    pages?: string[];
    postTypes?: string[];
    categories?: string[];
    userRoles?: string[];
  };
}

interface UseTemplatePartsOptions {
  area: 'header' | 'footer' | 'sidebar' | 'general';
  context?: {
    pageId?: string;
    postType?: string;
    categories?: string[];
    userRole?: string;
  };
}

export function useTemplateParts({ area, context }: UseTemplatePartsOptions) {
  const [templateParts, setTemplateParts] = useState<TemplatePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplateParts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        if (context) {
          params.append('context', JSON.stringify(context));
        }

        const response = await authClient.api.get(
          `/template-parts/area/${area}/active?${params.toString()}`
        );

        if (response.status === 200) {
          // Handle both old and new API response structures
          const data = response.data;
          if (data && typeof data === 'object' && 'success' in data) {
            // New structure: {success: true, data: [...], count: N}
            if (data.success) {
              setTemplateParts(data.data || []);
            } else {
              throw new Error(data.error || 'Failed to fetch template parts');
            }
          } else if (Array.isArray(data)) {
            // Old structure: direct array
            setTemplateParts(data);
          } else {
            // Fallback for other structures
            setTemplateParts([]);
          }
        } else {
          throw new Error('Failed to fetch template parts');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateParts();
  }, [area, context?.pageId, context?.postType, context]);

  return { templateParts, loading, error };
}

// Hook for fetching a single template part
export function useTemplatePart(identifier: string) {
  const [templatePart, setTemplatePart] = useState<TemplatePart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }

    const fetchTemplatePart = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await authClient.api.get(`/template-parts/${identifier}`);

        if (response.status === 200) {
          // Handle both old and new API response structures
          const data = response.data;
          if (data && typeof data === 'object' && 'success' in data) {
            // New structure: {success: true, data: {...}}
            if (data.success) {
              setTemplatePart(data.data || null);
            } else {
              throw new Error(data.error || 'Failed to fetch template part');
            }
          } else if (data && typeof data === 'object') {
            // Old structure: direct object
            setTemplatePart(data);
          } else {
            // Fallback
            setTemplatePart(null);
          }
        } else {
          throw new Error('Failed to fetch template part');
        }
      } catch (err) {
    // Error logging - use proper error handler
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTemplatePart(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplatePart();
  }, [identifier]);

  return { templatePart, loading, error };
}