import { FC, useEffect, useState } from 'react';
import { Card, Form, Input, Button, DatePicker, InputNumber, Select, message, Spin } from 'antd';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import PermissionGuard from '@/components/organization/PermissionGuard';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const GroupbuyCampaignForm: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      fetchCampaign(id);
    }
  }, [id]);

  const fetchCampaign = async (campaignId: string) => {
    setLoading(true);
    try {
      const response = await authClient.api.get(`/api/groupbuy/campaigns/${campaignId}`);
      const campaign = response.data;

      form.setFieldsValue({
        ...campaign,
        dateRange: [dayjs(campaign.startAt), dayjs(campaign.endAt)]
      });
    } catch (error) {
      message.error('캠페인 정보를 불러오는데 실패했습니다.');
      navigate('/admin/groupbuy/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        startAt: values.dateRange[0].toISOString(),
        endAt: values.dateRange[1].toISOString()
      };
      delete payload.dateRange;

      if (isEditMode && id) {
        await authClient.api.put(`/api/groupbuy/campaigns/${id}`, payload);
        message.success('캠페인이 수정되었습니다.');
      } else {
        await authClient.api.post('/api/groupbuy/campaigns', payload);
        message.success('캠페인이 생성되었습니다.');
      }

      navigate('/admin/groupbuy/campaigns');
    } catch (error: any) {
      message.error(error.response?.data?.message || '캠페인 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

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
                목록으로
              </Button>
              <h1 className="text-xl font-semibold">
                {isEditMode ? '캠페인 수정' : '새 캠페인 만들기'}
              </h1>
            </div>
            <Button
              type="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={() => form.submit()}
              loading={submitting}
            >
              저장
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 overflow-auto">
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                commissionRate: 10,
                status: 'draft'
              }}
            >
              {/* Basic Info */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4">기본 정보</h2>

                <Form.Item
                  label="캠페인 제목"
                  name="title"
                  rules={[{ required: true, message: '캠페인 제목을 입력하세요' }]}
                >
                  <Input size="large" placeholder="예: 2025년 봄 공동구매" />
                </Form.Item>

                <Form.Item
                  label="설명"
                  name="description"
                >
                  <TextArea rows={4} placeholder="캠페인에 대한 상세 설명을 입력하세요" />
                </Form.Item>

                <Form.Item
                  label="조직 ID"
                  name="organizationId"
                  help="특정 조직 전용 캠페인인 경우 입력하세요 (선택사항)"
                >
                  <Input placeholder="조직 ID" />
                </Form.Item>
              </div>

              {/* Product Info */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4">상품 정보</h2>

                <Form.Item
                  label="상품명"
                  name="productName"
                  rules={[{ required: true, message: '상품명을 입력하세요' }]}
                >
                  <Input size="large" placeholder="예: 유기농 사과 5kg" />
                </Form.Item>

                <Form.Item
                  label="상품 이미지 URL"
                  name="productImage"
                  help="상품 이미지 URL을 입력하세요"
                >
                  <Input placeholder="https://..." />
                </Form.Item>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4">가격 설정</h2>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item
                    label="정가"
                    name="originalPrice"
                    rules={[{ required: true, message: '정가를 입력하세요' }]}
                  >
                    <InputNumber
                      size="large"
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
                      size="large"
                      min={0}
                      placeholder="35000"
                      className="w-full"
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      addonAfter="원"
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  label="수수료율"
                  name="commissionRate"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    size="large"
                    min={0}
                    max={100}
                    placeholder="10"
                    className="w-full"
                    addonAfter="%"
                  />
                </Form.Item>
              </div>

              {/* Quantity Settings */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4">수량 설정</h2>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item
                    label="최소 수량"
                    name="minQuantity"
                    rules={[{ required: true, message: '최소 수량을 입력하세요' }]}
                    help="공동구매 성공을 위한 최소 수량"
                  >
                    <InputNumber
                      size="large"
                      min={1}
                      placeholder="50"
                      className="w-full"
                      addonAfter="개"
                    />
                  </Form.Item>

                  <Form.Item
                    label="최대 수량"
                    name="maxQuantity"
                    help="수량 제한이 없으면 비워두세요"
                  >
                    <InputNumber
                      size="large"
                      min={1}
                      placeholder="제한 없음"
                      className="w-full"
                      addonAfter="개"
                    />
                  </Form.Item>
                </div>
              </div>

              {/* Schedule */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4">일정</h2>

                <Form.Item
                  label="진행 기간"
                  name="dateRange"
                  rules={[{ required: true, message: '진행 기간을 선택하세요' }]}
                >
                  <RangePicker
                    size="large"
                    showTime
                    className="w-full"
                    format="YYYY-MM-DD HH:mm"
                  />
                </Form.Item>
              </div>

              {/* Status */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4">상태</h2>

                <Form.Item
                  label="캠페인 상태"
                  name="status"
                  rules={[{ required: true }]}
                >
                  <Select size="large">
                    <Select.Option value="draft">초안</Select.Option>
                    <Select.Option value="upcoming">시작 예정</Select.Option>
                    <Select.Option value="active">진행 중</Select.Option>
                    <Select.Option value="success">성공</Select.Option>
                    <Select.Option value="failed">실패</Select.Option>
                    <Select.Option value="closed">종료</Select.Option>
                    <Select.Option value="cancelled">취소</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyCampaignForm;
