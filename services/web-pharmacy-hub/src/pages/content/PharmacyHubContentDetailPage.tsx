/**
 * PharmacyHubContentDetailPage — PH 회원 커뮤니티 콘텐츠 상세 (#21) + 작성자 액션 (#23)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
 *
 * 표시부는 공통 `CommunityContentDetailTemplate` 에 위임한다 (3서비스와 동일 채택).
 * wrapper 는 PH 고유 축만: cms_contents adapter · 소유권 판정 · 상태 전이 CTA.
 *
 * CTA 는 서버 capability 의 부분집합만 노출한다 (§3 금지 패턴 — 불가능한 전이·없는 delete API):
 *   draft   수정 / 검토 요청 / 삭제(보관)
 *   pending 수정 / 요청 취소
 *   published 삭제(보관)
 *   archived  없음
 * `POST /cms/contents/:id` 계열에 hard delete 가 없으므로 "삭제"는 archived 전이다.
 */

import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CommunityContentDetailTemplate,
  type CommunityContentDetailConfig,
  type CommunityContentDetailData,
} from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPharmacyHubContent,
  submitPharmacyHubContent,
  withdrawPharmacyHubContent,
  archivePharmacyHubContent,
  phContentSelfActions,
  PH_CONTENT_STATUS_LABEL,
  type CmsContentItem,
} from '../../lib/api/pharmacyHubContents';
import { cmsAuthorId } from '../../lib/api/pharmacyHubResources';
import {
  trackPharmacyHubCmsView,
  togglePharmacyHubCmsRecommend,
} from '../../lib/api/pharmacyHubCmsEngagement';

function formatFullDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function toDetailData(c: CmsContentItem): CommunityContentDetailData {
  return {
    title: c.title,
    // cms_contents 에는 작성자 표시명 컬럼이 없다 — 지어내지 않는다.
    authorName: null,
    // WO-...-FULL-PARITY-CLOSURE-V1 (#28): 조회수는 공통 CMS 가 공급한다.
    // 서버가 수치를 못 실어 보낸 경우(필드 생략)에는 표시하지 않는다.
    viewCount: c.viewCount,
    dateLabel: formatFullDate(c.publishedAt ?? c.createdAt),
    summary: c.summary,
    bodyHtml: c.body,
    badges:
      c.status && c.status !== 'published'
        ? [{ text: PH_CONTENT_STATUS_LABEL[c.status] ?? c.status, tone: 'warning' as const }]
        : [],
  };
}

export function PharmacyHubContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  // #28 추천 — 서버 응답(추천 수 · 내 추천 여부)만 신뢰한다. 낙관적 값을 지어내지 않는다.
  const [recommend, setRecommend] = useState<{ count: number; mine: boolean } | null>(null);
  // 전이 후 상세를 다시 읽도록 템플릿을 remount 시킨다.
  const [reloadKey, setReloadKey] = useState(0);

  const config: CommunityContentDetailConfig<CmsContentItem> = useMemo(() => ({
    fetchContent: (contentId) => getPharmacyHubContent(contentId),
    toDetailData,
    trackView: (contentId) => { void trackPharmacyHubCmsView(contentId); },
    listPath: '/content',
    listLabel: '목록으로',
    errorMessage: '콘텐츠를 불러오지 못했습니다',
    notFoundMessage: '콘텐츠를 찾을 수 없습니다',
  }), []);

  const run = useCallback(async (
    action: () => Promise<unknown>,
    successMessage: string,
    after?: () => void,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      if (after) after();
      else setReloadKey((k) => k + 1);
    } catch {
      toast.error('처리에 실패했습니다');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <CommunityContentDetailTemplate<CmsContentItem>
      key={`${id}:${reloadKey}`}
      contentId={id}
      config={config}
      renderLink={(href, children) => <Link to={href} style={styles.backLink}>{children}</Link>}
      renderActions={(content) => {
        // producerRef = cms_contents.createdBy (공통 read 가 이미 노출하는 필드)
        const ownerId = cmsAuthorId(content as any);
        const isOwner = !!user?.id && ownerId === user.id;
        const actions = isOwner ? phContentSelfActions(content.status) : [];

        // 추천은 소유자 전용이 아니다 — 로그인 회원이면 누구나 누른다.
        const recCount = recommend?.count ?? content.recommendCount;
        const recMine = recommend?.mine ?? content.isRecommendedByMe ?? false;
        const recommendBtn = user?.id ? (
          <button
            type="button" disabled={busy} style={recMine ? styles.primaryBtn : styles.btn}
            onClick={() => {
              if (busy) return;
              setBusy(true);
              togglePharmacyHubCmsRecommend(content.id)
                .then((r) => setRecommend({ count: r.recommendCount, mine: r.isRecommendedByMe }))
                .catch(() => toast.error('추천에 실패했습니다'))
                .finally(() => setBusy(false));
            }}
          >
            {recMine ? '♥' : '♡'} 추천{recCount === undefined ? '' : ` ${recCount}`}
          </button>
        ) : null;

        if (!recommendBtn && actions.length === 0) return null;
        return (
          <>
            {recommendBtn}
            {actions.includes('edit') && (
              <Link to={`/content/${content.id}/edit`} style={styles.linkBtn}>✏️ 수정</Link>
            )}
            {actions.includes('submit') && (
              <button
                type="button" disabled={busy} style={styles.primaryBtn}
                onClick={() => run(() => submitPharmacyHubContent(content.id), '검토를 요청했습니다')}
              >
                검토 요청
              </button>
            )}
            {actions.includes('withdraw') && (
              <button
                type="button" disabled={busy} style={styles.btn}
                onClick={() => run(() => withdrawPharmacyHubContent(content.id), '요청을 취소했습니다')}
              >
                요청 취소
              </button>
            )}
            {actions.includes('archive') && (
              <button
                type="button" disabled={busy} style={styles.dangerBtn}
                onClick={() => {
                  if (!window.confirm('이 콘텐츠를 삭제(보관)하시겠습니까?')) return;
                  run(
                    () => archivePharmacyHubContent(content.id),
                    '삭제되었습니다',
                    () => navigate('/content', { replace: true }),
                  );
                }}
              >
                삭제
              </button>
            )}
          </>
        );
      }}
    />
  );
}

const baseBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
  fontWeight: 500, borderRadius: 8, cursor: 'pointer', textDecoration: 'none',
};

const styles: Record<string, React.CSSProperties> = {
  backLink: { fontSize: '0.875rem', color: '#0f766e', textDecoration: 'none', fontWeight: 500 },
  linkBtn: { ...baseBtn, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' },
  btn: { ...baseBtn, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' },
  primaryBtn: { ...baseBtn, color: '#ffffff', backgroundColor: '#0f766e', border: 'none', fontWeight: 600 },
  dangerBtn: { ...baseBtn, color: '#b91c1c', backgroundColor: '#ffffff', border: '1px solid #fecaca' },
};

export default PharmacyHubContentDetailPage;
