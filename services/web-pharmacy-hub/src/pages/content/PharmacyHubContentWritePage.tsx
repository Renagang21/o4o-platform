/**
 * PharmacyHubContentWritePage — PH 회원 콘텐츠 작성/수정 (#22·#23)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
 *
 * form UI 는 공통 `CommunityContentWriteShell` 에 위임한다 (KPA/GP/KCos 와 동일 채택).
 * wrapper 는 PH 고유 축만: cms_contents 저장 · 라우팅 · 소유권 · 인증.
 *
 * 3원장(`{service}_contents`)과 다른 두 축을 config 로 끈다 — 없는 컬럼에 UI 를 만들지 않는다:
 *   requireTags: false        cms_contents 에 tags 컬럼 없음
 *   reusablePolicyField: false cms_contents 에 reusable_policy 컬럼 없음
 *
 * 저장 액션은 '임시저장'(draft 유지) + '검토 요청'(draft → pending) 두 가지다.
 * 회원이 스스로 published 로 만들 수 없으므로 '공개' 버튼을 노출하지 않는다 (§3 금지 패턴).
 *
 * - /content/documents/new → 생성
 * - /content/:id/edit      → 수정 (작성자 본인의 draft·pending 만)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CommunityContentWriteShell } from '@o4o/shared-space-ui';
import type { CommunityContentWriteValues } from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPharmacyHubContent,
  createPharmacyHubContent,
  updatePharmacyHubContent,
  submitPharmacyHubContent,
} from '../../lib/api/pharmacyHubContents';

/** 서버가 회원 수정을 허용하는 상태 (capability `editableStatuses` 의 화면측 거울). */
const EDITABLE_STATUSES = ['draft', 'pending'];

export function PharmacyHubContentWritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isEditMode = Boolean(id);

  const [initialValues, setInitialValues] = useState<Partial<CommunityContentWriteValues> | undefined>(undefined);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다');
      navigate('/content', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getPharmacyHubContent(id)
      .then((c) => {
        if (cancelled) return;
        const ownerId = (c as any).createdBy ?? (c as any).producerRef ?? null;
        if (!user?.id || ownerId !== user.id) {
          toast.error('수정 권한이 없습니다');
          navigate('/content', { replace: true });
          return;
        }
        if (!EDITABLE_STATUSES.includes(c.status)) {
          toast.error('게시·보관된 콘텐츠는 수정할 수 없습니다');
          navigate(`/content/${id}`, { replace: true });
          return;
        }
        setInitialValues({ title: c.title, body: c.body || '', summary: c.summary || '' });
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('콘텐츠를 불러올 수 없습니다');
        navigate('/content', { replace: true });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user?.id, navigate]);

  // shell 의 두 번째 인자는 'draft' | 'published' 다. PH 는 회원이 직접 게시할 수 없으므로
  // 'published' 를 **검토 요청(draft → pending)** 으로 매핑한다.
  const handleSubmit = async (values: CommunityContentWriteValues, status: 'draft' | 'published') => {
    const payload = {
      title: values.title,
      body: values.body || undefined,
      summary: values.summary || undefined,
    };

    const target = isEditMode && id
      ? (await updatePharmacyHubContent(id, payload)).id
      : (await createPharmacyHubContent(payload)).id;

    if (status === 'published') {
      await submitPharmacyHubContent(target);
      toast.success('검토를 요청했습니다. 운영자 검토 후 게시됩니다.');
    } else {
      toast.success(isEditMode ? '수정되었습니다' : '임시저장되었습니다');
    }
    navigate(`/content/${target}`);
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
      <p style={styles.notice}>
        작성한 콘텐츠는 <strong>검토 요청</strong> 후 운영자 검토를 거쳐 공개됩니다.
      </p>

      <CommunityContentWriteShell
        config={{
          mode: isEditMode ? 'edit' : 'create',
          aiBanner: false,
          requireTags: false,
          reusablePolicyField: false,
          publishLabel: '검토 요청',
        }}
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
  pageTitle: { fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' },
  notice: { fontSize: '0.8125rem', color: '#475569', margin: '0 0 20px' },
};

export default PharmacyHubContentWritePage;
