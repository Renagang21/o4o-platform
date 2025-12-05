/**
 * Filter Control Panel Component
 *
 * Provides UI controls for cosmetics product filtering
 */

import React, { useState } from 'react';
import type { CosmeticsFilters } from '../../types.js';

export interface FilterControlPanelProps {
  onFilterChange: (filters: CosmeticsFilters) => void;
  initialFilters?: CosmeticsFilters;
}

export const FilterControlPanel: React.FC<FilterControlPanelProps> = ({
  onFilterChange,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<CosmeticsFilters>(initialFilters);

  const handleFilterChange = (key: keyof CosmeticsFilters, value: any) => {
    const updated = {
      ...filters,
      [key]: value,
    };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleMultiSelectChange = (
    key: keyof CosmeticsFilters,
    value: string,
    checked: boolean
  ) => {
    const current = (filters[key] as string[]) || [];
    const updated = checked
      ? [...current, value]
      : current.filter((v) => v !== value);

    handleFilterChange(key, updated);
  };

  return (
    <div className="filter-control-panel" style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      <h3>Filters</h3>

      {/* Skin Type Filter */}
      <div className="filter-group">
        <h4>Skin Type</h4>
        {['dry', 'oily', 'combination', 'sensitive', 'normal'].map((type) => (
          <label key={type}>
            <input
              type="checkbox"
              checked={filters.skinType?.includes(type) || false}
              onChange={(e) =>
                handleMultiSelectChange('skinType', type, (e.target as HTMLInputElement).checked)
              }
            />
            {type}
          </label>
        ))}
      </div>

      {/* Concerns Filter */}
      <div className="filter-group">
        <h4>Concerns</h4>
        {[
          'acne',
          'whitening',
          'wrinkle',
          'pore',
          'soothing',
          'moisturizing',
          'elasticity',
          'trouble',
        ].map((concern) => (
          <label key={concern}>
            <input
              type="checkbox"
              checked={filters.concerns?.includes(concern) || false}
              onChange={(e) =>
                handleMultiSelectChange('concerns', concern, (e.target as HTMLInputElement).checked)
              }
            />
            {concern}
          </label>
        ))}
      </div>

      {/* Search */}
      <div className="filter-group">
        <h4>Search</h4>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', (e.target as HTMLInputElement).value)}
          placeholder="Search products..."
        />
      </div>

      {/* Reset Button */}
      <button
        onClick={() => {
          setFilters({});
          onFilterChange({});
        }}
      >
        Reset Filters
      </button>
    </div>
  );
};

export default FilterControlPanel;
