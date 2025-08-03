import { ChangeEvent, FC, useState } from 'react';
import { Plus, Trash2, Image as ImageIcon, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  options: Record<string, string>; // { color: 'Red', size: 'M' }
  price: number;
  compareAtPrice?: number;
  stock: number;
  weight?: number;
  image?: string;
  barcode?: string;
  active: boolean;
}

interface ProductVariantManagerProps {
  options: ProductOption[];
  variants: ProductVariant[];
  basePrice: number;
  baseSku: string;
  onOptionsChange: (options: ProductOption[]) => void;
  onVariantsChange: (variants: ProductVariant[]) => void;
}

const ProductVariantManager: FC<ProductVariantManagerProps> = ({
  options,
  variants,
  basePrice,
  baseSku,
  onOptionsChange,
  onVariantsChange
}) => {
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState('');

  // Generate all possible variant combinations
  const generateVariantCombinations = (opts: ProductOption[]): Record<string, string>[] => {
    if (opts.length === 0) return [];

    const combinations: Record<string, string>[] = [];
    
    const generate = (index: number, current: Record<string, string>) => {
      if (index === opts.length) {
        combinations.push({ ...current });
        return;
      }

      const option = opts[index];
      for (const value of option.values) {
        current[option.name] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  };

  // Add new option
  const handleAddOption = () => {
    if (!newOptionName.trim()) {
      toast.error('옵션 이름을 입력하세요');
      return;
    }

    const values = newOptionValues.split(',').map((v: any) => v.trim()).filter((v: any) => v);
    if (values.length === 0) {
      toast.error('옵션 값을 입력하세요');
      return;
    }

    if (options.some((opt: any) => opt.name === newOptionName)) {
      toast.error('이미 존재하는 옵션입니다');
      return;
    }

    const newOption: ProductOption = {
      id: `opt_${Date.now()}`,
      name: newOptionName,
      values
    };

    const updatedOptions = [...options, newOption];
    onOptionsChange(updatedOptions);

    // Generate new variants
    const combinations = generateVariantCombinations(updatedOptions);
    const newVariants = combinations.map((combo, index) => {
      // Check if variant already exists
      const existingVariant = variants.find((v: any) => 
        JSON.stringify(v.options) === JSON.stringify(combo)
      );

      if (existingVariant) {
        return existingVariant;
      }

      // Create new variant
      const optionString = Object.values(combo).join('-');
      return {
        id: `var_${Date.now()}_${index}`,
        sku: `${baseSku}-${optionString}`,
        options: combo,
        price: basePrice,
        stock: 0,
        active: true
      } as ProductVariant;
    });

    onVariantsChange(newVariants);

    setNewOptionName('');
    setNewOptionValues('');
    toast.success('옵션이 추가되었습니다');
  };

  // Remove option
  const handleRemoveOption = (optionId: string) => {
    const updatedOptions = options.filter((opt: any) => opt.id !== optionId);
    onOptionsChange(updatedOptions);

    if (updatedOptions.length === 0) {
      onVariantsChange([]);
    } else {
      // Regenerate variants without the removed option
      const combinations = generateVariantCombinations(updatedOptions);
      const newVariants = combinations.map((combo, index) => {
        // Try to preserve existing variant data
        const existingVariant = variants.find((v: any) => {
          const matchingKeys = Object.keys(combo).every((key: any) => v.options[key] === combo[key]);
          return matchingKeys;
        });

        if (existingVariant) {
          const { options: oldOptions, ...variantData } = existingVariant as any;
          return {
            ...variantData,
            options: combo
          };
        }

        const optionString = Object.values(combo).join('-');
        return {
          id: `var_${Date.now()}_${index}`,
          sku: `${baseSku}-${optionString}`,
          options: combo,
          price: basePrice,
          stock: 0,
          active: true
        } as ProductVariant;
      });

      onVariantsChange(newVariants);
    }
  };

  // Update variant
  const handleVariantChange = (variantId: string, field: keyof ProductVariant, value: any) => {
    const updatedVariants = variants.map((variant: any) => {
      if (variant.id === variantId) {
        return { ...variant, [field]: value };
      }
      return variant;
    });
    onVariantsChange(updatedVariants);
  };

  // Bulk update variants
  const handleBulkUpdate = (field: 'price' | 'stock', value: number) => {
    const updatedVariants = variants.map((variant: any) => ({
      ...variant,
      [field]: value
    }));
    onVariantsChange(updatedVariants);
    toast.success(`모든 변형의 ${field === 'price' ? '가격' : '재고'}가 업데이트되었습니다`);
  };

  const getOptionValueDisplay = (options: Record<string, string>) => {
    return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Add Option */}
      <Card>
        <CardHeader>
          <CardTitle>상품 옵션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Existing Options */}
            {options.length > 0 && (
              <div className="space-y-2">
                {options.map((option: any) => (
                  <div key={option.id} className="flex items-center justify-between p-3 bg-modern-bg-tertiary rounded">
                    <div>
                      <span className="font-medium">{option.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {option.values.map((value: any) => (
                          <Badge key={value} variant="secondary">{value}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={"ghost" as const}
                      size={"sm" as const}
                      onClick={() => handleRemoveOption(option.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Option */}
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>옵션 이름</Label>
                  <Input
                    placeholder="예: 색상, 사이즈"
                    value={newOptionName}
                    onChange={(e: any) => setNewOptionName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>옵션 값 (쉼표로 구분)</Label>
                  <Input
                    placeholder="예: S, M, L, XL"
                    value={newOptionValues}
                    onChange={(e: any) => setNewOptionValues(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" onClick={handleAddOption}>
                <Plus className="w-4 h-4 mr-2" />
                옵션 추가
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>상품 변형 ({variants.length}개)</CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={"outline" as const}
                  size={"sm" as const}
                  onClick={() => {
                    const price = prompt('모든 변형의 가격을 입력하세요:', String(basePrice));
                    if (price) {
                      handleBulkUpdate('price', parseInt(price));
                    }
                  }}
                >
                  일괄 가격 설정
                </Button>
                <Button
                  type="button"
                  variant={"outline" as const}
                  size={"sm" as const}
                  onClick={() => {
                    const stock = prompt('모든 변형의 재고를 입력하세요:', '0');
                    if (stock) {
                      handleBulkUpdate('stock', parseInt(stock));
                    }
                  }}
                >
                  일괄 재고 설정
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium text-modern-text-secondary">변형</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-modern-text-secondary">SKU</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-modern-text-secondary">가격</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-modern-text-secondary">재고</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-modern-text-secondary">바코드</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-modern-text-secondary">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant: any) => (
                    <tr key={variant.id} className="border-b">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-modern-bg-tertiary rounded">
                            <ImageIcon className="w-4 h-4 text-modern-text-tertiary" />
                          </button>
                          <span className="text-sm">{getOptionValueDisplay(variant.options)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={variant.sku}
                          onChange={(e: any) => handleVariantChange(variant.id, 'sku', e.target.value)}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={variant.price}
                          onChange={(e: any) => handleVariantChange(variant.id, 'price', parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={variant.stock}
                          onChange={(e: any) => handleVariantChange(variant.id, 'stock', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={variant.barcode || ''}
                          onChange={(e: any) => handleVariantChange(variant.id, 'barcode', e.target.value)}
                          placeholder="바코드"
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={variant.active ? 'active' : 'inactive'}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => handleVariantChange(variant.id, 'active', e.target.value === 'active')}
                          className="px-2 py-1 border border-modern-border-primary rounded text-sm"
                        >
                          <option value="active">활성</option>
                          <option value="inactive">비활성</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stock Summary */}
            <div className="mt-4 p-4 bg-modern-bg-tertiary rounded">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-modern-text-secondary" />
                  <span className="text-sm text-modern-text-secondary">총 재고</span>
                </div>
                <span className="font-medium">
                  {variants.reduce((sum: any, v: any) => sum + v.stock, 0).toLocaleString()}개
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductVariantManager;