/**
 * ContentWritePage — 콘텐츠 생성/수정 (KPA wrapper)
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1:
 *   form UI 를 공통 `CommunityContentWriteShell`(@o4o/shared-space-ui)로 위임.
 *   본 wrapper 는 KPA 고유 책임만 유지: contentApi 저장·라우팅·소유권·인증·GuideBlock.
 *
 * - /content/documents/new → 생성 모드
 * - /content/:id/edit → 수정 모드
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CommunityContentWriteShell, GuideBlock } from '@o4o/shared-space-ui';
import type { CommunityContentWriteValues } from '@o4o/shared-space-ui';
import { contentApi } from '../../api/content';
import { useAuth, getAccessToken } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { fetchGuidePageContent } from '../../api/guideContent';

export function ContentWritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isEditMode = Boolean(id);

  const [initialValues, setInitialValues] = useState<Partial<CommunityContentWriteValues> | undefined>(undefined);
  // 수정 모드는 detail 로드 완료 후 shell 을 mount(=초기값 1회 적용) — 로드 전 빈 폼 mount 방지
  const [loading, setLoading] = useState(isEditMode);

  // WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1: content.document.editor guide (KPA 고유)
  const [guideTitle, setGuideTitle] = useState('콘텐츠를 작성합니다.');
  const [guideDesc, setGuideDesc] = useState('제목과 본문을 입력한 뒤 초안 저장 또는 공개 저장을 선택하세요.');
  const [guideSteps, setGuideSteps] = useState<string[]>([
    '콘텐츠 제목을 입력합니다',
    '본문을 작성합니다 (리치 텍스트 편집)',
    '요약(선택)과 태그(필수, 최소 1개)를 입력합니다',
    '초안으로 저장하거나 바로 공개할 수 있습니다',
  ]);
  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent('kpa-society', 'content.document.editor').then((sections) => {
      if (cancelled) return;
      const raw = sections['guideblock-page-help'];
      if (!raw) return;
      try {
        const obj = JSON.parse(raw);
        if (obj?.title) setGuideTitle(obj.title);
        if (obj?.description) setGuideDesc(obj.description);
        if (Array.isArray(obj?.steps)) setGuideSteps(obj.steps);
      } catch { /* keep fallback */ }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load existing content for edit mode
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    contentApi.detail(id)
      .then((res) => {
        if (res.success) {
          const c = res.data;
          if (c.created_by !== user?.id) {
            toast.error('수정 권한이 없습니다');
            navigate('/content', { replace: true });
            return;
          }
          setInitialValues({
            title: c.title,
            body: c.body || '',
            summary: c.summary || '',
            tags: c.tags || [],
            reusablePolicy: c.reusable_policy === 'restricted' ? 'restricted' : 'platform',
          });
        }
      })
      .catch((e) => {
        toast.error(e?.message || '콘텐츠를 불러올 수 없습니다');
        navigate('/content', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, user?.id, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다');
      navigate('/content', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const aiRequestHeaders = (() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  })();

  const handleSubmit = async (values: CommunityContentWriteValues, status: 'draft' | 'published') => {
    const payload = {
      title: values.title,
      body: values.body || undefined,
      summary: values.summary || undefined,
      content_type: 'information' as const, // WO-KPA-CONTENT-WRITE-SIMPLIFY-V2: 분류 UI 제거, 기본값 고정
      sub_type: 'content', // WO-KPA-CONTENT-RESOURCE-SUBTYPE-SEPARATION-V1: 콘텐츠 허브 항목 고정
      tags: values.tags,
      status,
      reusable_policy: values.reusablePolicy, // WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1
    };

    if (isEditMode && id) {
      const res = await contentApi.update(id, payload);
      if (res.success) {
        toast.success('수정되었습니다');
        navigate(`/content/${id}`);
      }
    } else {
      const res = await contentApi.create(payload);
      if (res.success) {
        toast.success('등록되었습니다');
        navigate(`/content/${res.data.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#64748b' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>{isEditMode ? '콘텐츠 수정' : '콘텐츠 작성'}</h1>

      <CommunityContentWriteShell
        config={{ mode: isEditMode ? 'edit' : 'create' }}
        initialValues={initialValues}
        aiRequestHeaders={aiRequestHeaders}
        guideSlot={
          <GuideBlock variant="info" title={guideTitle} description={guideDesc} steps={guideSteps} />
        }
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 780, margin: '0 auto', padding: '24px 16px 60px' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' },
  pageTitle: { fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 20px' },
};

export default ContentWritePage;
