/**
 * Location Rule Group Component
 * Manages a group of rules with AND/OR logic
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { LocationRuleRow } from './LocationRuleRow';
import type { FieldLocation } from '../../types/acf.types';

interface LocationRuleGroupProps {
  rules: FieldLocation[];
  onChange: (rules: FieldLocation[]) => void;
  availableParams: Array<{ value: string; label: string }>;
  getAvailableValues?: (param: string) => Array<{ value: string; label: string }>;
  logic?: 'and' | 'or';
}

export const LocationRuleGroup: React.FC<LocationRuleGroupProps> = ({
  rules,
  onChange,
  availableParams,
  getAvailableValues,
  logic = 'and',
}) => {
  const handleRuleChange = (index: number, updatedRule: FieldLocation) => {
    const newRules = [...rules];
    newRules[index] = updatedRule;
    onChange(newRules);
  };

  const handleRuleRemove = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    onChange(newRules);
  };

  const handleAddRule = () => {
    const newRule: FieldLocation = {
      param: '',
      operator: '==',
      value: '',
    };
    onChange([...rules, newRule]);
  };

  return (
    <div className="space-y-2">
      {rules.map((rule, index) => (
        <div key={index} className="relative">
          {index > 0 && (
            <div className="absolute -left-8 top-1/2 -translate-y-1/2">
              <span className="text-xs font-medium text-gray-500 uppercase">
                {logic}
              </span>
            </div>
          )}
          <LocationRuleRow
            rule={rule}
            onChange={(updatedRule) => handleRuleChange(index, updatedRule)}
            onRemove={() => handleRuleRemove(index)}
            availableParams={availableParams}
            availableValues={
              getAvailableValues && rule.param
                ? getAvailableValues(rule.param)
                : []
            }
          />
        </div>
      ))}

      {/* Add Rule Button */}
      <button
        type="button"
        onClick={handleAddRule}
        className="
          inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600
          hover:text-blue-700 font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
        "
      >
        <Plus className="w-4 h-4" />
        Add Rule
      </button>
    </div>
  );
};

export default LocationRuleGroup;
