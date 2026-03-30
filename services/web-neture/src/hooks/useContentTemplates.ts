/**
 * useContentTemplates — 콘텐츠 템플릿 API 통합 훅
 *
 * WO-O4O-TEMPLATE-ADOPTION-NETURE-PRODUCT-V1
 *
 * RichTextEditor의 showTemplateActions와 연결:
 * - 템플릿 목록 로드 (includePublic + serviceKey=neture)
 * - 템플릿 저장 (POST)
 * - 사용 기록 (POST /:id/use, fire-and-forget)
 */

import { useState, useCallback } from 'react';
import { api } from '../lib/apiClient';
import type { ContentTemplate } from '@o4o/content-editor';

const SERVICE_KEY = 'neture';

export function useContentTemplates() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/content/templates', {
        params: { includePublic: 'true', serviceKey: SERVICE_KEY },
      });
      if (res.data?.success) {
        setTemplates(res.data.data ?? []);
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
    setLoading(false);
  }, []);

  const saveTemplate = useCallback(async (
    contentHtml: string,
    name: string,
    category: string,
    isPublic: boolean,
  ) => {
    setSaving(true);
    try {
      await api.post('/content/templates', {
        name,
        contentHtml,
        category,
        serviceKey: SERVICE_KEY,
        isPublic,
      });
    } catch (e) {
      console.error('Failed to save template:', e);
    }
    setSaving(false);
  }, []);

  const recordUse = useCallback(async (templateId: string) => {
    try {
      await api.post(`/content/templates/${templateId}/use`);
    } catch {
      // fire-and-forget
    }
  }, []);

  return { templates, loading, saving, loadTemplates, saveTemplate, recordUse };
}
