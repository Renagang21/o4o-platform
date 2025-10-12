/**
 * ConditionRow Component
 * Single condition editor row (WordPress Toolset-style)
 */

import React, { useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  Condition,
  ConditionType,
  ConditionOperator,
  DateRangeValue,
  TimeRangeValue,
} from '@/types/conditional-block.types';
import {
  CONDITION_TYPE_DEFINITIONS,
  CONDITION_TYPES_BY_CATEGORY,
} from '@/constants/conditional-types';

interface ConditionRowProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  showRemove?: boolean;
}

const ConditionRow: React.FC<ConditionRowProps> = ({
  condition,
  onChange,
  onRemove,
  showRemove = true,
}) => {
  // Get condition type definition
  const typeDef = useMemo(() => {
    return CONDITION_TYPE_DEFINITIONS[condition.type];
  }, [condition.type]);

  // Handle type change
  const handleTypeChange = useCallback((newType: ConditionType) => {
    const newTypeDef = CONDITION_TYPE_DEFINITIONS[newType];
    const defaultOperator = newTypeDef.availableOperators[0];

    // Get default value based on value type
    let defaultValue: any;
    if (newTypeDef.valueType === 'boolean') {
      defaultValue = true;
    } else if (newTypeDef.valueType === 'select' && newTypeDef.valueOptions) {
      defaultValue = newTypeDef.valueOptions[0]?.value;
    } else if (newTypeDef.valueType === 'number') {
      defaultValue = 0;
    } else if (newTypeDef.valueType === 'daterange') {
      defaultValue = { start: '', end: '' };
    } else if (newTypeDef.valueType === 'timerange') {
      defaultValue = { start: '00:00', end: '23:59' };
    } else {
      defaultValue = '';
    }

    onChange({
      ...condition,
      type: newType,
      operator: defaultOperator,
      value: defaultValue,
      label: newTypeDef.label,
    });
  }, [condition, onChange]);

  // Handle operator change
  const handleOperatorChange = useCallback((newOperator: ConditionOperator) => {
    onChange({
      ...condition,
      operator: newOperator,
    });
  }, [condition, onChange]);

  // Handle value change
  const handleValueChange = useCallback((newValue: any) => {
    onChange({
      ...condition,
      value: newValue,
    });
  }, [condition, onChange]);

  // Render value input based on type
  const renderValueInput = () => {
    if (!typeDef) return null;

    const { valueType, valueOptions } = typeDef;

    switch (valueType) {
      case 'boolean':
        return (
          <select
            value={condition.value ? 'true' : 'false'}
            onChange={(e) => handleValueChange(e.target.value === 'true')}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '150px',
            }}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      case 'select':
        return (
          <select
            value={condition.value}
            onChange={(e) => handleValueChange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '150px',
            }}
          >
            {valueOptions?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={condition.value}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '150px',
            }}
          />
        );

      case 'daterange':
        const dateRange = condition.value as DateRangeValue;
        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                handleValueChange({ ...dateRange, start: e.target.value })
              }
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <span style={{ color: '#666' }}>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                handleValueChange({ ...dateRange, end: e.target.value })
              }
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        );

      case 'timerange':
        const timeRange = condition.value as TimeRangeValue;
        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="time"
              value={timeRange.start}
              onChange={(e) =>
                handleValueChange({ ...timeRange, start: e.target.value })
              }
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <span style={{ color: '#666' }}>to</span>
            <input
              type="time"
              value={timeRange.end}
              onChange={(e) =>
                handleValueChange({ ...timeRange, end: e.target.value })
              }
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        );

      case 'string':
      default:
        return (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value..."
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '200px',
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        padding: '12px',
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        marginBottom: '8px',
      }}
    >
      {/* Condition Type Selector */}
      <select
        value={condition.type}
        onChange={(e) => handleTypeChange(e.target.value as ConditionType)}
        style={{
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px',
          minWidth: '180px',
          fontWeight: '500',
        }}
      >
        {Object.entries(CONDITION_TYPES_BY_CATEGORY).map(([category, typeDefs]) => (
          <optgroup key={category} label={category.toUpperCase()}>
            {typeDefs.map((def) => (
              <option key={def.type} value={def.type}>
                {def.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator Selector */}
      <select
        value={condition.operator}
        onChange={(e) => handleOperatorChange(e.target.value as ConditionOperator)}
        style={{
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px',
          minWidth: '120px',
        }}
      >
        {typeDef?.availableOperators.map((op) => (
          <option key={op} value={op}>
            {formatOperator(op)}
          </option>
        ))}
      </select>

      {/* Value Input */}
      {renderValueInput()}

      {/* Remove Button */}
      {showRemove && (
        <button
          onClick={onRemove}
          style={{
            padding: '8px',
            border: 'none',
            background: '#dc3545',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Remove condition"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

/**
 * Format operator for display
 */
function formatOperator(operator: ConditionOperator): string {
  const labels: Record<ConditionOperator, string> = {
    is: 'is',
    is_not: 'is not',
    contains: 'contains',
    not_contains: 'does not contain',
    greater_than: 'greater than',
    less_than: 'less than',
    between: 'between',
    exists: 'exists',
    not_exists: 'does not exist',
  };

  return labels[operator] || operator;
}

export default ConditionRow;
