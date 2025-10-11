/**
 * Conditional Rule Row Component
 * Single conditional rule with field, operator, and value selection
 */

import React from 'react';
import { X } from 'lucide-react';
import type { ConditionalRule, ConditionalOperator, CustomField } from '../../types/acf.types';

interface ConditionalRuleRowProps {
  rule: ConditionalRule;
  onChange: (rule: ConditionalRule) => void;
  onRemove: () => void;
  availableFields: CustomField[];
  currentFieldName?: string; // To exclude the current field from selection
}

const OPERATORS: Array<{ value: ConditionalOperator; label: string }> = [
  { value: '==', label: 'is equal to' },
  { value: '!=', label: 'is not equal to' },
  { value: '>', label: 'is greater than' },
  { value: '<', label: 'is less than' },
  { value: '>=', label: 'is greater than or equal to' },
  { value: '<=', label: 'is less than or equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'empty', label: 'is empty' },
  { value: '!empty', label: 'is not empty' },
  { value: 'pattern', label: 'matches pattern' },
  { value: '!pattern', label: 'does not match pattern' },
];

export const ConditionalRuleRow: React.FC<ConditionalRuleRowProps> = ({
  rule,
  onChange,
  onRemove,
  availableFields,
  currentFieldName,
}) => {
  // Filter out the current field to prevent self-reference
  const selectableFields = availableFields.filter(
    (field) => field.name !== currentFieldName
  );

  const selectedField = availableFields.find((f) => f.name === rule.field);

  const handleFieldChange = (fieldName: string) => {
    onChange({ ...rule, field: fieldName, value: '' });
  };

  const handleOperatorChange = (operator: ConditionalOperator) => {
    onChange({ ...rule, operator });
  };

  const handleValueChange = (value: any) => {
    onChange({ ...rule, value });
  };

  // Check if operator requires a value input
  const requiresValue = !['empty', '!empty'].includes(rule.operator);

  // Render appropriate value input based on field type
  const renderValueInput = () => {
    if (!requiresValue) return null;

    if (!selectedField) {
      return (
        <input
          type="text"
          value={rule.value || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="Enter value..."
          className="
            flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
        />
      );
    }

    // Type-specific inputs
    switch (selectedField.type) {
      case 'number':
        return (
          <input
            type="number"
            value={rule.value || ''}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            placeholder="Enter number..."
            className="
              flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          />
        );

      case 'true_false':
        return (
          <select
            value={rule.value !== undefined ? String(rule.value) : ''}
            onChange={(e) => handleValueChange(e.target.value === 'true')}
            className="
              flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          >
            <option value="">Select value...</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      case 'select':
      case 'radio':
      case 'checkbox':
        if (selectedField.choices && selectedField.choices.length > 0) {
          return (
            <select
              value={rule.value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              className="
                flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              "
            >
              <option value="">Select value...</option>
              {selectedField.choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          );
        }
        // If no choices, fall through to default text input
        return (
          <input
            type="text"
            value={rule.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value..."
            className="
              flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          />
        );

      default:
        return (
          <input
            type="text"
            value={rule.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value..."
            className="
              flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Field Select */}
      <select
        value={rule.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="
          flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        "
      >
        <option value="">Select field...</option>
        {selectableFields.map((field) => (
          <option key={field.name} value={field.name}>
            {field.label || field.name}
          </option>
        ))}
      </select>

      {/* Operator Select */}
      <select
        value={rule.operator}
        onChange={(e) => handleOperatorChange(e.target.value as ConditionalOperator)}
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

      {/* Value Input */}
      {renderValueInput()}

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
  );
};

export default ConditionalRuleRow;
