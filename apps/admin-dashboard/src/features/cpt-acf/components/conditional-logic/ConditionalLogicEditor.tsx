/**
 * Conditional Logic Editor Component
 * Main component for editing conditional logic with multiple rules and AND/OR logic
 */

import React from 'react';
import { Plus, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { ConditionalRuleRow } from './ConditionalRuleRow';
import type { ConditionalLogic, ConditionalRule, CustomField } from '../../types/acf.types';

interface ConditionalLogicEditorProps {
  conditionalLogic?: ConditionalLogic;
  onChange: (conditionalLogic: ConditionalLogic | undefined) => void;
  availableFields: CustomField[];
  currentFieldName?: string;
}

const DEFAULT_LOGIC: ConditionalLogic = {
  enabled: false,
  logic: 'and',
  rules: [],
};

export const ConditionalLogicEditor: React.FC<ConditionalLogicEditorProps> = ({
  conditionalLogic = DEFAULT_LOGIC,
  onChange,
  availableFields,
  currentFieldName,
}) => {
  const logic = conditionalLogic || DEFAULT_LOGIC;

  const handleEnabledToggle = (enabled: boolean) => {
    if (!enabled) {
      onChange(undefined);
    } else {
      onChange({
        enabled: true,
        logic: 'and',
        rules: [{
          field: '',
          operator: '==',
          value: '',
        }],
      });
    }
  };

  const handleLogicChange = (logicType: 'and' | 'or') => {
    onChange({
      ...logic,
      logic: logicType,
    });
  };

  const handleRuleChange = (index: number, updatedRule: ConditionalRule) => {
    const newRules = [...logic.rules];
    newRules[index] = updatedRule;
    onChange({
      ...logic,
      rules: newRules,
    });
  };

  const handleRuleRemove = (index: number) => {
    const newRules = logic.rules.filter((_, i) => i !== index);

    // If no rules left, disable conditional logic
    if (newRules.length === 0) {
      onChange(undefined);
    } else {
      onChange({
        ...logic,
        rules: newRules,
      });
    }
  };

  const handleAddRule = () => {
    const newRule: ConditionalRule = {
      field: '',
      operator: '==',
      value: '',
    };
    onChange({
      ...logic,
      rules: [...logic.rules, newRule],
    });
  };

  // Generate preview text
  const generatePreview = (): string => {
    if (!logic.enabled || logic.rules.length === 0) {
      return 'No conditions set';
    }

    const ruleTexts = logic.rules.map((rule) => {
      if (!rule.field) return 'incomplete rule';

      const field = availableFields.find((f) => f.name === rule.field);
      const fieldLabel = field?.label || rule.field;
      const operatorText = {
        '==': 'equals',
        '!=': 'does not equal',
        '>': 'is greater than',
        '<': 'is less than',
        '>=': 'is greater than or equal to',
        '<=': 'is less than or equal to',
        'contains': 'contains',
        'not_contains': 'does not contain',
        'empty': 'is empty',
        '!empty': 'is not empty',
        'pattern': 'matches pattern',
        '!pattern': 'does not match pattern',
      }[rule.operator] || rule.operator;

      if (rule.operator === 'empty' || rule.operator === '!empty') {
        return `${fieldLabel} ${operatorText}`;
      }

      return `${fieldLabel} ${operatorText} "${rule.value}"`;
    });

    return ruleTexts.join(` ${logic.logic.toUpperCase()} `);
  };

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Conditional Logic</h4>
          <p className="text-xs text-gray-500 mt-1">
            Show this field based on other field values
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleEnabledToggle(!logic.enabled)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-sm
            transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
            ${logic.enabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
        >
          {logic.enabled ? (
            <>
              <ToggleRight className="w-4 h-4" />
              Enabled
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" />
              Disabled
            </>
          )}
        </button>
      </div>

      {/* Conditional Logic Editor (when enabled) */}
      {logic.enabled && (
        <div className="space-y-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p>
                This field will be shown when <strong>{logic.logic.toUpperCase()}</strong> of the following rules are met:
              </p>
            </div>
          </div>

          {/* Logic Type Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Show this field if:</span>
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => handleLogicChange('and')}
                className={`
                  px-3 py-1.5 text-xs font-medium transition-colors
                  ${logic.logic === 'and'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                ALL rules match
              </button>
              <button
                type="button"
                onClick={() => handleLogicChange('or')}
                className={`
                  px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300
                  ${logic.logic === 'or'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                ANY rule matches
              </button>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-2">
            {logic.rules.map((rule, index) => (
              <div key={index} className="relative">
                {index > 0 && (
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {logic.logic}
                    </span>
                  </div>
                )}
                <ConditionalRuleRow
                  rule={rule}
                  onChange={(updatedRule) => handleRuleChange(index, updatedRule)}
                  onRemove={() => handleRuleRemove(index)}
                  availableFields={availableFields}
                  currentFieldName={currentFieldName}
                />
              </div>
            ))}
          </div>

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

          {/* Preview */}
          <div className="pt-3 border-t border-gray-300">
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            <p className="text-sm text-gray-800 italic">
              {generatePreview()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionalLogicEditor;
