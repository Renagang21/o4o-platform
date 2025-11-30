import { FC } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, XCircle } from 'lucide-react';
import { useParticipants, GroupbuyParticipant } from '@/hooks/groupbuy';
import { useCampaignDetail } from '@/hooks/groupbuy';
import { PermissionGuard } from '@/components/organization/PermissionGuard';
import { DataTable, Column } from '@/components/common/DataTable';

const GroupbuyParticipantsPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaign, loading: campaignLoading } = useCampaignDetail(id);
  const { participants, loading: participantsLoading, cancelParticipant } = useParticipants(id);

  const handleCancel = async (participantId: string) => {
    if (!id || !window.confirm('이 참여를 취소하시겠습니까?')) {
      return;
    }

    try {
      await cancelParticipant(id, participantId);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: '대기', bg: 'bg-yellow-100', text: 'text-yellow-800' },
      confirmed: { label: '확정', bg: 'bg-green-100', text: 'text-green-800' },
      cancelled: { label: '취소', bg: 'bg-red-100', text: 'text-red-800' }
    }[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800' };

    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const columns: Column<GroupbuyParticipant>[] = [
    {
      key: 'joinedAt',
      title: '참여일시',
      dataIndex: 'joinedAt',
      sortable: true,
      render: (date) => new Date(date).toLocaleString('ko-KR')
    },
    {
      key: 'user',
      title: '참여자',
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{record.user?.name || '-'}</span>
          <span className="text-xs text-gray-500">{record.user?.email || ''}</span>
        </div>
      )
    },
    {
      key: 'quantity',
      title: '수량',
      dataIndex: 'quantity',
      align: 'center',
      sortable: true,
      render: (quantity) => `${quantity}개`
    },
    {
      key: 'unitPrice',
      title: '단가',
      dataIndex: 'unitPrice',
      align: 'right',
      sortable: true,
      render: (price) => `${price.toLocaleString()}원`
    },
    {
      key: 'totalAmount',
      title: '결제 금액',
      dataIndex: 'totalAmount',
      align: 'right',
      sortable: true,
      render: (amount) => (
        <span className="font-medium text-gray-900">{amount.toLocaleString()}원</span>
      )
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      render: (status) => getStatusBadge(status)
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2">
          {record.status !== 'cancelled' && (
            <PermissionGuard required={['organization.manage']} showMessage={false}>
              <button
                onClick={() => handleCancel(record.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                title="참여 취소"
              >
                <XCircle className="w-3 h-3" />
                취소
              </button>
            </PermissionGuard>
          )}
        </div>
      )
    }
  ];

  const totalAmount = participants
    .filter(p => p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const totalQuantity = participants
    .filter(p => p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.quantity, 0);

  const confirmedCount = participants.filter(p => p.status === 'confirmed').length;

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
        <Link
          to="/admin/groupbuy"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
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
                <h1 className="text-2xl font-semibold text-gray-900">참여자 관리</h1>
                <p className="text-sm text-gray-500 mt-1">{campaign.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500">총 참여자</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {participants.length}명
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">확정된 참여</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {confirmedCount}명
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">총 수량</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {totalQuantity}개
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">총 금액</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {totalAmount.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow">
            <DataTable
              columns={columns}
              dataSource={participants}
              rowKey="id"
              loading={participantsLoading}
              emptyText="참여자가 없습니다"
            />
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyParticipantsPage;
