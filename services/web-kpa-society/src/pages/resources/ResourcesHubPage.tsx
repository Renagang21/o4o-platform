/**
 * ResourcesHubPage — KPA 자료실
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-FOUNDATION-V1
 * WO-KPA-RESOURCES-UPLOAD-BUTTON-ON-RESOURCES-V1: 자료 등록 버튼 추가
 *
 * ResourcesHubTemplate + KPA adapter.
 * KPA 전용 API(resourcesApi), operator 조건, 문구는
 * kpaResourcesConfig에만 위치한다.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourcesHubTemplate, type ResourcesHubConfig, type ResourcesHubItem } from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';
import { resourcesApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';

// ─── Resource Upload Button ──────────────────────────────────────────────────

const uploadBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const emptyUploadBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 12,
  padding: '8px 16px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
};

function ResourceUploadButton({ variant = 'hero' }: { variant?: 'hero' | 'empty' }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);
  const targetPath = isOperator ? '/operator/resources/new' : '/content/new';

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: targetPath } });
    } else {
      navigate(targetPath);
    }
  };

  return (
    <button onClick={handleClick} style={variant === 'hero' ? uploadBtnStyle : emptyUploadBtnStyle}>
      {variant === 'hero' ? '+ 자료 등록' : '자료 등록하기'}
    </button>
  );
}

// ─── KPA Config ───────────────────────────────────────────────────────────────

function useKpaResourcesConfig(isOperator: boolean): ResourcesHubConfig {
  return useMemo(() => ({
    serviceKey: 'kpa-society',
    tableId: 'kpa-resources',

    heroTitle: '자료실',
    heroDesc: '회원들이 함께 이용하는 공동자료실입니다.',
    searchPlaceholder: '자료를 검색하세요 (제목, 내용, 등록자)',

    fetchItems: async ({ page, limit, search }) => {
      const res = await resourcesApi.list({ page, limit, search, sort: 'latest' });
      const d = res.data;
      return {
        items: (d.items || []) as ResourcesHubItem[],
        total: d.total || 0,
        totalPages: d.totalPages || 1,
      };
    },

    fetchDetail: async (id) => {
      const res = await resourcesApi.getDetail(id);
      return res.data as ResourcesHubItem;
    },

    trackView: (id) => { resourcesApi.trackView(id).catch(() => {}); },

    // WO-KPA-RESOURCES-MINOR-REFINEMENT-V1: 좋아요 토글
    onToggleRecommend: async (id) => {
      const res = await resourcesApi.toggleRecommend(id);
      return res.data;
    },

    // WO-KPA-RESOURCES-UPLOAD-BUTTON-ON-RESOURCES-V1: 모든 사용자에게 등록 버튼 노출
    headerAction: <ResourceUploadButton variant="hero" />,
    renderEmptyAction: () => <ResourceUploadButton variant="empty" />,

    // Operator-only: row edit/delete
    getEditHref: isOperator
      ? (id) => `/operator/resources/${id}/edit`
      : undefined,

    onDelete: isOperator
      ? async (id) => {
          await resourcesApi.delete(id);
          toast.success('자료가 삭제되었습니다');
        }
      : undefined,

    onBulkDelete: isOperator
      ? async (ids) => {
          await Promise.all(ids.map(id => resourcesApi.delete(id)));
          toast.success(`${ids.length}개가 삭제되었습니다`);
        }
      : undefined,

    emptyMessage: '등록된 자료가 없습니다.',
    emptyFilteredMessage: '검색 결과가 없습니다.',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isOperator]);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function ResourcesHubPage() {
  const { user } = useAuth();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);
  const config = useKpaResourcesConfig(isOperator);
  return <ResourcesHubTemplate config={config} />;
}

export default ResourcesHubPage;
