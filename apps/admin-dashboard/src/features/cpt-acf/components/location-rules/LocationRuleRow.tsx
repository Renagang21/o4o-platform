/**
 * Location Rule Row Component
 * Individual rule row with param, operator, and value selection
 */

import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { FieldLocation } from '../../types/acf.types';
import { TaxonomyTermSelector } from './TaxonomyTermSelector';
import { CategorySelector } from './CategorySelector';

interface LocationRuleRowProps {
  rule: FieldLocation;
  onChange: (rule: FieldLocation) => void;
  onRemove: () => void;
  availableParams: Array<{ value: string; label: string }>;
  availableValues?: Array<{ value: string; label: string }>;
}

const OPERATORS = [
  { value: '==', label: 'is equal to' },
  { value: '!=', label: 'is not equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
];

export const LocationRuleRow: React.FC<LocationRuleRowProps> = ({
  rule,
  onChange,
  onRemove,
  availableParams,
  availableValues = [],
}) => {
  const [showTaxonomySelector, setShowTaxonomySelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const handleParamChange = (param: string) => {
    onChange({ ...rule, param, value: '' });
    setShowTaxonomySelector(false);
    setShowCategorySelector(false);
  };

  const handleOperatorChange = (operator: FieldLocation['operator']) => {
    onChange({ ...rule, operator });
  };

  const handleValueChange = (value: string) => {
    onChange({ ...rule, value });
  };

  // Check if this param needs special selector
  const needsTaxonomySelector = rule.param === 'post_taxonomy';
  const needsCategorySelector = rule.param === 'post_category';

  // Get display value for taxonomy/category
  const getDisplayValue = () => {
    if (needsTaxonomySelector && rule.value) {
      const parts = rule.value.split(':');
      return parts.length === 2 ? `${parts[0]}: ${parts[1]}` : rule.value;
    }
    if (needsCategorySelector && rule.value) {
      return rule.value;
    }
    return rule.value;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
      {/* Param Select */}
      <select
        value={rule.param}
        onChange={(e) => handleParamChange(e.target.value)}
        className="
          flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        "
      >
        <option value="">Select parameter...</option>
        {availableParams.map((param) => (
          <option key={param.value} value={param.value}>
            {param.label}
          </option>
        ))}
      </select>

      {/* Operator Select */}
      <select
        value={rule.operator}
        onChange={(e) => handleOperatorChange(e.target.value as FieldLocation['operator'])}
        className="
          flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        "
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* Value Select/Input */}
      {needsTaxonomySelector || needsCategorySelector ? (
        <button
          type="button"
          onClick={() => {
            if (needsTaxonomySelector) setShowTaxonomySelector(!showTaxonomySelector);
            if (needsCategorySelector) setShowCategorySelector(!showCategorySelector);
          }}
          className="
            flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-left
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            hover:bg-gray-50 transition-colors flex items-center justify-between
          "
        >
          <span className={rule.value ? 'text-gray-900' : 'text-gray-500'}>
            {rule.value ? getDisplayValue() : 'Select...'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      ) : availableValues.length > 0 ? (
        <select
          value={rule.value}
          onChange={(e) => handleValueChange(e.target.value)}
          className="
            flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
        >
          <option value="">Select value...</option>
          {availableValues.map((val) => (
            <option key={val.value} value={val.value}>
              {val.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={rule.value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="Enter value..."
          className="
            flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
        />
      )}

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        className="
          p-2 text-gray-400 hover:text-red-600 transition-colors
          focus:outline-none focus:ring-2 focus:ring-red-500 rounded
        "
        title="Remove rule"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

      {/* Taxonomy Term Selector */}
      {showTaxonomySelector && needsTaxonomySelector && (
        <div className="pl-2 pr-10 border-l-2 border-blue-200">
          <TaxonomyTermSelector
            value={rule.value}
            onChange={(value) => {
              handleValueChange(value);
              setShowTaxonomySelector(false);
            }}
          />
        </div>
      )}

      {/* Category Selector */}
      {showCategorySelector && needsCategorySelector && (
        <div className="pl-2 pr-10 border-l-2 border-green-200">
          <CategorySelector
            value={rule.value}
            onChange={(value) => {
              handleValueChange(value);
              setShowCategorySelector(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LocationRuleRow;
