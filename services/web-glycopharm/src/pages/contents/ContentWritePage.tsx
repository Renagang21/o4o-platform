/**
 * ContentWritePage — 회원 콘텐츠 생성/수정 (GlycoPharm wrapper)
 *
 * WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase B)
 *   form UI 는 공통 `CommunityContentWriteShell`(@o4o/shared-space-ui)에 위임.
 *   wrapper 는 GP 고유 책임만: contentApi 저장·라우팅·소유권·인증.
 *   documents-only — GuideBlock / AI 배너 / recommend 미적용.
 *
 * - /content/documents/new → 생성 모드
 * - /content/:id/edit → 수정 모드
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CommunityContentWriteShell } from '@o4o/shared-space-ui';
import type { CommunityContentWriteValues } from '@o4o/shared-space-ui';
import { contentApi, type ContentDetailResponse } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

export function ContentWritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isEditMode = Boolean(id);

  const [initialValues, setInitialValues] = useState<Partial<CommunityContentWriteValues> | undefined>(undefined);
  // 수정 모드는 detail 로드 완료 후 shell mount(초기값 1회 적용)
  const [loading, setLoading] = useState(isEditMode);

  // 수정 모드: 기존 콘텐츠 로드
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    contentApi.detail(id)
      .then((res: ContentDetailResponse) => {
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
      .catch((e: any) => {
        toast.error(e?.message || '콘텐츠를 불러올 수 없습니다');
        navigate('/content', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, user?.id, navigate]);

  // 비인증 차단
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다');
      navigate('/content', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (values: CommunityContentWriteValues, status: 'draft' | 'published') => {
    const payload = {
      title: values.title,
      body: values.body || undefined,
      summary: values.summary || undefined,
      sub_type: 'content', // 회원 콘텐츠 허브 항목 고정
      tags: values.tags,
      status,
      reusable_policy: values.reusablePolicy,
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
        config={{ mode: isEditMode ? 'edit' : 'create', aiBanner: false }}
        initialValues={initialValues}
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
