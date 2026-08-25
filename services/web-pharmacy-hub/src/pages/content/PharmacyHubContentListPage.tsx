/**
 * PharmacyHubContentListPage — PH 회원 커뮤니티 콘텐츠 목록 (#20)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
 *
 * KPA / GlycoPharm / K-Cosmetics 가 이미 소비하는 공통 `CommunityContentListTemplate` 을
 * 그대로 채택한다 — PH 전용 목록 컴포넌트를 복제하지 않고, 공통 View 안에 serviceKey 분기를
 * 넣지도 않는다. wrapper 책임은 PH 고유 축(원장 adapter · 라우팅 · 문구)뿐이다.
 *
 * 원장은 공통 `cms_contents` 다 (신규 table 0). 상태 축이 3원장(draft|published|private)과
 * 다르므로(draft|pending|published|archived) 배지 매핑만 PH 축을 쓴다.
 */

import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CommunityContentListTemplate,
  type CommunityContentListConfig,
  type CommunityContentListItem,
} from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  listPharmacyHubContents,
  PH_CONTENT_STATUS_LABEL,
  type CmsContentItem,
} from '../../lib/api/pharmacyHubContents';

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function mapCmsToListItem(c: CmsContentItem): CommunityContentListItem {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    // cms_contents 에는 작성자 표시명·조회수 컬럼이 없다 — 값을 지어내지 않고 비운다.
    authorName: null,
    dateLabel: formatDate(c.publishedAt ?? c.createdAt),
    badges:
      c.status && c.status !== 'published'
        ? [{ text: PH_CONTENT_STATUS_LABEL[c.status] ?? c.status, tone: 'warning' as const }]
        : [],
  };
}

export function PharmacyHubContentListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  // 공개 목록 / 내 콘텐츠 두 축. 내 콘텐츠는 초안·검토중까지 본인 것만 서버가 좁힌다.
  const [mine, setMine] = useState(false);

  const config: CommunityContentListConfig = useMemo(() => ({
    title: '콘텐츠',
    searchPlaceholder: '콘텐츠를 검색하세요 (제목, 요약)',
    detailPathFor: (item) => `/content/${item.id}`,
    emptyMessage: mine ? '작성한 콘텐츠가 없습니다.' : '아직 등록된 콘텐츠가 없습니다.',
    emptyFilteredMessage: '검색 결과가 없습니다.',
    errorMessage: '콘텐츠 목록을 불러오지 못했습니다.',
    fetchItems: async ({ page, limit, search }) => {
      const res = await listPharmacyHubContents({
        limit,
        offset: (page - 1) * limit,
        search,
        mine,
      });
      return { items: res.items.map(mapCmsToListItem), total: res.total };
    },
  }), [mine]);

  return (
    <CommunityContentListTemplate
      key={mine ? 'mine' : 'all'}
      config={config}
      renderLink={(href, children) => (
        <Link to={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>{children}</Link>
      )}
      headerActionSlot={isAuthenticated ? (
        <div style={styles.actions}>
          <button
            type="button"
            style={{ ...styles.toggleBtn, ...(mine ? styles.toggleBtnOn : {}) }}
            onClick={() => setMine((v) => !v)}
          >
            {mine ? '전체 콘텐츠' : '내 콘텐츠'}
          </button>
          <button type="button" style={styles.writeBtn} onClick={() => navigate('/content/documents/new')}>
            ✏️ 새 글 작성
          </button>
        </div>
      ) : undefined}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  actions: { display: 'inline-flex', gap: 8 },
  toggleBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '8px 14px', fontSize: '0.8125rem',
    fontWeight: 600, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 8, cursor: 'pointer',
  },
  toggleBtnOn: { color: '#0f766e', borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
  writeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
    fontWeight: 600, color: '#ffffff', backgroundColor: '#0f766e', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },
};

export default PharmacyHubContentListPage;
