/** Preserved CMS V2 public preview; no private content API fallback. */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getViewPreviewUrl, previewStatusMessage, readPreviewComponents, type PreviewComponent } from './view-preview-data';

export default function ViewPreview() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') === '1';
  const [components, setComponents] = useState<PreviewComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setComponents([]);
    const loadView = async () => {
      try {
        const response = await fetch(getViewPreviewUrl(slug), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setError(previewStatusMessage(response.status));
          return;
        }
        const body: unknown = await response.json();
        if (controller.signal.aborted) return;
        try {
          setComponents(readPreviewComponents(body));
        } catch {
          setError('미리보기 응답 형식을 확인할 수 없습니다.');
        }
      } catch {
        if (!controller.signal.aborted) setError('미리보기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadView();
    return () => controller.abort();
  }, [slug, preview, retry]);

  if (!slug) {
    return <div role="alert" className="p-6 text-center">미리보기 주소를 확인해주세요.</div>;
  }
  if (loading) {
    return <div role="status" className="flex items-center justify-center min-h-screen bg-white">미리보기를 불러오는 중입니다.</div>;
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white p-6">
        <div className="text-center space-y-3">
          <h1 className="text-red-600 text-lg">미리보기를 표시할 수 없습니다</h1>
          <p role="alert" className="text-gray-600">{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="text-blue-700 underline">다시 불러오기</button>
          <p className="text-sm text-gray-500">미리보기 조회 기능은 현재 서버에 연결되어 있지 않습니다.</p>
        </div>
      </div>
    );
  }
  if (components.length === 0) {
    return <div role="status" className="min-h-screen bg-white p-6 text-center">표시할 미리보기 구성 요소가 없습니다.</div>;
  }
  return <div className="min-h-screen bg-white"><ViewComponentRenderer components={components} /></div>;
}

/**
 * Simple component renderer for preview
 */
function ViewComponentRenderer({ components }: { components: PreviewComponent[] }) {
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
function ComponentRenderer({ component }: { component: PreviewComponent }) {
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
