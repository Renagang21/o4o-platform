/**
 * ResourcesHubPage — KPA 자료실
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-FOUNDATION-V1
 * WO-KPA-RESOURCES-UPLOAD-BUTTON-ON-RESOURCES-V1: 자료 등록 버튼 추가
 * WO-KPA-RESOURCES-UPLOAD-ENTRY-AND-FORM-SEPARATION-V1: CTA → /resources/new
 * WO-KPA-RESOURCES-OWNER-ACTIONS-AND-TAKE-V1: 등록자 수정/삭제 + 가져가기 액션
 * WO-O4O-CONTENT-LIBRARY-CARD-STANDARD-V1: inline style → Tailwind, hex → theme
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 매장 경영자 → 내 자료함 가져가기 (Community → Store copy)
 * WO-O4O-KPA-RESOURCES-CREATE-MODAL-UX-V1: 일반 사용자 등록 → 모달 전환
 *
 * ResourcesHubTemplate + KPA adapter.
 * KPA 전용 API(resourcesApi), operator 조건, 문구는
 * kpaResourcesConfig에만 위치한다.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourcesHubTemplate, type ResourcesHubConfig, type ResourcesHubItem } from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';
import { resourcesApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';
import { ResourceWriteModal } from './ResourceWriteModal';

// ─── Resource Upload Button ──────────────────────────────────────────────────

interface UploadButtonProps {
  variant?: 'hero' | 'empty';
  onOpenModal: () => void;
}

function ResourceUploadButton({ variant = 'hero', onOpenModal }: UploadButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/resources/new' } });
    } else if (isOperator) {
      navigate('/operator/resources/new');
    } else {
      onOpenModal();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={variant === 'hero'
        ? 'inline-flex items-center gap-1.5 px-[18px] py-2.5 bg-primary text-white text-sm font-semibold rounded-lg border-none cursor-pointer whitespace-nowrap'
        : 'inline-block mt-3 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg border-none cursor-pointer'
      }
    >
      {variant === 'hero' ? '+ 자료 등록' : '자료 등록하기'}
    </button>
  );
}

// ─── KPA Config ───────────────────────────────────────────────────────────────

// WO-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1:
//   매장 복사 제거로 store_owner 판정이 더 이상 필요 없어 인자에서 제외.
function useKpaResourcesConfig(
  isOperator: boolean,
  userId: string | null | undefined,
  onOpenModal: () => void,
): ResourcesHubConfig {
  return useMemo(() => ({
    serviceKey: 'kpa-society',
    tableId: 'kpa-resources',

    heroTitle: '자료실',
    heroDesc: '회원들이 함께 이용하는 공동자료실입니다.',
    searchPlaceholder: '자료를 검색하세요 (제목, 내용, 등록자)',

    fetchItems: async ({ page, limit, search }) => {
      const res = await resourcesApi.list({ page, limit, search, sort: 'latest' });
      const d = res.data;
      // WO-O4O-KPA-RESOURCES-USAGE-TYPE-V1: usage_type → actionType 매핑
      const items = (d.items || []).map((item) => {
        let actionType: 'view' | 'download' | 'external' | 'copy' | undefined;
        if (item.usage_type === 'LINK') actionType = 'external';
        else if (item.usage_type === 'DOWNLOAD') actionType = 'download';
        else if (item.usage_type === 'COPY') actionType = 'copy';
        else actionType = 'view'; // READ / undefined → drawer 읽기
        return { ...item, actionType } as ResourcesHubItem;
      });
      return {
        items,
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
    // WO-O4O-KPA-RESOURCES-CREATE-MODAL-UX-V1: 일반 사용자 클릭 → 모달
    headerAction: <ResourceUploadButton variant="hero" onOpenModal={onOpenModal} />,
    renderEmptyAction: () => <ResourceUploadButton variant="empty" onOpenModal={onOpenModal} />,

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

    // WO-KPA-RESOURCES-OWNER-ACTIONS-AND-TAKE-V1: 등록자 본인 액션
    getCurrentUserId: () => userId ?? null,
    getOwnerEditHref: (id) => `/resources/${id}/edit`,
    onOwnerDelete: async (id) => {
      await resourcesApi.delete(id);
      toast.success('자료가 삭제되었습니다');
    },

    // WO-KPA-RESOURCES-TAKE-ACTION-CLARIFY-V1: 가져가기 결과 toast
    onToast: (message, type) => {
      if (type === 'error') toast.error(message);
      else toast.success(message);
    },

    // WO-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1:
    //   자료실은 매장 복사 대상이 아니다. 복사 허용 대상은 콘텐츠·디지털사이니지 2종뿐이며,
    //   자료실은 다운로드·외부 링크·첨부파일 이용 영역이다.
    //   (기존 WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1 의 onCopyToStore 경로 제거.
    //    서버도 KpaAssetResolver 에서 'resource' 복사를 거부한다 — 404 SOURCE_NOT_FOUND.)
    //   onCopyToStore 미전달 → 템플릿이 가져가기 액션을 렌더하지 않는다.

    emptyMessage: '등록된 자료가 없습니다.',
    emptyFilteredMessage: '검색 결과가 없습니다.',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isOperator, userId, onOpenModal]);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function ResourcesHubPage() {
  const { user } = useAuth();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);

  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openModal = useCallback(() => setModalOpen(true), []);

  const config = useKpaResourcesConfig(isOperator, user?.id, openModal);

  return (
    <>
      <ResourcesHubTemplate key={refreshKey} config={config} />
      <ResourceWriteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}

export default ResourcesHubPage;
