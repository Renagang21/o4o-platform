import { FC, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, 
  X, 
  Calendar,
  Percent,
  DollarSign,
  Package,
  Users,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface CouponFormData {
  code: string;
  description: string;
  discountType: 'percent' | 'fixed_cart' | 'fixed_product';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimitPerCoupon: number;
  usageLimitPerCustomer: number;
  productIds?: string[];
  categoryIds?: string[];
  excludeProductIds?: string[];
  customerIds?: string[];
  freeShipping: boolean;
  excludeSaleItems: boolean;
  individualUseOnly: boolean;
}

const CouponForm: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    description: '',
    discountType: 'percent',
    discountValue: 0,
    usageLimitPerCoupon: 0,
    usageLimitPerCustomer: 1,
    freeShipping: false,
    excludeSaleItems: false,
    individualUseOnly: true
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load coupon data if editing
  useEffect(() => {
    if (isEditing) {
      fetchCoupon();
    }
  }, [id]);

  const fetchCoupon = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/v1/coupons/${id}`);
      const coupon = response.data.data;
      
      setFormData({
        ...coupon,
        validFrom: coupon.validFrom ? coupon.validFrom.split('T')[0] : '',
        validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : ''
      });
    } catch (error) {
      console.error('Error fetching coupon:', error);
      toast.error('Failed to load coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.code) {
      toast.error('쿠폰 코드를 입력해주세요');
      return;
    }

    if (formData.discountValue <= 0) {
      toast.error('할인 값을 입력해주세요');
      return;
    }

    if (formData.discountType === 'percent' && formData.discountValue > 100) {
      toast.error('퍼센트 할인은 100%를 초과할 수 없습니다');
      return;
    }

    try {
      setSaving(true);

      const dataToSend = {
        ...formData,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
        minOrderAmount: formData.minOrderAmount || undefined,
        maxDiscountAmount: formData.maxDiscountAmount || undefined
      };

      if (isEditing) {
        await api.put(`/v1/coupons/${id}`, dataToSend);
        toast.success('쿠폰이 수정되었습니다');
      } else {
        await api.post('/v1/coupons', dataToSend);
        toast.success('쿠폰이 생성되었습니다');
      }

      navigate('/ecommerce/coupons');
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      const message = error.response?.data?.message || 'Failed to save coupon';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? '쿠폰 수정' : '새 쿠폰 만들기'}
          </h1>
          <p className="text-gray-600 mt-1">
            할인 쿠폰을 생성하고 설정하세요
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/ecommerce/coupons')}
        >
          <X className="w-4 h-4 mr-2" />
          취소
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  쿠폰 코드 *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: WELCOME10"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  할인 타입 *
                </label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percent">퍼센트 할인</option>
                  <option value="fixed_cart">정액 할인 (장바구니)</option>
                  <option value="fixed_product">정액 할인 (상품별)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  할인 값 *
                </label>
                <div className="relative">
                  {formData.discountType === 'percent' ? (
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  ) : (
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  )}
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  설명
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="쿠폰 설명"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle>사용 제한</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  최소 주문 금액
                </label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={formData.minOrderAmount || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  최대 할인 금액
                </label>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  총 사용 제한
                </label>
                <input
                  type="number"
                  name="usageLimitPerCoupon"
                  value={formData.usageLimitPerCoupon}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0 (무제한)"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">0은 무제한</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  고객당 사용 제한
                </label>
                <input
                  type="number"
                  name="usageLimitPerCustomer"
                  value={formData.usageLimitPerCustomer}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Period */}
        <Card>
          <CardHeader>
            <CardTitle>유효 기간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  시작일
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    name="validFrom"
                    value={formData.validFrom || ''}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  종료일
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    name="validUntil"
                    value={formData.validUntil || ''}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Options */}
        <Card>
          <CardHeader>
            <CardTitle>추가 옵션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="freeShipping"
                  checked={formData.freeShipping}
                  onChange={handleInputChange}
                  className="mr-3 rounded"
                />
                <span className="text-sm">무료 배송 포함</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="excludeSaleItems"
                  checked={formData.excludeSaleItems}
                  onChange={handleInputChange}
                  className="mr-3 rounded"
                />
                <span className="text-sm">세일 상품 제외</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="individualUseOnly"
                  checked={formData.individualUseOnly}
                  onChange={handleInputChange}
                  className="mr-3 rounded"
                />
                <span className="text-sm">다른 쿠폰과 중복 사용 불가</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/ecommerce/coupons')}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? '수정' : '생성'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CouponForm;