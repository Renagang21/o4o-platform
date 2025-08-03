import { ChangeEvent, FC, FormEvent, useEffect, useState } from 'react';
import { Package, DollarSign, Calculator, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  calculateSellPrice, 
  calculateProfitDistribution, 
  validateMinimumMargin,
  formatPrice 
} from '@/utils/vendorUtils';
import { createVendorProduct, updateVendorProduct } from '@/api/vendor/products';
import { useAuth } from '@o4o/auth-context';
import toast from 'react-hot-toast';
import type { VendorProduct, VendorPriceCalculation as PriceCalculation } from '@o4o/types';

interface SupplierProductFormProps {
  product?: VendorProduct;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SupplierProductForm: FC<SupplierProductFormProps> = ({
  product,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const isEdit = !!product;

  // 폼 상태
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    categoryId: product?.categories?.[0] || '',
    supplyPrice: product?.supplyPrice || 0,
    sellPrice: product?.sellPrice || 0,
    marginRate: product?.marginRate || 30,
    affiliateRate: product?.affiliateRate || 5,
    adminFeeRate: product?.adminFeeRate || 3,
    supplierStock: product?.supplierStock || 0,
    lowStockThreshold: product?.lowStockThreshold || 10,
    autoCalculatePrice: true,
    images: product?.images || []
  });

  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);
  const [marginWarning, setMarginWarning] = useState('');
  const [loading, setLoading] = useState(false);

  // 가격 계산
  useEffect(() => {
    if (formData.supplyPrice > 0) {
      // 자동 계산 모드
      if (formData.autoCalculatePrice) {
        const sellPrice = calculateSellPrice(formData.supplyPrice, formData.marginRate);
        setFormData(prev => ({ ...prev, sellPrice }));
      }

      // 수익 분배 계산
      if (formData.sellPrice > 0) {
        const calc = calculateProfitDistribution({
          sellPrice: formData.sellPrice,
          supplyPrice: formData.supplyPrice,
          affiliateRate: formData.affiliateRate,
          adminFeeRate: formData.adminFeeRate
        });
        setPriceCalculation(calc);

        // 마진 검증
        const validation = validateMinimumMargin(
          formData.sellPrice,
          formData.supplyPrice,
          formData.affiliateRate,
          formData.adminFeeRate
        );
        setMarginWarning(validation.isValid ? '' : validation.message || '');
      }
    }
  }, [
    formData.supplyPrice, 
    formData.sellPrice, 
    formData.marginRate, 
    formData.affiliateRate, 
    formData.adminFeeRate,
    formData.autoCalculatePrice
  ]);

  // 입력 핸들러
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 폼 제출
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (marginWarning) {
      toast.error('가격 설정을 확인해주세요');
      return;
    }

    const data: Partial<VendorProduct> = {
      name: formData.name,
      sku: formData.sku,
      description: formData.description,
      categories: formData.categoryId ? [formData.categoryId] : [],
      supplyPrice: formData.supplyPrice,
      sellPrice: formData.sellPrice,
      marginRate: formData.marginRate,
      affiliateRate: formData.affiliateRate,
      adminFeeRate: formData.adminFeeRate,
      supplierStock: formData.supplierStock,
      lowStockThreshold: formData.lowStockThreshold,
      images: formData.images,
      supplierId: user?.id || '',
      approvalStatus: 'pending' as const,
      status: 'draft' as const
    };

    try {
      setLoading(true);
      if (isEdit) {
        await updateVendorProduct(product.id, data);
        toast.success('제품이 수정되었습니다');
      } else {
        await createVendorProduct(data);
        toast.success('제품이 등록되었습니다. 관리자 승인을 기다려주세요.');
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error('제품 저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-modern-primary" />
            제품 기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">제품명*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: any) => handleInputChange('name', e.target.value)}
                placeholder="제품명을 입력하세요"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU*</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e: any) => handleInputChange('sku', e.target.value)}
                placeholder="재고 관리 코드"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">제품 설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              placeholder="제품에 대한 상세 설명을 입력하세요"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">카테고리*</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value: string) => handleInputChange('categoryId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cat1">전자제품</SelectItem>
                <SelectItem value="cat2">의류</SelectItem>
                <SelectItem value="cat3">식품</SelectItem>
                <SelectItem value="cat4">생활용품</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 가격 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-modern-primary" />
            가격 설정
          </CardTitle>
          <CardDescription>
            공급가격을 입력하면 마진율에 따라 판매가격이 자동 계산됩니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplyPrice">공급가격*</Label>
              <Input
                id="supplyPrice"
                type="number"
                value={formData.supplyPrice}
                onChange={(e: any) => handleInputChange('supplyPrice', Number(e.target.value))}
                placeholder="0"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginRate">마진율 (%)</Label>
              <Input
                id="marginRate"
                type="number"
                value={formData.marginRate}
                onChange={(e: any) => handleInputChange('marginRate', Number(e.target.value))}
                placeholder="30"
                min="0"
                max="100"
                disabled={!formData.autoCalculatePrice}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoCalculate"
              checked={formData.autoCalculatePrice}
              onCheckedChange={(checked: boolean) => handleInputChange('autoCalculatePrice', checked)}
            />
            <Label htmlFor="autoCalculate" className="cursor-pointer">
              판매가격 자동 계산
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellPrice">판매가격*</Label>
            <Input
              id="sellPrice"
              type="number"
              value={formData.sellPrice}
              onChange={(e: any) => handleInputChange('sellPrice', Number(e.target.value))}
              placeholder="0"
              min="0"
              required
              disabled={formData.autoCalculatePrice}
            />
          </div>

          {/* 수수료 설정 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="affiliateRate">제휴 수수료율 (%)</Label>
              <Input
                id="affiliateRate"
                type="number"
                value={formData.affiliateRate}
                onChange={(e: any) => handleInputChange('affiliateRate', Number(e.target.value))}
                placeholder="5"
                min="0"
                max="50"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminFeeRate">플랫폼 수수료율 (%)</Label>
              <Input
                id="adminFeeRate"
                type="number"
                value={formData.adminFeeRate}
                onChange={(e: any) => handleInputChange('adminFeeRate', Number(e.target.value))}
                placeholder="3"
                min="0"
                max="50"
                step="0.1"
              />
            </div>
          </div>

          {/* 가격 경고 */}
          {marginWarning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{marginWarning}</AlertDescription>
            </Alert>
          )}

          {/* 수익 계산 결과 */}
          {priceCalculation && !marginWarning && (
            <Card className="bg-modern-bg-tertiary">
              <CardContent className="p-4">
                <h4 className="font-medium text-modern-text-primary mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  수익 분배 계산
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-modern-text-secondary">판매가격</span>
                    <span className="font-medium">{formatPrice(priceCalculation.sellPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-modern-text-secondary">공급가격</span>
                    <span>- {formatPrice(priceCalculation.supplyPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-modern-text-secondary">제휴 수수료</span>
                    <span>- {formatPrice(priceCalculation.affiliateCommission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-modern-text-secondary">플랫폼 수수료</span>
                    <span>- {formatPrice(priceCalculation.adminCommission)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-modern-border-primary">
                    <span className="font-medium text-modern-text-primary">공급자 수익</span>
                    <span className="font-bold text-modern-success">
                      {formatPrice(priceCalculation.supplierProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-modern-text-secondary">수익률</span>
                    <span className="text-modern-text-secondary">
                      {((priceCalculation.supplierProfit / priceCalculation.sellPrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 재고 관리 */}
      <Card>
        <CardHeader>
          <CardTitle>재고 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierStock">현재 재고*</Label>
              <Input
                id="supplierStock"
                type="number"
                value={formData.supplierStock}
                onChange={(e: any) => handleInputChange('supplierStock', Number(e.target.value))}
                placeholder="0"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">재고 부족 알림 기준</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e: any) => handleInputChange('lowStockThreshold', Number(e.target.value))}
                placeholder="10"
                min="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant={"outline" as const} onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" disabled={loading || !!marginWarning}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? '저장 중...' : (isEdit ? '수정하기' : '제품 등록')}
        </Button>
      </div>
    </form>
  );
};