/**
 * ContentListPage — 회원 콘텐츠 목록 (K-Cosmetics wrapper)
 *
 * WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase B)
 *   회원 작성 콘텐츠(`sub_type='content'`) 목록 허브. documents-only.
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1
 *   표시·검색·상태·더보기를 공통 `CommunityContentListTemplate`(@o4o/shared-space-ui)에 위임.
 *   wrapper 책임은 K-Cosmetics 고유 축만: contentApi 조회 adapter · 라우팅 · 문구.
 *   조회 실패를 빈 목록으로 삼키던 이전 구현 제거 — 실패는 throw → 공통 오류/재시도.
 */

import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CommunityContentListTemplate,
  standardContentToListItem,
  type CommunityContentListConfig,
} from '@o4o/shared-space-ui';
import { contentApi, type ContentListResponse } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';

export function ContentListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const config: CommunityContentListConfig = useMemo(() => ({
    title: '콘텐츠',
    searchPlaceholder: '콘텐츠를 검색하세요 (제목, 내용, 태그)',
    detailPathFor: (item) => `/content/${item.id}`,
    emptyMessage: '아직 등록된 콘텐츠가 없습니다.',
    emptyFilteredMessage: '검색 결과가 없습니다.',
    errorMessage: '콘텐츠 목록을 불러오지 못했습니다.',
    fetchItems: async ({ page, limit, search }) => {
      const res: ContentListResponse = await contentApi.list({ page, limit, search, sort: 'latest' });
      if (!res.success) throw new Error('CONTENT_LIST_FAILED');
      return {
        items: (res.data.items ?? []).map(standardContentToListItem),
        total: res.data.total ?? 0,
      };
    },
  }), []);

  return (
    <CommunityContentListTemplate
      config={config}
      renderLink={(href, children) => (
        <Link to={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>{children}</Link>
      )}
      headerActionSlot={isAuthenticated ? (
        <button style={writeBtnStyle} onClick={() => navigate('/content/documents/new')}>
          ✏️ 새 글 작성
        </button>
      ) : undefined}
    />
  );
}

const writeBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
  fontWeight: 600, color: '#ffffff', backgroundColor: '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer',
};

export default ContentListPage;
