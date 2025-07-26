import React from 'react';
import { Card, Checkbox, RadioGroup, RadioGroupItem, Label, Slider, Button } from '@o4o/ui';
import { formatCurrency } from '@o4o/utils';
import { cn } from '@o4o/utils';

interface ProductFiltersProps {
  categories: Array<{ id: string; name: string; count?: number }>;
  brands?: Array<{ id: string; name: string; count?: number }>;
  priceRange: { min: number; max: number };
  selectedCategory?: string;
  selectedBrands?: string[];
  selectedPriceRange?: [number, number];
  onCategoryChange: (category: string) => void;
  onBrandsChange?: (brands: string[]) => void;
  onPriceRangeChange: (range: [number, number]) => void;
  onReset: () => void;
  className?: string;
}

export const ProductFilters: FC<ProductFiltersProps> = ({
  categories,
  brands,
  priceRange,
  selectedCategory,
  selectedBrands = [],
  selectedPriceRange,
  onCategoryChange,
  onBrandsChange,
  onPriceRangeChange,
  onReset,
  className
}) => {
  const currentPriceRange = selectedPriceRange || [priceRange.min, priceRange.max];

  const handleBrandToggle = (brandId: string) => {
    if (!onBrandsChange) return;
    
    const newBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter(id => id !== brandId)
      : [...selectedBrands, brandId];
    
    onBrandsChange(newBrands);
  };

  const hasActiveFilters = selectedCategory || selectedBrands.length > 0 || 
    (selectedPriceRange && (selectedPriceRange[0] !== priceRange.min || selectedPriceRange[1] !== priceRange.max));

  return (
    <Card className={cn('p-6 space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">필터</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-sm"
          >
            초기화
          </Button>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">카테고리</h4>
        <RadioGroup
          value={selectedCategory || ''}
          onValueChange={onCategoryChange}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="" id="all-categories" />
            <Label htmlFor="all-categories" className="flex-1 cursor-pointer">
              전체 카테고리
            </Label>
          </div>
          {categories.map(category => (
            <div key={category.id} className="flex items-center space-x-2">
              <RadioGroupItem value={category.id} id={`category-${category.id}`} />
              <Label 
                htmlFor={`category-${category.id}`} 
                className="flex-1 cursor-pointer flex items-center justify-between"
              >
                <span>{category.name}</span>
                {category.count !== undefined && (
                  <span className="text-xs text-muted-foreground">({category.count})</span>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Brands */}
      {brands && brands.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">브랜드</h4>
          <div className="space-y-2">
            {brands.map(brand => (
              <div key={brand.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand.id}`}
                  checked={selectedBrands.includes(brand.id)}
                  onCheckedChange={() => handleBrandToggle(brand.id)}
                />
                <Label 
                  htmlFor={`brand-${brand.id}`}
                  className="flex-1 cursor-pointer flex items-center justify-between"
                >
                  <span>{brand.name}</span>
                  {brand.count !== undefined && (
                    <span className="text-xs text-muted-foreground">({brand.count})</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">가격대</h4>
        <div className="px-2">
          <Slider
            value={currentPriceRange[1]}
            onChange={(e) => onPriceRangeChange([currentPriceRange[0], parseInt(e.target.value)])}
            min={priceRange.min}
            max={priceRange.max}
            step={1000}
            className="mb-2"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatCurrency(currentPriceRange[0])}</span>
            <span>{formatCurrency(currentPriceRange[1])}</span>
          </div>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">추가 필터</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="in-stock" />
            <Label htmlFor="in-stock" className="cursor-pointer">
              재고 있음
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="on-sale" />
            <Label htmlFor="on-sale" className="cursor-pointer">
              할인 중
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="featured" />
            <Label htmlFor="featured" className="cursor-pointer">
              추천 상품
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
};