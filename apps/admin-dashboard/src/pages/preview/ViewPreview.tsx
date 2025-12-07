/**
 * Admin Dashboard - View Preview Page
 *
 * Renders CMS views in the same domain to avoid cross-origin issues
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

// Import Main Site's ViewRenderer logic
interface ViewSchema {
  viewId: string;
  meta?: any;
  layout: {
    type: string;
    props?: Record<string, any>;
  };
  components: Array<{
    type: string;
    props?: Record<string, any>;
    if?: any;
    loop?: any;
  }>;
}

export default function ViewPreview() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') === '1';

  const [view, setView] = useState<ViewSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const loadView = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch view from Main Site API
        // Use VITE_API_BASE_URL (without /api/v1 suffix) to avoid duplication
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        const response = await fetch(`${apiBaseUrl}/api/v1/cms/public/view/${slug}`, {
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch view: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.data?.view) {
          throw new Error('View not found');
        }

        // Adapt CMS view to ViewSchema format
        const cmsView = result.data.view;
        const viewSchema: ViewSchema = {
          viewId: cmsView.slug,
          meta: {
            title: cmsView.name,
            description: cmsView.description,
          },
          layout: {
            type: 'DefaultLayout',
            props: {},
          },
          components: cmsView.schema.components || [],
        };

        setView(viewSchema);
      } catch (err: any) {
        console.error('[ViewPreview] Error loading view:', err);
        setError(err.message || 'Failed to load view');
      } finally {
        setLoading(false);
      }
    };

    loadView();
  }, [slug, preview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-gray-600">Loading preview...</div>
        </div>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">Preview Error</div>
          <div className="text-gray-600">{error || 'View not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Render view components */}
      <ViewComponentRenderer components={view.components} />
    </div>
  );
}

/**
 * Simple component renderer for preview
 */
function ViewComponentRenderer({ components }: { components: any[] }) {
  return (
    <div className="container mx-auto p-4">
      {components.map((component, index) => (
        <ComponentRenderer key={index} component={component} />
      ))}
    </div>
  );
}

/**
 * Render individual component based on type
 */
function ComponentRenderer({ component }: { component: any }) {
  const { type, props = {} } = component;

  switch (type) {
    case 'Text':
      return <TextBlock {...props} />;

    default:
      return (
        <div className="p-4 bg-gray-100 border border-gray-300 rounded my-2">
          <p className="text-sm text-gray-600">
            Component type "{type}" not yet implemented in preview
          </p>
        </div>
      );
  }
}

/**
 * Text Block Component
 */
interface TextBlockProps {
  text?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

function TextBlock({
  text = '',
  size = 'base',
  align = 'left',
  color,
  weight = 'normal',
}: TextBlockProps) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const className = `${sizeClasses[size]} ${alignClasses[align]} ${weightClasses[weight]}`;
  const style: React.CSSProperties = color ? { color } : {};

  return (
    <p className={className} style={style}>
      {text}
    </p>
  );
}
