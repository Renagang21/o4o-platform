/**
 * MyRequestsPage - 통합 신청 내역 (MyPage)
 *
 * WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-COMPONENT-V1: 공통 MyRequestsInbox 사용
 *
 * 포럼/강좌/강사/가입 등 모든 승인형 요청을 한 곳에서 확인.
 * 두 데이터 소스를 병합:
 *  1) mypageApi.getMyApprovalRequests() — kpa_approval_requests
 *  2) forumRequestApi.getMyRequests() — forum_category_requests (기존 포럼)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { MyPageLayout } from '../../layouts/MyPageLayout';
import { MyRequestsInbox, normalizeForumCategoryRequest } from '@o4o/account-ui';
import type { MyRequestItem } from '@o4o/account-ui';
import { mypageApi } from '../../api/mypage';
import type { UnifiedRequestItem } from '../../api/mypage';
import { forumRequestApi } from '../../api/forum';

// ============================================================================
// Type filter tabs — KPA 전용 구성
// ============================================================================

const TYPE_FILTERS = [
  { key: '', label: '전체' },
  { key: 'forum_category', label: '포럼' },
  { key: 'course', label: '강좌' },
  { key: 'instructor_qualification', label: '강사' },
  { key: 'membership', label: '가입' },
];

// ============================================================================
// Normalize forum-core data → MyRequestItem
// WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1 §8:
//   `GET /forum/category-requests/my` 변환은 공통 adapter 로 이전했다
//   (`normalizeForumCategoryRequest` — KPA / GlycoPharm / K-Cosmetics 공용).
// ============================================================================

// UnifiedRequestItem → MyRequestItem (필드 호환)
function toMyRequestItem(item: UnifiedRequestItem): MyRequestItem {
  return item as unknown as MyRequestItem;
}

// ============================================================================
// Component
// ============================================================================

export default function MyRequestsPage() {
  const [items, setItems] = useState<MyRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [approvalRes, forumRes] = await Promise.all([
        mypageApi.getMyApprovalRequests().catch(() => ({ data: [] } as any)),
        forumRequestApi.getMyRequests().catch(() => ({ data: [] } as any)),
      ]);

      const approvalItems: MyRequestItem[] = ((approvalRes as any)?.data || []).map(toMyRequestItem);
      const forumRaw: any[] = (forumRes as any)?.data || [];
      const forumItems = forumRaw.map(normalizeForumCategoryRequest);

      // 병합 + id 기준 중복 제거 (approval 우선)
      const seen = new Set(approvalItems.map(i => i.id));
      const merged = [...approvalItems];
      for (const fi of forumItems) {
        if (!seen.has(fi.id)) {
          merged.push(fi);
          seen.add(fi.id);
        }
      }

      // 최신순 정렬
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setItems(merged);
    } catch {
      setError('신청 내역을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const actionSection = (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="text-sm font-semibold text-blue-800 mb-2">새 신청하기</div>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/forum/request"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          포럼 개설 신청
        </Link>
      </div>
    </div>
  );

  return (
    <MyPageLayout
      title="내 신청 내역"
      description="포럼, 강좌, 강사 등 모든 승인 요청을 확인합니다"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: '/mypage' },
        { label: '내 신청 내역' },
      ]}
      width="wide"
    >
      <MyRequestsInbox
        items={items}
        loading={isLoading}
        error={error}
        onRetry={loadData}
        typeFilters={TYPE_FILTERS}
        actionSection={actionSection}
        emptyDescription="새 포럼이나 강좌를 신청하면 여기에 표시됩니다"
      />
    </MyPageLayout>
  );
}
