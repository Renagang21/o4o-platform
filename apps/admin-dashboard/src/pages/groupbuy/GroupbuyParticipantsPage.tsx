/**
 * Groupbuy Participants Page
 * Phase 3: UI Integration
 *
 * Work Order 제약: 금액/수수료/정산 정보 UI 노출 절대 금지
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import { FC } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useParticipants, GroupbuyParticipant } from '@/hooks/groupbuy';
import { useCampaignDetail } from '@/hooks/groupbuy';
import { PermissionGuard } from '@/components/organization/PermissionGuard';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

const GroupbuyParticipantsPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaign, loading: campaignLoading } = useCampaignDetail(id);
  const { participants, loading: participantsLoading } = useParticipants(id);

  // No price columns - Work Order constraint
  const columns: O4OColumn<GroupbuyParticipant>[] = [
    {
      key: 'pharmacyId',
      header: '약국 ID',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.pharmacyName || row.pharmacyId}</span>
          <span className="text-xs text-gray-500">{row.pharmacyId}</span>
        </div>
      ),
    },
    {
      key: 'totalQuantity',
      header: '주문 수량',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.totalQuantity,
      render: (_, row) => `${row.totalQuantity}개`,
    },
    {
      key: 'pendingQuantity',
      header: '대기 수량',
      align: 'center',
      render: (_, row) => (
        <span className={row.pendingQuantity > 0 ? 'text-yellow-600' : 'text-gray-400'}>
          {row.pendingQuantity}개
        </span>
      ),
    },
    {
      key: 'confirmedQuantity',
      header: '확정 수량',
      align: 'center',
      render: (_, row) => (
        <span className={row.confirmedQuantity > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
          {row.confirmedQuantity}개
        </span>
      ),
    },
    {
      key: 'orderCount',
      header: '주문 건수',
      align: 'center',
      render: (_, row) => `${row.orderCount}건`,
    },
  ];

  // Calculate summary stats (quantity only, no price)
  const totalQuantity = participants.reduce((sum, p) => sum + p.totalQuantity, 0);
  const totalConfirmed = participants.reduce((sum, p) => sum + p.confirmedQuantity, 0);
  const totalPending = participants.reduce((sum, p) => sum + p.pendingQuantity, 0);

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 mb-4">캠페인을 찾을 수 없습니다</p>
        <Link to="/admin/groupbuy" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <PermissionGuard required={['organization.read']}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/admin/groupbuy/${id}`)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">참여자 현황</h1>
                <p className="text-sm text-gray-500 mt-1">{campaign.title}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats - No price information */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500">참여 약국</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{participants.length}개</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">총 주문 수량</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totalQuantity}개</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">대기 수량</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">{totalPending}개</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">확정 수량</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{totalConfirmed}개</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow">
            {participantsLoading ? (
              <div className="animate-pulse p-4 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
              </div>
            ) : (
              <BaseTable<GroupbuyParticipant>
                columns={columns}
                data={participants}
                rowKey={(row) => row.pharmacyId}
                emptyMessage="참여 약국이 없습니다"
                tableId="groupbuy-participants"
                columnVisibility
                persistState
              />
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyParticipantsPage;
