/**
 * PendingTasksMenu — 헤더 "검토 대기 N" 진입점
 *
 * WO-O4O-ADMIN-PENDING-WORK-COUNTER-AND-HEADER-ENTRY-V1
 *
 * 알림(읽음/이력/실시간 push)이 아니라 현재 남아 있는 관리자 판단 업무의 건수다.
 * 60초 polling 으로 갱신하고, 항목 클릭 시 기존 관리 화면(기본 필터 = 대기 상태)으로 이동한다.
 * 집계 실패 시에는 가짜 숫자를 보이지 않도록 진입점을 숨긴다.
 */
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { fetchAdminPendingTasksSummary } from '@/api/admin-pending-tasks.api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const POLL_INTERVAL_MS = 60_000;

const PendingTasksMenu: FC = () => {
  const navigate = useNavigate();
  const { data, isError } = useQuery({
    queryKey: ['admin', 'pending-tasks', 'summary'],
    queryFn: fetchAdminPendingTasksSummary,
    refetchInterval: POLL_INTERVAL_MS,
  });

  if (isError || !data) return null;

  const items = [
    { label: '상품 등록 요청', count: data.productRegistrationRequests, path: '/admin/o4o-product-db/store-requests' },
    { label: '설명서 검수', count: data.manualReviews, path: '/admin/o4o-product-db/supplier-store-descriptions' },
  ];
  const hasPending = data.total > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border ${
          hasPending
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-gray-200 text-o4o-text-secondary hover:text-o4o-text-primary hover:bg-o4o-bg-tertiary'
        }`}
      >
        <ClipboardCheck className="w-4 h-4" />
        <span>검토 대기 {data.total}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>검토 대기 업무</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem
            key={item.path}
            className="cursor-pointer justify-between"
            onClick={() => navigate(item.path)}
          >
            <span>{item.label}</span>
            <span className={item.count > 0 ? 'font-semibold text-amber-700' : 'text-o4o-text-secondary'}>
              {item.count}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PendingTasksMenu;
