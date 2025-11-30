import { FC, useEffect, useState } from 'react';
import { Card, DatePicker, Button, message, Select, Statistic, Row, Col } from 'antd';
import { Download, DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import ResourceHeader from '@/components/common/ResourceHeader';
import DataTable from '@/components/common/DataTable';
import PermissionGuard from '@/components/organization/PermissionGuard';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface SettlementRecord {
  id: string;
  campaignId: string;
  campaignTitle: string;
  organizationId?: string;
  organizationName?: string;
  totalRevenue: number;
  platformCommission: number;
  sellerRevenue: number;
  participantCount: number;
  orderCount: number;
  settlementDate: string;
  status: 'pending' | 'completed' | 'cancelled';
}

interface SettlementSummary {
  totalRevenue: number;
  totalCommission: number;
  totalSellerRevenue: number;
  totalCampaigns: number;
  totalParticipants: number;
  totalOrders: number;
}

const GroupbuySettlementReport: FC = () => {
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [summary, setSummary] = useState<SettlementSummary>({
    totalRevenue: 0,
    totalCommission: 0,
    totalSellerRevenue: 0,
    totalCampaigns: 0,
    totalParticipants: 0,
    totalOrders: 0
  });
  const [selectedOrg, setSelectedOrg] = useState<string>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1, 'month'),
    dayjs()
  ]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettlements();
  }, [selectedOrg, dateRange, statusFilter]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const params: any = {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString()
      };

      if (selectedOrg) params.organizationId = selectedOrg;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await authClient.api.get('/api/groupbuy/settlements', { params });
      setSettlements(response.data.settlements || []);

      // Calculate summary
      const records = response.data.settlements || [];
      const newSummary: SettlementSummary = {
        totalRevenue: records.reduce((sum: number, r: SettlementRecord) => sum + r.totalRevenue, 0),
        totalCommission: records.reduce((sum: number, r: SettlementRecord) => sum + r.platformCommission, 0),
        totalSellerRevenue: records.reduce((sum: number, r: SettlementRecord) => sum + r.sellerRevenue, 0),
        totalCampaigns: records.length,
        totalParticipants: records.reduce((sum: number, r: SettlementRecord) => sum + r.participantCount, 0),
        totalOrders: records.reduce((sum: number, r: SettlementRecord) => sum + r.orderCount, 0)
      };
      setSummary(newSummary);
    } catch (error) {
      message.error('정산 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString()
      };

      if (selectedOrg) params.organizationId = selectedOrg;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await authClient.api.get('/api/groupbuy/settlements/export', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `정산내역_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('정산 내역을 다운로드했습니다.');
    } catch (error) {
      message.error('정산 내역 다운로드에 실패했습니다.');
    }
  };

  const columns: ColumnsType<SettlementRecord> = [
    {
      title: '정산일',
      dataIndex: 'settlementDate',
      key: 'settlementDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a, b) => new Date(a.settlementDate).getTime() - new Date(b.settlementDate).getTime()
    },
    {
      title: '캠페인',
      dataIndex: 'campaignTitle',
      key: 'campaignTitle',
      render: (title: string, record: SettlementRecord) => (
        <div className="flex flex-col">
          <span className="font-medium">{title}</span>
          {record.organizationName && (
            <span className="text-sm text-gray-500">{record.organizationName}</span>
          )}
        </div>
      )
    },
    {
      title: '참여자/주문',
      key: 'counts',
      render: (_: any, record: SettlementRecord) => (
        <div className="text-sm">
          <div>{record.participantCount}명</div>
          <div className="text-gray-500">{record.orderCount}건</div>
        </div>
      )
    },
    {
      title: '총 매출',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (revenue: number) => (
        <span className="font-medium">{revenue.toLocaleString()}원</span>
      ),
      sorter: (a, b) => a.totalRevenue - b.totalRevenue
    },
    {
      title: '플랫폼 수수료',
      dataIndex: 'platformCommission',
      key: 'platformCommission',
      render: (commission: number) => (
        <span className="text-blue-600">{commission.toLocaleString()}원</span>
      ),
      sorter: (a, b) => a.platformCommission - b.platformCommission
    },
    {
      title: '판매자 정산액',
      dataIndex: 'sellerRevenue',
      key: 'sellerRevenue',
      render: (revenue: number) => (
        <span className="text-green-600 font-medium">{revenue.toLocaleString()}원</span>
      ),
      sorter: (a, b) => a.sellerRevenue - b.sellerRevenue
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          pending: { label: '정산 대기', color: 'text-orange-600' },
          completed: { label: '정산 완료', color: 'text-green-600' },
          cancelled: { label: '취소', color: 'text-red-600' }
        }[status] || { label: status, color: 'text-gray-600' };

        return <span className={`${config.color} font-medium`}>{config.label}</span>;
      }
    }
  ];

  return (
    <PermissionGuard permission="groupbuy.manage">
      <div className="h-full flex flex-col">
        <ResourceHeader
          title="정산 관리"
          description="공동구매 정산 내역을 조회합니다"
          showOrgSelector
          selectedOrg={selectedOrg}
          onOrgChange={setSelectedOrg}
          filterByPermission
        />

        <div className="flex-1 p-6 overflow-auto">
          {/* Filters */}
          <Card className="mb-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">기간 선택</label>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
                  className="w-full"
                  format="YYYY-MM-DD"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="w-full"
                >
                  <Select.Option value="all">전체</Select.Option>
                  <Select.Option value="pending">정산 대기</Select.Option>
                  <Select.Option value="completed">정산 완료</Select.Option>
                  <Select.Option value="cancelled">취소</Select.Option>
                </Select>
              </div>
              <div className="pt-7">
                <Button
                  type="primary"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExport}
                >
                  엑셀 다운로드
                </Button>
              </div>
            </div>
          </Card>

          {/* Summary Statistics */}
          <Card className="mb-4">
            <Row gutter={16}>
              <Col span={4}>
                <Statistic
                  title="총 매출"
                  value={summary.totalRevenue}
                  prefix={<DollarSign className="w-4 h-4" />}
                  suffix="원"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="플랫폼 수수료"
                  value={summary.totalCommission}
                  prefix={<TrendingUp className="w-4 h-4" />}
                  suffix="원"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="판매자 정산액"
                  value={summary.totalSellerRevenue}
                  prefix={<DollarSign className="w-4 h-4" />}
                  suffix="원"
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="캠페인 수"
                  value={summary.totalCampaigns}
                  prefix={<ShoppingCart className="w-4 h-4" />}
                  suffix="개"
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="참여자 수"
                  value={summary.totalParticipants}
                  prefix={<Users className="w-4 h-4" />}
                  suffix="명"
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="주문 건수"
                  value={summary.totalOrders}
                  prefix={<ShoppingCart className="w-4 h-4" />}
                  suffix="건"
                />
              </Col>
            </Row>
          </Card>

          {/* Settlement Table */}
          <Card>
            <DataTable
              dataSource={settlements}
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

export default GroupbuySettlementReport;
