import { useState, useEffect, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface AffiliatePartnerFormData {
  name: string;
  email: string;
  website?: string;
  type: 'influencer' | 'blog' | 'business' | 'individual';
  commissionRate: number;
  paymentMethod: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  paypalEmail?: string;
  businessNumber?: string;
  notes?: string;
}

const AffiliatePartnerForm: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<AffiliatePartnerFormData>({
    name: '',
    email: '',
    website: '',
    type: 'individual',
    commissionRate: 10,
    paymentMethod: 'bank',
    notes: ''
  });

  // Fetch partner data for edit mode
  const { data: partnerData, isLoading } = useQuery({
    queryKey: ['affiliate-partner', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/affiliate/partners/${id}`);
      return response.data;
    },
    enabled: isEditMode
  });
  const partner = partnerData?.data;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AffiliatePartnerFormData) => {
      const response = await authClient.api.post('/v1/affiliate/partners', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('제휴사가 추가되었습니다');
      queryClient.invalidateQueries({ queryKey: ['affiliate-partners'] });
      navigate('/affiliate/partners');
    },
    onError: () => {
      toast.error('제휴사 추가에 실패했습니다');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AffiliatePartnerFormData) => {
      const response = await authClient.api.put(`/v1/affiliate/partners/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('제휴사 정보가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['affiliate-partners'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-partner', id] });
      navigate('/affiliate/partners');
    },
    onError: () => {
      toast.error('제휴사 수정에 실패했습니다');
    }
  });

  // Load partner data in edit mode
  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name,
        email: partner.email,
        website: partner.website || '',
        type: partner.type,
        commissionRate: partner.commissionRate,
        paymentMethod: partner.paymentMethod,
        bankName: partner.bankName || '',
        accountNumber: partner.accountNumber || '',
        accountHolder: partner.accountHolder || '',
        paypalEmail: partner.paypalEmail || '',
        businessNumber: partner.businessNumber || '',
        notes: partner.notes || ''
      });
    }
  }, [partner]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof AffiliatePartnerFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => navigate('/affiliate/partners')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          제휴사 목록
        </Button>
        <h1 className="text-2xl font-bold text-modern-text-primary">
          {isEditMode ? '제휴사 수정' : '새 제휴사 추가'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                제휴사의 기본 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: any) => handleChange('name', e.target.value)}
                  placeholder="예: 김인플루언서"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: any) => handleChange('email', e.target.value)}
                  placeholder="partner@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="website">웹사이트</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e: any) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="type">제휴사 유형 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: string) => handleChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">개인</SelectItem>
                    <SelectItem value="influencer">인플루언서</SelectItem>
                    <SelectItem value="blog">블로그</SelectItem>
                    <SelectItem value="business">비즈니스</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'business' && (
                <div>
                  <Label htmlFor="businessNumber">사업자번호</Label>
                  <Input
                    id="businessNumber"
                    value={formData.businessNumber}
                    onChange={(e: any) => handleChange('businessNumber', e.target.value)}
                    placeholder="123-45-67890"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission & Payment */}
          <Card>
            <CardHeader>
              <CardTitle>수수료 및 결제</CardTitle>
              <CardDescription>
                수수료율과 결제 정보를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="commissionRate">수수료율 (%) *</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e: any) => handleChange('commissionRate', parseFloat(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">결제 방법 *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value: string) => handleChange('paymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">계좌이체</SelectItem>
                    <SelectItem value="paypal">페이팔</SelectItem>
                    {formData.type === 'business' && (
                      <SelectItem value="invoice">세금계산서</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentMethod === 'bank' && (
                <>
                  <div>
                    <Label htmlFor="bankName">은행명</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e: any) => handleChange('bankName', e.target.value)}
                      placeholder="예: 국민은행"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">계좌번호</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e: any) => handleChange('accountNumber', e.target.value)}
                      placeholder="123-456-789012"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountHolder">예금주</Label>
                    <Input
                      id="accountHolder"
                      value={formData.accountHolder}
                      onChange={(e: any) => handleChange('accountHolder', e.target.value)}
                      placeholder="예금주명"
                    />
                  </div>
                </>
              )}

              {formData.paymentMethod === 'paypal' && (
                <div>
                  <Label htmlFor="paypalEmail">페이팔 이메일</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    value={formData.paypalEmail}
                    onChange={(e: any) => handleChange('paypalEmail', e.target.value)}
                    placeholder="paypal@example.com"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>추가 정보</CardTitle>
              <CardDescription>
                메모나 특이사항을 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e: any) => handleChange('notes', e.target.value)}
                placeholder="제휴사에 대한 메모나 특이사항을 입력하세요..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant={"outline" as const}
            onClick={() => navigate('/affiliate/partners')}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? '수정하기' : '추가하기'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AffiliatePartnerForm;