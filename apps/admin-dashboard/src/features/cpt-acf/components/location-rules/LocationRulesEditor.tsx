/**
 * Location Rules Editor Component
 * Main component for editing location rules with multiple groups (OR logic between groups)
 */

import React from 'react';
import { Plus, Info } from 'lucide-react';
import { LocationRuleGroup } from './LocationRuleGroup';
import type { FieldLocation } from '../../types/acf.types';

interface LocationRulesEditorProps {
  ruleGroups: FieldLocation[][];
  onChange: (ruleGroups: FieldLocation[][]) => void;
  availableParams?: Array<{ value: string; label: string }>;
  getAvailableValues?: (param: string) => Array<{ value: string; label: string }>;
}

const DEFAULT_PARAMS = [
  { value: 'post_type', label: 'Post Type' },
  { value: 'page_template', label: 'Page Template' },
  { value: 'post_status', label: 'Post Status' },
  { value: 'user_role', label: 'User Role' },
  { value: 'post_category', label: 'Post Category' },
];

export const LocationRulesEditor: React.FC<LocationRulesEditorProps> = ({
  ruleGroups,
  onChange,
  availableParams = DEFAULT_PARAMS,
  getAvailableValues,
}) => {
  const handleGroupChange = (groupIndex: number, updatedRules: FieldLocation[]) => {
    const newGroups = [...ruleGroups];
    newGroups[groupIndex] = updatedRules;
    onChange(newGroups);
  };

  const handleRemoveGroup = (groupIndex: number) => {
    const newGroups = ruleGroups.filter((_, i) => i !== groupIndex);
    onChange(newGroups.length > 0 ? newGroups : [[{
      param: '',
      operator: '==',
      value: '',
    }]]);
  };

  const handleAddGroup = () => {
    const newGroup: FieldLocation[] = [{
      param: '',
      operator: '==',
      value: '',
    }];
    onChange([...ruleGroups, newGroup]);
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Location Rules Logic</p>
          <p>
            Rules within a group use <strong>AND</strong> logic (all must match).
            Groups use <strong>OR</strong> logic (at least one group must match).
          </p>
        </div>
      </div>

      {/* Rule Groups */}
      {ruleGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="relative">
          {/* OR Separator */}
          {groupIndex > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full uppercase">
                or
              </span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
          )}

          {/* Group Container */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">
                Rule Group {groupIndex + 1}
              </h4>
              {ruleGroups.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(groupIndex)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Remove Group
                </button>
              )}
            </div>

            <LocationRuleGroup
              rules={group}
              onChange={(updatedRules) => handleGroupChange(groupIndex, updatedRules)}
              availableParams={availableParams}
              getAvailableValues={getAvailableValues}
              logic="and"
            />
          </div>
        </div>
      ))}

      {/* Add Group Button */}
      <button
        type="button"
        onClick={handleAddGroup}
        className="
          inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed
          border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400
          hover:text-blue-600 transition-colors font-medium
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
      >
        <Plus className="w-4 h-4" />
        Add Rule Group
      </button>
    </div>
  );
};

export default LocationRulesEditor;
