import { FC, useEffect, useState } from 'react';
import { Card, Button, Tag, message, Descriptions, Space } from 'antd';
import { ArrowLeft, Download, Mail } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import DataTable from '@/components/common/DataTable';
import PermissionGuard from '@/components/organization/PermissionGuard';
import { GroupbuyStatusBadge } from '@/components/groupbuy';
import type { ColumnsType } from 'antd/es/table';
import type { GroupbuyStatus } from '@/components/groupbuy/GroupbuyStatusBadge';
import dayjs from 'dayjs';

interface Participant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quantity: number;
  totalPrice: number;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'cancelled';
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Campaign {
  id: string;
  title: string;
  productName: string;
  status: GroupbuyStatus;
  groupbuyPrice: number;
  currentQuantity: number;
  minQuantity: number;
  maxQuantity?: number;
  participantCount: number;
}

const GroupbuyParticipantsPage: FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignData();
      fetchParticipants();
    }
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      const response = await authClient.api.get(`/api/groupbuy/campaigns/${campaignId}`);
      setCampaign(response.data);
    } catch (error) {
      message.error('캠페인 정보를 불러오는데 실패했습니다.');
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get(`/api/groupbuy/campaigns/${campaignId}/participants`);
      setParticipants(response.data);
    } catch (error) {
      message.error('참여자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await authClient.api.get(
        `/api/groupbuy/campaigns/${campaignId}/participants/export`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `참여자목록_${campaignId}_${dayjs().format('YYYYMMDD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('참여자 목록을 다운로드했습니다.');
    } catch (error) {
      message.error('참여자 목록 다운로드에 실패했습니다.');
    }
  };

  const handleSendEmail = async () => {
    try {
      await authClient.api.post(`/api/groupbuy/campaigns/${campaignId}/notify`);
      message.success('참여자 전체에게 알림 이메일을 발송했습니다.');
    } catch (error: any) {
      message.error(error.response?.data?.message || '이메일 발송에 실패했습니다.');
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: '결제 대기', color: 'default' };
      case 'paid':
        return { label: '결제 완료', color: 'green' };
      case 'refunded':
        return { label: '환불 완료', color: 'blue' };
      case 'cancelled':
        return { label: '취소', color: 'red' };
      default:
        return { label: status, color: 'default' };
    }
  };

  const columns: ColumnsType<Participant> = [
    {
      title: '참여일시',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    },
    {
      title: '참여자',
      key: 'user',
      render: (_: any, record: Participant) => (
        <div className="flex flex-col">
          <span className="font-medium">{record.user?.name || record.userName}</span>
          <span className="text-sm text-gray-500">{record.user?.email || record.userEmail}</span>
        </div>
      )
    },
    {
      title: '수량',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => `${quantity}개`,
      sorter: (a, b) => a.quantity - b.quantity
    },
    {
      title: '결제 금액',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (totalPrice: number) => `${totalPrice.toLocaleString()}원`,
      sorter: (a, b) => a.totalPrice - b.totalPrice
    },
    {
      title: '결제 상태',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => {
        const config = getPaymentStatusConfig(status);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
      filters: [
        { text: '결제 대기', value: 'pending' },
        { text: '결제 완료', value: 'paid' },
        { text: '환불 완료', value: 'refunded' },
        { text: '취소', value: 'cancelled' }
      ],
      onFilter: (value, record) => record.paymentStatus === value
    }
  ];

  const totalRevenue = participants
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + p.totalPrice, 0);

  const paidCount = participants.filter(p => p.paymentStatus === 'paid').length;

  return (
    <PermissionGuard permission="groupbuy.manage">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="text"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/admin/groupbuy/campaigns')}
              >
                캠페인 목록으로
              </Button>
              <h1 className="text-xl font-semibold">참여자 관리</h1>
            </div>
            <Space>
              <Button
                icon={<Mail className="w-4 h-4" />}
                onClick={handleSendEmail}
              >
                알림 발송
              </Button>
              <Button
                type="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={handleExport}
              >
                엑셀 다운로드
              </Button>
            </Space>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {campaign && (
            <Card className="mb-4">
              <Descriptions title="캠페인 정보" column={3}>
                <Descriptions.Item label="캠페인명">{campaign.title}</Descriptions.Item>
                <Descriptions.Item label="상품명">{campaign.productName}</Descriptions.Item>
                <Descriptions.Item label="상태">
                  <GroupbuyStatusBadge status={campaign.status} />
                </Descriptions.Item>
                <Descriptions.Item label="공동구매가">
                  {campaign.groupbuyPrice.toLocaleString()}원
                </Descriptions.Item>
                <Descriptions.Item label="진행률">
                  {campaign.currentQuantity} / {campaign.minQuantity}개
                  {campaign.maxQuantity && ` (최대 ${campaign.maxQuantity})`}
                </Descriptions.Item>
                <Descriptions.Item label="참여자 수">
                  {campaign.participantCount}명
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Card
            title={
              <div className="flex items-center justify-between">
                <span>참여자 목록 ({participants.length}명)</span>
                <div className="text-sm font-normal text-gray-600">
                  결제 완료: <span className="font-medium text-green-600">{paidCount}명</span>
                  {' / '}
                  총 매출: <span className="font-medium text-blue-600">{totalRevenue.toLocaleString()}원</span>
                </div>
              </div>
            }
          >
            <DataTable
              dataSource={participants}
              columns={columns}
              loading={loading}
              rowKey="id"
            />
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyParticipantsPage;
