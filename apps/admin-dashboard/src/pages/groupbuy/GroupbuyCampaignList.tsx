import { FC, useEffect, useState } from 'react';
import { Card, Button, Modal, Form, Input, Select, message, Popconfirm, DatePicker, InputNumber, Switch } from 'antd';
import { Plus, Edit, Trash2, Users, FileText } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import ResourceHeader from '@/components/common/ResourceHeader';
import DataTable from '@/components/common/DataTable';
import PermissionGuard from '@/components/organization/PermissionGuard';
import { GroupbuyStatusBadge, GroupbuyQuantityProgressBar, DeadlineCountdown } from '@/components/groupbuy';
import type { ColumnsType } from 'antd/es/table';
import type { GroupbuyStatus } from '@/components/groupbuy/GroupbuyStatusBadge';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface GroupbuyCampaign {
  id: string;
  title: string;
  description?: string;
  organizationId?: string;
  productName: string;
  productImage?: string;
  originalPrice: number;
  groupbuyPrice: number;
  minQuantity: number;
  maxQuantity?: number;
  currentQuantity: number;
  startAt: string;
  endAt: string;
  status: GroupbuyStatus;
  commissionRate: number;
  participantCount: number;
  organization?: {
    id: string;
    name: string;
  };
}

const GroupbuyCampaignList: FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<GroupbuyCampaign[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<GroupbuyCampaign | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCampaigns();
  }, [selectedOrg]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedOrg) params.organizationId = selectedOrg;

      const response = await authClient.api.get('/api/groupbuy/campaigns', { params });
      setCampaigns(response.data);
    } catch (error) {
      message.error('캠페인 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setSelectedCampaign(null);
    if (selectedOrg) {
      form.setFieldsValue({ organizationId: selectedOrg });
    }
    setModalOpen(true);
  };

  const handleEdit = (campaign: GroupbuyCampaign) => {
    setSelectedCampaign(campaign);
    form.setFieldsValue({
      ...campaign,
      dateRange: [dayjs(campaign.startAt), dayjs(campaign.endAt)]
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await authClient.api.delete(`/api/groupbuy/campaigns/${id}`);
      message.success('캠페인이 삭제되었습니다.');
      fetchCampaigns();
    } catch (error: any) {
      message.error(error.response?.data?.message || '캠페인 삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        startAt: values.dateRange[0].toISOString(),
        endAt: values.dateRange[1].toISOString()
      };
      delete payload.dateRange;

      if (selectedCampaign) {
        await authClient.api.put(`/api/groupbuy/campaigns/${selectedCampaign.id}`, payload);
        message.success('캠페인이 수정되었습니다.');
      } else {
        await authClient.api.post('/api/groupbuy/campaigns', payload);
        message.success('캠페인이 생성되었습니다.');
      }

      setModalOpen(false);
      fetchCampaigns();
    } catch (error: any) {
      message.error(error.response?.data?.message || '캠페인 저장에 실패했습니다.');
    }
  };

  const handleViewParticipants = (campaignId: string) => {
    navigate(`/admin/groupbuy/campaigns/${campaignId}/participants`);
  };

  const columns: ColumnsType<GroupbuyCampaign> = [
    {
      title: '상품명',
      dataIndex: 'productName',
      key: 'productName',
      render: (productName: string, record: GroupbuyCampaign) => (
        <div className="flex flex-col">
          <span className="font-medium">{productName}</span>
          <span className="text-sm text-gray-500">{record.title}</span>
        </div>
      )
    },
    {
      title: '조직',
      dataIndex: ['organization', 'name'],
      key: 'organization',
      render: (name: string) => name || '-'
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: GroupbuyStatus) => <GroupbuyStatusBadge status={status} />
    },
    {
      title: '가격',
      key: 'price',
      render: (_: any, record: GroupbuyCampaign) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-400 line-through">
            {record.originalPrice.toLocaleString()}원
          </span>
          <span className="font-medium text-blue-600">
            {record.groupbuyPrice.toLocaleString()}원
          </span>
        </div>
      )
    },
    {
      title: '진행률',
      key: 'progress',
      render: (_: any, record: GroupbuyCampaign) => (
        <GroupbuyQuantityProgressBar
          currentQuantity={record.currentQuantity}
          minQuantity={record.minQuantity}
          maxQuantity={record.maxQuantity}
          size="small"
        />
      )
    },
    {
      title: '마감',
      dataIndex: 'endAt',
      key: 'deadline',
      render: (endAt: string) => <DeadlineCountdown deadline={endAt} format="compact" />
    },
    {
      title: '참여자',
      dataIndex: 'participantCount',
      key: 'participantCount',
      render: (count: number) => `${count}명`
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: GroupbuyCampaign) => (
        <div className="flex gap-2">
          <Button
            type="text"
            size="small"
            icon={<Users className="w-4 h-4" />}
            onClick={() => handleViewParticipants(record.id)}
            title="참여자 관리"
          />
          <Button
            type="text"
            size="small"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="캠페인 삭제"
            description="이 캠페인을 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<Trash2 className="w-4 h-4" />}
            />
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <PermissionGuard permission="groupbuy.manage">
      <div className="h-full flex flex-col">
        <ResourceHeader
          title="공동구매 캠페인"
          description="공동구매 캠페인을 관리합니다"
          showOrgSelector
          selectedOrg={selectedOrg}
          onOrgChange={setSelectedOrg}
          showAddButton
          addButtonLabel="캠페인 추가"
          onAdd={handleAdd}
          filterByPermission
        />

        <div className="flex-1 p-6">
          <Card>
            <DataTable
              dataSource={campaigns}
              columns={columns}
              loading={loading}
              rowKey="id"
            />
          </Card>
        </div>

        {/* Create/Edit Modal */}
        <Modal
          title={selectedCampaign ? '캠페인 수정' : '캠페인 생성'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={() => form.submit()}
          okText="저장"
          cancelText="취소"
          width={700}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="캠페인 제목"
              name="title"
              rules={[{ required: true, message: '캠페인 제목을 입력하세요' }]}
            >
              <Input placeholder="예: 2025년 봄 공동구매" />
            </Form.Item>

            <Form.Item
              label="설명"
              name="description"
            >
              <TextArea rows={3} placeholder="캠페인 설명" />
            </Form.Item>

            <Form.Item
              label="상품명"
              name="productName"
              rules={[{ required: true, message: '상품명을 입력하세요' }]}
            >
              <Input placeholder="예: 유기농 사과 5kg" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                label="정가"
                name="originalPrice"
                rules={[{ required: true, message: '정가를 입력하세요' }]}
              >
                <InputNumber
                  min={0}
                  placeholder="50000"
                  className="w-full"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="원"
                />
              </Form.Item>

              <Form.Item
                label="공동구매가"
                name="groupbuyPrice"
                rules={[{ required: true, message: '공동구매가를 입력하세요' }]}
              >
                <InputNumber
                  min={0}
                  placeholder="35000"
                  className="w-full"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="원"
                />
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                label="최소 수량"
                name="minQuantity"
                rules={[{ required: true, message: '최소 수량을 입력하세요' }]}
              >
                <InputNumber min={1} placeholder="50" className="w-full" addonAfter="개" />
              </Form.Item>

              <Form.Item
                label="최대 수량"
                name="maxQuantity"
              >
                <InputNumber min={1} placeholder="제한 없음" className="w-full" addonAfter="개" />
              </Form.Item>
            </div>

            <Form.Item
              label="진행 기간"
              name="dateRange"
              rules={[{ required: true, message: '진행 기간을 선택하세요' }]}
            >
              <RangePicker showTime className="w-full" />
            </Form.Item>

            <Form.Item
              label="수수료율"
              name="commissionRate"
              initialValue={10}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} placeholder="10" className="w-full" addonAfter="%" />
            </Form.Item>

            <Form.Item
              label="조직 ID"
              name="organizationId"
            >
              <Input placeholder="조직 ID (선택사항)" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyCampaignList;
