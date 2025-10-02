import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Calculator,
  Shield,
  DollarSign,
  Percent,
  FileText
} from 'lucide-react';

interface SupplierProductEditorProps {
  attributes?: {
    productId?: string;
    mode?: 'create' | 'edit';
    autoSave?: boolean;
  };
  content?: string;
}

interface ProductFormData {
  title: string;
  description: string;
  sku: string;
  supplier_sku: string;
  cost_price: number;
  msrp: number;
  partner_commission_rate: number;
  shipping_days_min: number;
  shipping_days_max: number;
  shipping_fee: number;
}

interface ValidationErrors {
  [key: string]: string;
}

const SupplierProductEditor: React.FC<SupplierProductEditorProps> = ({ 
  attributes = {
    mode: 'edit',
    autoSave: false
  } 
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    sku: '',
    supplier_sku: '',
    cost_price: 0,
    msrp: 0,
    partner_commission_rate: 5,
    shipping_days_min: 3,
    shipping_days_max: 7,
    shipping_fee: 0
  });

  const [originalData, setOriginalData] = useState<ProductFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [marginRate, setMarginRate] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [complianceCheck, setComplianceCheck] = useState({
    isCompliant: true,
    violations: [] as string[],
    warnings: [] as string[]
  });

  useEffect(() => {
    if (attributes.productId && attributes.mode === 'edit') {
      fetchProductData();
    }
  }, [attributes.productId]);

  useEffect(() => {
    // Calculate margin rate when prices change
    if (formData.msrp > 0) {
      const margin = ((formData.msrp - formData.cost_price) / formData.msrp) * 100;
      setMarginRate(Math.max(0, margin));
    }

    // Check for changes
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }

    // Auto-save if enabled
    if (attributes.autoSave && hasChanges) {
      const timer = setTimeout(() => {
        handleSave(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [formData]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/dropshipping/supplier/products/${attributes.productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('상품 정보를 불러올 수 없습니다');
      }

      const data = await response.json();
      setFormData(data.product);
      setOriginalData(data.product);
      setPendingApproval(data.has_pending_approval);

    } catch (error) {
      
      setErrors({ general: '상품 정보를 불러오는데 실패했습니다' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.title) {
      newErrors.title = '상품명은 필수입니다';
    }

    if (!formData.sku) {
      newErrors.sku = 'SKU는 필수입니다';
    }

    if (formData.cost_price <= 0) {
      newErrors.cost_price = '공급가는 0보다 커야 합니다';
    }

    if (formData.msrp <= 0) {
      newErrors.msrp = 'MSRP는 0보다 커야 합니다';
    }

    if (formData.msrp < formData.cost_price) {
      newErrors.msrp = 'MSRP는 공급가보다 높아야 합니다';
    }

    if (formData.partner_commission_rate < 0 || formData.partner_commission_rate > 50) {
      newErrors.partner_commission_rate = '수수료율은 0~50% 사이여야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkLegalCompliance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/approval/check-compliance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changes: {
            cost_price: formData.cost_price,
            msrp: formData.msrp,
            partner_commission_rate: formData.partner_commission_rate,
            msrp_is_recommended: true
          }
        })
      });

      const result = await response.json();
      setComplianceCheck(result.data);
      return result.data.isCompliant;

    } catch (error) {
      
      return true; // Default to compliant if check fails
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!validateForm()) return;

    setSaving(true);
    setSuccessMessage('');

    try {
      // Check legal compliance first
      const isCompliant = await checkLegalCompliance();
      if (!isCompliant && !isAutoSave) {
        setErrors({ general: '법적 준수 요건을 충족하지 못했습니다' });
        setSaving(false);
        return;
      }

      const token = localStorage.getItem('token');
      const endpoint = attributes.mode === 'create' 
        ? '/api/v1/dropshipping/supplier/products'
        : `/api/v1/dropshipping/supplier/products/${attributes.productId}`;

      const method = attributes.mode === 'create' ? 'POST' : 'PUT';

      // First, save the product
      const productResponse = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!productResponse.ok) {
        throw new Error('상품 저장에 실패했습니다');
      }

      const productResult = await productResponse.json();

      // If editing and prices/commission changed, create approval request
      if (attributes.mode === 'edit' && originalData) {
        const priceChanged = formData.cost_price !== originalData.cost_price || 
                           formData.msrp !== originalData.msrp ||
                           formData.partner_commission_rate !== originalData.partner_commission_rate;

        if (priceChanged) {
          const approvalResponse = await fetch('/api/v1/approval/pricing', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entityId: attributes.productId,
              changes: {
                cost_price: formData.cost_price,
                msrp: formData.msrp,
                partner_commission_rate: formData.partner_commission_rate
              },
              currentValues: {
                cost_price: originalData.cost_price,
                msrp: originalData.msrp,
                partner_commission_rate: originalData.partner_commission_rate
              }
            })
          });

          if (approvalResponse.ok) {
            setPendingApproval(true);
            setSuccessMessage('변경사항이 저장되었으며 관리자 승인을 기다리고 있습니다');
          }
        } else {
          setSuccessMessage(isAutoSave ? '자동 저장되었습니다' : '성공적으로 저장되었습니다');
        }
      } else {
        setSuccessMessage('성공적으로 저장되었습니다');
      }

      setOriginalData(formData);
      setHasChanges(false);

      if (!isAutoSave) {
        setTimeout(() => setSuccessMessage(''), 3000);
      }

    } catch (error) {
      
      setErrors({ general: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>상품 정보를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="supplier-product-editor max-w-4xl mx-auto">
      {/* Legal Compliance Header */}
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>⚖️ 공정거래법 준수</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• MSRP는 <strong>권장 소비자 가격</strong>이며, 실제 판매가는 판매자가 자율 결정합니다</li>
            <li>• 가격 및 수수료율 변경은 <strong>관리자 승인</strong>이 필요합니다</li>
            <li>• 판매자의 가격 자율성은 법적으로 보호됩니다</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Pending Approval Notice */}
      {pendingApproval && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>승인 대기중</strong><br />
            이전 변경사항이 관리자 승인을 기다리고 있습니다. 승인 완료 후 추가 수정이 가능합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Check Results */}
      {complianceCheck.violations.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>법적 준수 위반사항:</strong>
            <ul className="mt-2 space-y-1">
              {complianceCheck.violations.map((v, i) => (
                <li key={i}>• {v}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {attributes.mode === 'create' ? '새 상품 등록' : '상품 정보 수정'}
          </CardTitle>
          <CardDescription>
            공급자 전용 상품 정보 관리 화면입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">기본 정보</h3>
            
            <div>
              <Label htmlFor="title">상품명 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="예: 프리미엄 무선 이어폰"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label htmlFor="description">상품 설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="상품의 특징과 장점을 설명하세요"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="예: SKU-12345"
                  className={errors.sku ? 'border-red-500' : ''}
                />
                {errors.sku && <p className="text-sm text-red-500 mt-1">{errors.sku}</p>}
              </div>
              <div>
                <Label htmlFor="supplier_sku">공급자 상품코드</Label>
                <Input
                  id="supplier_sku"
                  value={formData.supplier_sku}
                  onChange={(e) => handleInputChange('supplier_sku', e.target.value)}
                  placeholder="예: SUP-67890"
                />
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              가격 정보 (관리자 승인 필요)
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cost_price">
                  공급가 *
                  <span className="text-xs text-gray-500 ml-2">(VAT 포함)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">₩</span>
                  <Input
                    id="cost_price"
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => handleInputChange('cost_price', Number(e.target.value))}
                    className={`pl-8 ${errors.cost_price ? 'border-red-500' : ''}`}
                    disabled={pendingApproval}
                  />
                </div>
                {errors.cost_price && <p className="text-sm text-red-500 mt-1">{errors.cost_price}</p>}
              </div>

              <div>
                <Label htmlFor="msrp">
                  MSRP (권장 소비자 가격) *
                  <span className="text-xs text-gray-500 ml-2">참고용</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">₩</span>
                  <Input
                    id="msrp"
                    type="number"
                    value={formData.msrp}
                    onChange={(e) => handleInputChange('msrp', Number(e.target.value))}
                    className={`pl-8 ${errors.msrp ? 'border-red-500' : ''}`}
                    disabled={pendingApproval}
                  />
                </div>
                {errors.msrp && <p className="text-sm text-red-500 mt-1">{errors.msrp}</p>}
              </div>

              <div>
                <Label htmlFor="margin">
                  예상 마진율
                  <span className="text-xs text-gray-500 ml-2">자동계산</span>
                </Label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
                  <Calculator className="h-4 w-4 mr-2 text-gray-500" />
                  <span className={`font-medium ${
                    marginRate > 20 ? 'text-green-600' : 
                    marginRate > 10 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {marginRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                MSRP는 권장 가격이며, 실제 판매가는 판매자가 자율적으로 결정합니다. 
                이는 공정거래법 준수를 위한 필수 사항입니다.
              </AlertDescription>
            </Alert>
          </div>

          {/* Commission Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Percent className="h-5 w-5" />
              파트너 수수료 설정
            </h3>
            
            <div>
              <Label htmlFor="partner_commission_rate">
                파트너 수수료율 (%) *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="partner_commission_rate"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={formData.partner_commission_rate}
                  onChange={(e) => handleInputChange('partner_commission_rate', Number(e.target.value))}
                  className={`w-32 ${errors.partner_commission_rate ? 'border-red-500' : ''}`}
                  disabled={pendingApproval}
                />
                <span className="text-gray-500">%</span>
              </div>
              {errors.partner_commission_rate && (
                <p className="text-sm text-red-500 mt-1">{errors.partner_commission_rate}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                판매 시 파트너에게 지급할 수수료율을 설정하세요
              </p>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">배송 정보</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="shipping_days_min">최소 배송일</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="shipping_days_min"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.shipping_days_min}
                    onChange={(e) => handleInputChange('shipping_days_min', Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-gray-500">일</span>
                </div>
              </div>

              <div>
                <Label htmlFor="shipping_days_max">최대 배송일</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="shipping_days_max"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.shipping_days_max}
                    onChange={(e) => handleInputChange('shipping_days_max', Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-gray-500">일</span>
                </div>
              </div>

              <div>
                <Label htmlFor="shipping_fee">배송비</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">₩</span>
                  <Input
                    id="shipping_fee"
                    type="number"
                    min="0"
                    step="500"
                    value={formData.shipping_fee}
                    onChange={(e) => handleInputChange('shipping_fee', Number(e.target.value))}
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">0원 = 무료배송</p>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-yellow-600">
                  변경사항 있음
                </Badge>
              )}
              {attributes.autoSave && (
                <Badge variant="outline" className="text-blue-600">
                  자동 저장 활성화
                </Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
              >
                취소
              </Button>
              <Button
                onClick={() => handleSave()}
                disabled={saving || pendingApproval || !hasChanges}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {pendingApproval ? '승인 대기중' : '저장'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierProductEditor;