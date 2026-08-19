/**
 * MyRequestsPage — 포럼 개설 신청 내역 (GlycoPharm / Forum 영역)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1 §5·§6·§14
 *
 * 변경: 목록·상태·상세(사유/관리자 의견/결과 링크)를 자체 구현하지 않고
 *       공통 `MyRequestsInbox` 에 위임한다. backend 계약
 *       (`GET /api/v1/forum/category-requests/my`) 은 그대로다.
 *       KPA / K-Cosmetics 와 같은 normalizer(`normalizeForumCategoryRequests`)를 쓴다.
 */

import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, ArrowLeft, MessageSquarePlus } from 'lucide-react';
import {
  MyRequestsInbox,
  normalizeForumCategoryRequests,
  sortRequestsByCreatedAtDesc,
} from '@o4o/account-ui';
import type { MyRequestItem } from '@o4o/account-ui';
import { forumRequestApi } from '@/services/api';

export default function MyRequestsPage() {
  const [items, setItems] = useState<MyRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await forumRequestApi.getMyRequests();
      if (response.error) {
        // 조회 실패를 빈 목록으로 삼키지 않는다.
        setError(response.error.message);
      } else {
        setItems(sortRequestsByCreatedAtDesc(normalizeForumCategoryRequests(response.data)));
      }
    } catch {
      setError('신청 내역을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <NavLink
          to="/forum"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          포럼으로 돌아가기
        </NavLink>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary-600" />
              내 신청 내역
            </h1>
            <p className="text-slate-500 mt-1">포럼 생성 신청 내역을 확인하세요</p>
          </div>
          <NavLink
            to="/forum/request-category"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4" />
            새 신청
          </NavLink>
        </div>
      </div>

      <MyRequestsInbox
        items={items}
        loading={isLoading}
        error={error}
        onRetry={loadRequests}
        showStats={false}
        resultLink={(item) => {
          const slug = item.resultMetadata?.slug as string | undefined;
          if (item.status !== 'approved' || !slug) return null;
          return { href: `/forum?category=${slug}`, label: '생성된 포럼 보기' };
        }}
        emptyTitle="신청 내역이 없습니다"
        emptyDescription="원하는 주제의 포럼을 신청해보세요"
      />
    </div>
  );
}
