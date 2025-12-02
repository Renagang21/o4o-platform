import { useState } from 'react';
import type { CosmeticsFilters } from '../types';

interface FilterPanelProps {
  filters: CosmeticsFilters;
  onChange: (filters: Partial<CosmeticsFilters>) => void;
}

const SKIN_TYPES = [
  { value: 'dry', label: '건성' },
  { value: 'oily', label: '지성' },
  { value: 'combination', label: '복합성' },
  { value: 'sensitive', label: '민감성' },
  { value: 'normal', label: '정상' },
];

const CONCERNS = [
  { value: 'acne', label: '여드름' },
  { value: 'whitening', label: '미백' },
  { value: 'wrinkle', label: '주름' },
  { value: 'pore', label: '모공' },
  { value: 'soothing', label: '진정' },
  { value: 'moisturizing', label: '보습' },
  { value: 'elasticity', label: '탄력' },
  { value: 'trouble', label: '트러블' },
];

const CERTIFICATIONS = [
  { value: 'vegan', label: '비건' },
  { value: 'hypoallergenic', label: '저자극' },
  { value: 'organic', label: '유기농' },
  { value: 'ewgGreen', label: 'EWG 그린' },
  { value: 'crueltyfree', label: '동물실험 무' },
  { value: 'dermatologicallyTested', label: '피부과 테스트' },
];

const CATEGORIES = [
  { value: 'skincare', label: '스킨케어' },
  { value: 'cleansing', label: '클렌징' },
  { value: 'makeup', label: '메이크업' },
  { value: 'suncare', label: '선케어' },
  { value: 'mask', label: '마스크/팩' },
  { value: 'bodycare', label: '바디케어' },
  { value: 'haircare', label: '헤어케어' },
];

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    skinType: true,
    concerns: true,
    certifications: false,
    category: true,
  });

  function toggleSection(section: keyof typeof expandedSections) {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  }

  function handleCheckboxChange(
    filterKey: keyof CosmeticsFilters,
    value: string,
    checked: boolean
  ) {
    const currentValues = (filters[filterKey] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v) => v !== value);

    onChange({ [filterKey]: newValues });
  }

  function handleCategoryChange(value: string) {
    onChange({ category: value === filters.category ? undefined : value });
  }

  function handleSearchChange(search: string) {
    onChange({ search });
  }

  function clearFilters() {
    onChange({
      skinType: [],
      concerns: [],
      certifications: [],
      category: undefined,
      search: undefined,
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">필터</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          초기화
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="제품명 검색..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Skin Type */}
      <FilterSection
        title="피부 타입"
        expanded={expandedSections.skinType}
        onToggle={() => toggleSection('skinType')}
      >
        {SKIN_TYPES.map((type) => (
          <Checkbox
            key={type.value}
            label={type.label}
            checked={(filters.skinType || []).includes(type.value)}
            onChange={(checked) =>
              handleCheckboxChange('skinType', type.value, checked)
            }
          />
        ))}
      </FilterSection>

      {/* Concerns */}
      <FilterSection
        title="피부 고민"
        expanded={expandedSections.concerns}
        onToggle={() => toggleSection('concerns')}
      >
        {CONCERNS.map((concern) => (
          <Checkbox
            key={concern.value}
            label={concern.label}
            checked={(filters.concerns || []).includes(concern.value)}
            onChange={(checked) =>
              handleCheckboxChange('concerns', concern.value, checked)
            }
          />
        ))}
      </FilterSection>

      {/* Category */}
      <FilterSection
        title="카테고리"
        expanded={expandedSections.category}
        onToggle={() => toggleSection('category')}
      >
        {CATEGORIES.map((category) => (
          <Radio
            key={category.value}
            label={category.label}
            checked={filters.category === category.value}
            onChange={() => handleCategoryChange(category.value)}
          />
        ))}
      </FilterSection>

      {/* Certifications */}
      <FilterSection
        title="인증"
        expanded={expandedSections.certifications}
        onToggle={() => toggleSection('certifications')}
      >
        {CERTIFICATIONS.map((cert) => (
          <Checkbox
            key={cert.value}
            label={cert.label}
            checked={(filters.certifications || []).includes(cert.value)}
            onChange={(checked) =>
              handleCheckboxChange('certifications', cert.value, checked)
            }
          />
        ))}
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 border-b border-gray-200 pb-4">
      <button
        onClick={onToggle}
        className="flex justify-between items-center w-full text-left"
      >
        <span className="font-medium text-gray-900">{title}</span>
        <span className="text-gray-400">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span className="ml-2 text-sm text-gray-700">{label}</span>
    </label>
  );
}

function Radio({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span className="ml-2 text-sm text-gray-700">{label}</span>
    </label>
  );
}
