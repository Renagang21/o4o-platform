/** Public preview keeps its legacy endpoint; it must not fall back to private CMS APIs. */
export function getViewPreviewUrl(slug: string): string {
  const configured = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
  const base = configured.replace(/\/+$/, '').replace(/\/api(?:\/v1)?$/, '');
  return `${base}/api/v1/cms/public/view/${encodeURIComponent(slug)}`;
}

export interface PreviewComponent {
  type: string;
  props?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readPreviewComponents(body: unknown): PreviewComponent[] {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data) ||
      !isRecord(body.data.view) || !isRecord(body.data.view.schema) ||
      !Array.isArray(body.data.view.schema.components)) {
    throw new Error('미리보기 응답 형식을 확인할 수 없습니다.');
  }
  const components: unknown[] = body.data.view.schema.components;
  for (const component of components) {
    if (!isRecord(component) || typeof component.type !== 'string' ||
        (component.props !== undefined && !isRecord(component.props))) {
      throw new Error('미리보기 응답 형식을 확인할 수 없습니다.');
    }
    if (component.type === 'Text' && isRecord(component.props)) {
      for (const name of ['text', 'size', 'align', 'color', 'weight']) {
        if (component.props[name] !== undefined && typeof component.props[name] !== 'string') {
          throw new Error('미리보기 응답 형식을 확인할 수 없습니다.');
        }
      }
    }
  }
  return components as PreviewComponent[];
}

export function previewStatusMessage(status: number): string {
  if (status === 404) return '미리보기 데이터 또는 조회 경로를 찾을 수 없습니다. 서버 연결 상태를 확인해주세요.';
  if (status === 401 || status === 403) return '이 미리보기에 접근할 수 없습니다.';
  return '미리보기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
}
