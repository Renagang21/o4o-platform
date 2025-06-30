import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { useProductFilters } from '../context/ProductContext';
import { ProductFilters, productCategories } from '../types/product';

interface ProductFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ProductFilterPanel: React.FC<ProductFilterPanelProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const { filters, applyFilters, clearFilters, hasActiveFilters } = useProductFilters();
  const [tempFilters, setTempFilters] = useState<ProductFilters>(filters);
  const panelRef = useRef<HTMLDivElement>(null);

  // Update temp filters when filters change
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...tempFilters.category, categoryId]
      : tempFilters.category.filter(id => id !== categoryId);
    
    setTempFilters(prev => ({
      ...prev,
      category: newCategories
    }));
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...tempFilters.status, status]
      : tempFilters.status.filter(s => s !== status);
    
    setTempFilters(prev => ({
      ...prev,
      status: newStatuses
    }));
  };

  const handlePriceRangeChange = (field: 'min' | 'max', value: number) => {
    setTempFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: value
      }
    }));
  };

  const handleStockRangeChange = (field: 'min' | 'max', value: number) => {
    setTempFilters(prev => ({
      ...prev,
      stockRange: {
        ...prev.stockRange,
        [field]: value
      }
    }));
  };

  const handleApply = () => {
    applyFilters(tempFilters);
    onClose();
  };

  const handleReset = () => {
    clearFilters();
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statusOptions = [
    { value: '판매중', label: '판매중', color: 'text-green-600' },
    { value: '품절', label: '품절', color: 'text-red-600' },
    { value: '판매중단', label: '판매중단', color: 'text-gray-600' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div
        ref={panelRef}
        className={`bg-white h-full w-full max-w-md shadow-xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">고급 필터</h3>
            <p className="text-sm text-gray-500 mt-1">상품을 세밀하게 필터링하세요</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Category Filter */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">카테고리</h4>
            <div className="space-y-3">
              {productCategories.map((category) => (
                <label key={category.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempFilters.category.includes(category.id)}
                    onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`flex items-center justify-center w-5 h-5 border-2 rounded-md transition-colors ${
                    tempFilters.category.includes(category.id)
                      ? `bg-${category.color}-500 border-${category.color}-500`
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    {tempFilters.category.includes(category.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="ml-3 text-sm text-gray-700">{category.name}</span>
                  <span className={`ml-auto w-3 h-3 rounded-full bg-${category.color}-500`}></span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">판매 상태</h4>
            <div className="space-y-3">
              {statusOptions.map((option) => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempFilters.status.includes(option.value)}
                    onChange={(e) => handleStatusChange(option.value, e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`flex items-center justify-center w-5 h-5 border-2 rounded-md transition-colors ${
                    tempFilters.status.includes(option.value)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    {tempFilters.status.includes(option.value) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className={`ml-3 text-sm ${option.color}`}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">가격 범위</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">최소 가격</label>
                  <input
                    type="number"
                    value={tempFilters.priceRange.min}
                    onChange={(e) => handlePriceRangeChange('min', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">최대 가격</label>
                  <input
                    type="number"
                    value={tempFilters.priceRange.max}
                    onChange={(e) => handlePriceRangeChange('max', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000000"
                    min="0"
                  />
                </div>
              </div>
              
              {/* Price Range Slider Visual */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-2">현재 범위</div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(tempFilters.priceRange.min)} - {formatCurrency(tempFilters.priceRange.max)}
                </div>
              </div>
            </div>
          </div>

          {/* Stock Range Filter */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">재고 범위</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">최소 재고</label>
                  <input
                    type="number"
                    value={tempFilters.stockRange.min}
                    onChange={(e) => handleStockRangeChange('min', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">최대 재고</label>
                  <input
                    type="number"
                    value={tempFilters.stockRange.max}
                    onChange={(e) => handleStockRangeChange('max', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                    min="0"
                  />
                </div>
              </div>
              
              {/* Stock Range Display */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-2">현재 범위</div>
                <div className="text-sm font-medium text-gray-900">
                  {tempFilters.stockRange.min.toLocaleString()}개 - {tempFilters.stockRange.max.toLocaleString()}개
                </div>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">빠른 설정</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setTempFilters(prev => ({
                    ...prev,
                    status: ['품절']
                  }));
                }}
                className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
              >
                품절 상품만
              </button>
              <button
                onClick={() => {
                  setTempFilters(prev => ({
                    ...prev,
                    stockRange: { min: 0, max: 20 }
                  }));
                }}
                className="px-3 py-2 text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors"
              >
                재고 부족
              </button>
              <button
                onClick={() => {
                  setTempFilters(prev => ({
                    ...prev,
                    category: ['electronics']
                  }));
                }}
                className="px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                전자기기만
              </button>
              <button
                onClick={() => {
                  setTempFilters(prev => ({
                    ...prev,
                    priceRange: { min: 0, max: 20000 }
                  }));
                }}
                className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
              >
                저가 상품
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              필터 적용
            </button>
          </div>
          
          {hasActiveFilters && (
            <div className="mt-3 text-center">
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                활성 필터가 적용되었습니다
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};