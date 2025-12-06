/**
 * CosmeticsFilterSidebar Component (Skeleton)
 *
 * Minimal filter sidebar for product list
 * Actual design/styling will be handled by Antigravity
 */

import React from 'react';

export interface FilterState {
  skinType: string[];
  concerns: string[];
  brand?: string;
  category?: string;
  certifications: string[];
}

export interface CosmeticsFilterSidebarProps {
  filters: FilterState;
  onChange: (updatedFilters: FilterState) => void;
}

// Filter options (from manifest ACF choices)
const SKIN_TYPES = [
  { value: 'dry', label: '건성' },
  { value: 'oily', label: '지성' },
  { value: 'combination', label: '복합성' },
  { value: 'sensitive', label: '민감성' },
  { value: 'normal', label: '중성' },
];

const CONCERNS = [
  { value: 'acne', label: '여드름' },
  { value: 'whitening', label: '미백' },
  { value: 'wrinkle', label: '주름개선' },
  { value: 'pore', label: '모공' },
  { value: 'soothing', label: '진정' },
  { value: 'moisturizing', label: '보습' },
  { value: 'elasticity', label: '탄력' },
  { value: 'trouble', label: '트러블케어' },
];

const CATEGORIES = [
  { value: 'skincare', label: '스킨케어' },
  { value: 'cleansing', label: '클렌징' },
  { value: 'makeup', label: '메이크업' },
  { value: 'suncare', label: '선케어' },
  { value: 'mask', label: '마스크팩' },
];

const CERTIFICATIONS = [
  { value: 'vegan', label: '비건' },
  { value: 'hypoallergenic', label: '저자극' },
  { value: 'organic', label: '유기농' },
  { value: 'cruelty-free', label: '동물실험반대' },
];

export const CosmeticsFilterSidebar: React.FC<CosmeticsFilterSidebarProps> = ({
  filters,
  onChange,
}) => {
  const handleSkinTypeChange = (value: string, checked: boolean) => {
    const updated = checked
      ? [...filters.skinType, value]
      : filters.skinType.filter((v) => v !== value);
    onChange({ ...filters, skinType: updated });
  };

  const handleConcernsChange = (value: string, checked: boolean) => {
    const updated = checked
      ? [...filters.concerns, value]
      : filters.concerns.filter((v) => v !== value);
    onChange({ ...filters, concerns: updated });
  };

  const handleCategoryChange = (value: string) => {
    onChange({ ...filters, category: value || undefined });
  };

  const handleCertificationsChange = (value: string, checked: boolean) => {
    const updated = checked
      ? [...filters.certifications, value]
      : filters.certifications.filter((v) => v !== value);
    onChange({ ...filters, certifications: updated });
  };

  const handleReset = () => {
    onChange({
      skinType: [],
      concerns: [],
      brand: undefined,
      category: undefined,
      certifications: [],
    });
  };

  return (
    <div className="cosmetics-filter-sidebar bg-gray-50 p-4">
      <div className="filter-header mb-4">
        <h3 className="font-bold">Filters</h3>
        <button onClick={handleReset} className="text-sm text-blue-600">
          Reset
        </button>
      </div>

      {/* Skin Type */}
      <div className="filter-group mb-4">
        <h4 className="font-medium mb-2">Skin Type</h4>
        {SKIN_TYPES.map((option) => (
          <label key={option.value} className="block mb-1">
            <input
              type="checkbox"
              checked={filters.skinType.includes(option.value)}
              onChange={(e) => handleSkinTypeChange(option.value, e.target.checked)}
              className="mr-2"
            />
            {option.label}
          </label>
        ))}
      </div>

      {/* Concerns */}
      <div className="filter-group mb-4">
        <h4 className="font-medium mb-2">Concerns</h4>
        {CONCERNS.map((option) => (
          <label key={option.value} className="block mb-1">
            <input
              type="checkbox"
              checked={filters.concerns.includes(option.value)}
              onChange={(e) => handleConcernsChange(option.value, e.target.checked)}
              className="mr-2"
            />
            {option.label}
          </label>
        ))}
      </div>

      {/* Category */}
      <div className="filter-group mb-4">
        <h4 className="font-medium mb-2">Category</h4>
        <select
          value={filters.category || ''}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full p-2 bg-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Certifications */}
      <div className="filter-group mb-4">
        <h4 className="font-medium mb-2">Certifications</h4>
        {CERTIFICATIONS.map((option) => (
          <label key={option.value} className="block mb-1">
            <input
              type="checkbox"
              checked={filters.certifications.includes(option.value)}
              onChange={(e) => handleCertificationsChange(option.value, e.target.checked)}
              className="mr-2"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default CosmeticsFilterSidebar;
