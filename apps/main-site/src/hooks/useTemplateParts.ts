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
    subdomain?: string | null;
    path?: string;
    pathPrefix?: string | null;
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

        // Add subdomain and path for Backend filtering
        if (context?.subdomain) {
          params.append('subdomain', context.subdomain);
        }
        if (context?.path) {
          params.append('path', context.path);
        }

        // Add legacy context for backward compatibility
        if (context) {
          const legacyContext = {
            pageId: context.pageId,
            postType: context.postType,
            categories: context.categories,
            userRole: context.userRole
          };
          params.append('context', JSON.stringify(legacyContext));
        }

        // Fetching template parts for area

        const response = await authClient.api.get(
          `/template-parts/area/${area}/active?${params.toString()}`
        );

        if (response.status === 200) {
          // Handle both old and new API response structures
          const data = response.data;
          if (data && typeof data === 'object' && 'success' in data) {
            // New structure: {success: true, data: [...], count: N}
            if (data.success) {
              const templatePartsData = Array.isArray(data.data) ? data.data : [];
              setTemplateParts(templatePartsData);
            } else {
              throw new Error(data.error || 'Failed to fetch template parts');
            }
          } else if (Array.isArray(data)) {
            // Old structure: direct array
            setTemplateParts(data);
          } else if (data && data.error) {
            // Error response
            throw new Error(data.error);
          } else {
            // Fallback for other structures
            setTemplateParts([]);
          }
        } else {
          throw new Error('Failed to fetch template parts');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
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

        console.info('🔍 Fetching single template part:', {
          identifier,
          url: `/template-parts/${identifier}`
        });

        const response = await authClient.api.get(`/template-parts/${identifier}`);

        console.info('📡 Single template part API response:', {
          status: response.status,
          data_type: typeof response.data,
          has_success_prop: response.data && typeof response.data === 'object' && 'success' in response.data,
          data_keys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null
        });

        if (response.status === 200) {
          // Handle both old and new API response structures
          const data = response.data;
          if (data && typeof data === 'object' && 'success' in data) {
            // New structure: {success: true, data: {...}}
            console.info('📋 Using new API structure for single part');
            if (data.success) {
              console.info('✅ Template part loaded:', {
                id: data.data?.id,
                name: data.data?.name,
                area: data.data?.area
              });
              setTemplatePart(data.data || null);
            } else {
              throw new Error(data.error || 'Failed to fetch template part');
            }
          } else if (data && typeof data === 'object') {
            // Old structure: direct object
            console.info('📋 Using legacy API structure for single part');
            console.info('✅ Template part loaded:', {
              id: data.id,
              name: data.name,
              area: data.area
            });
            setTemplatePart(data);
          } else {
            // Fallback
            console.warn('⚠️ Unknown single template part response, falling back to null:', data);
            setTemplatePart(null);
          }
        } else {
          console.error('❌ HTTP error for single template part:', response.status);
          throw new Error('Failed to fetch template part');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Single template part fetch failed:', {
          identifier,
          error: errorMessage,
          error_type: err instanceof Error ? err.constructor.name : typeof err,
          stack: err instanceof Error ? err.stack : null
        });
        setError(errorMessage);
        setTemplatePart(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplatePart();
  }, [identifier]);

  return { templatePart, loading, error };
}