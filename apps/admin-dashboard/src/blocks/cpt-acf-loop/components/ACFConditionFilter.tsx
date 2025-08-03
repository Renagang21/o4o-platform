/**
 * ACF Condition Filter Component
 * 
 * Meta query builder for filtering posts by ACF field values
 */

import { useState } from '@wordpress/element';
import { PanelBody, Button, SelectControl, TextControl, Notice,  } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { plus, trash, settings } from '@wordpress/icons';

export interface ACFCondition {
  id: string;
  field: string;
  compare: string;
  value: string;
  type: string;
}

export interface ACFConditionGroup {
  id: string;
  relation: 'AND' | 'OR';
  conditions: ACFCondition[];
}

interface ACFConditionFilterProps {
  availableFields: any[];
  conditionGroups: ACFConditionGroup[];
  onConditionsChange: (groups: ACFConditionGroup[]) => void;
}

export default function ACFConditionFilter({
  availableFields,
  conditionGroups,
  onConditionsChange,
}: ACFConditionFilterProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Compare operators
  const compareOperators = [
    { label: __('Equal to', 'o4o'), value: '=' },
    { label: __('Not equal to', 'o4o'), value: '!=' },
    { label: __('Greater than', 'o4o'), value: '>' },
    { label: __('Greater than or equal', 'o4o'), value: '>=' },
    { label: __('Less than', 'o4o'), value: '<' },
    { label: __('Less than or equal', 'o4o'), value: '<=' },
    { label: __('Contains', 'o4o'), value: 'LIKE' },
    { label: __('Does not contain', 'o4o'), value: 'NOT LIKE' },
    { label: __('Exists', 'o4o'), value: 'EXISTS' },
    { label: __('Does not exist', 'o4o'), value: 'NOT EXISTS' },
    { label: __('In array', 'o4o'), value: 'IN' },
    { label: __('Not in array', 'o4o'), value: 'NOT IN' },
    { label: __('Between', 'o4o'), value: 'BETWEEN' },
    { label: __('Not between', 'o4o'), value: 'NOT BETWEEN' },
  ];

  // Value types
  const valueTypes = [
    { label: __('Text', 'o4o'), value: 'CHAR' },
    { label: __('Number', 'o4o'), value: 'NUMERIC' },
    { label: __('Date', 'o4o'), value: 'DATE' },
    { label: __('DateTime', 'o4o'), value: 'DATETIME' },
    { label: __('Time', 'o4o'), value: 'TIME' },
    { label: __('Binary', 'o4o'), value: 'BINARY' },
  ];

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new condition group
  const addConditionGroup = () => {
    const newGroup: ACFConditionGroup = {
      id: generateId(),
      relation: 'AND',
      conditions: [
        {
          id: generateId(),
          field: '',
          compare: '=',
          value: '',
          type: 'CHAR',
        },
      ],
    };

    onConditionsChange([...conditionGroups, newGroup]);
    setExpandedGroups([...expandedGroups, newGroup.id]);
  };

  // Remove condition group
  const removeConditionGroup = (groupId: string) => {
    onConditionsChange(conditionGroups.filter((group: any) => group.id !== groupId));
    setExpandedGroups(expandedGroups.filter((id: string) => id !== groupId));
  };

  // Update condition group
  const updateConditionGroup = (groupId: string, updates: Partial<ACFConditionGroup>) => {
    onConditionsChange(
      conditionGroups.map((group: any) =>
        group.id === groupId ? { ...group, ...updates } : group
      )
    );
  };

  // Add condition to group
  const addCondition = (groupId: string) => {
    const group = conditionGroups.find((g: any) => g.id === groupId);
    if (!group) return;

    const newCondition: ACFCondition = {
      id: generateId(),
      field: '',
      compare: '=',
      value: '',
      type: 'CHAR',
    };

    updateConditionGroup(groupId, {
      conditions: [...group.conditions, newCondition],
    });
  };

  // Remove condition from group
  const removeCondition = (groupId: string, conditionId: string) => {
    const group = conditionGroups.find((g: any) => g.id === groupId);
    if (!group) return;

    updateConditionGroup(groupId, {
      conditions: group.conditions.filter((c: any) => c.id !== conditionId),
    });
  };

  // Update condition
  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<ACFCondition>
  ) => {
    const group = conditionGroups.find((g: any) => g.id === groupId);
    if (!group) return;

    updateConditionGroup(groupId, {
      conditions: group.conditions.map((condition: any) =>
        condition.id === conditionId ? { ...condition, ...updates } : condition
      ),
    });
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev: string[]) =>
      prev.includes(groupId)
        ? prev.filter((id: string) => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Get field options
  const fieldOptions = [
    { label: __('Select a field', 'o4o'), value: '' },
    ...availableFields.map((field: any) => ({
      label: field.label,
      value: field.name,
    })),
  ];

  // Render value input based on compare operator
  const renderValueInput = (condition: ACFCondition, groupId: string) => {
    const noValueOperators = ['EXISTS', 'NOT EXISTS'];
    
    if (noValueOperators.includes(condition.compare)) {
      return null;
    }

    const arrayOperators = ['IN', 'NOT IN'];
    const rangeOperators = ['BETWEEN', 'NOT BETWEEN'];

    if (arrayOperators.includes(condition.compare)) {
      return (
        <TextControl
          label={__('Values (comma separated)', 'o4o')}
          value={condition.value}
          onChange={(value: any) => updateCondition(groupId, condition.id, { value })}
          placeholder="value1, value2, value3"
        />
      );
    }

    if (rangeOperators.includes(condition.compare)) {
      return (
        <TextControl
          label={__('Range (min, max)', 'o4o')}
          value={condition.value}
          onChange={(value: any) => updateCondition(groupId, condition.id, { value })}
          placeholder="10, 100"
        />
      );
    }

    // Default text input
    return (
      <TextControl
        label={__('Value', 'o4o')}
        value={condition.value}
        onChange={(value: any) => updateCondition(groupId, condition.id, { value })}
        type={condition.type === 'NUMERIC' ? 'number' : 'text'}
      />
    );
  };

  return (
    <PanelBody 
      title={__('ACF Field Filters', 'o4o')} 
      initialOpen={false}
      icon={settings}
    >
      {conditionGroups.length === 0 ? (
        <Notice status="info" isDismissible={false}>
          <p>{__('No field filters active.', 'o4o')}</p>
          <p>{__('Add filters to query posts based on ACF field values.', 'o4o')}</p>
        </Notice>
      ) : (
        <div style={{ marginBottom: '16px' }}>
          {conditionGroups.map((group, groupIndex) => {
            const isExpanded = expandedGroups.includes(group.id);

            return (
              <div
                key={group.id}
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: '#f9f9f9',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                {/* Group Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      icon={isExpanded ? 'arrow-up' : 'arrow-down'}
                      onClick={() => toggleGroupExpansion(group.id)}
                      variant="tertiary"
                      size={"small" as any}
                    />
                    <span style={{ fontWeight: '600' }}>
                      {__('Filter Group', 'o4o')} {groupIndex + 1}
                    </span>
                    <span style={{
                      background: '#0073aa',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                    }}>
                      {group.conditions.length} {group.conditions.length === 1 ? __('condition', 'o4o') : __('conditions', 'o4o')}
                    </span>
                  </div>
                  <Button
                    icon={trash}
                    onClick={() => removeConditionGroup(group.id)}
                    variant="tertiary"
                    size={"small" as any}
                    isDestructive
                    label={__('Remove group', 'o4o')}
                  />
                </div>

                {/* Group Content */}
                {isExpanded && (
                  <div style={{ marginTop: '12px' }}>
                    {/* Relation selector */}
                    {conditionGroups.length > 1 && groupIndex > 0 && (
                      <div style={{ 
                        marginBottom: '12px',
                        padding: '8px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                      }}>
                        <SelectControl
                          label={__('Combine with previous group using', 'o4o')}
                          value={group.relation}
                          options={[
                            { label: __('AND', 'o4o'), value: 'AND' },
                            { label: __('OR', 'o4o'), value: 'OR' },
                          ]}
                          onChange={(relation: any) => updateConditionGroup(group.id, { 
                            relation: relation as 'AND' | 'OR' 
                          })}
                        />
                      </div>
                    )}

                    {/* Conditions */}
                    {group.conditions.map((condition, conditionIndex) => (
                      <div
                        key={condition.id}
                        style={{
                          marginBottom: '12px',
                          padding: '12px',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                        }}
                      >
                        {conditionIndex > 0 && (
                          <div style={{ 
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#666',
                            textAlign: 'center',
                          }}>
                            {group.relation}
                          </div>
                        )}

                        <div style={{ display: 'grid', gap: '8px' }}>
                          <SelectControl
                            label={__('Field', 'o4o')}
                            value={condition.field}
                            options={fieldOptions}
                            onChange={(field: any) => updateCondition(group.id, condition.id, { field })}
                          />

                          <SelectControl
                            label={__('Comparison', 'o4o')}
                            value={condition.compare}
                            options={compareOperators}
                            onChange={(compare: any) => updateCondition(group.id, condition.id, { compare })}
                          />

                          {renderValueInput(condition, group.id)}

                          <SelectControl
                            label={__('Type', 'o4o')}
                            value={condition.type}
                            options={valueTypes}
                            onChange={(type: any) => updateCondition(group.id, condition.id, { type })}
                          />

                          {group.conditions.length > 1 && (
                            <Button
                              icon={trash}
                              onClick={() => removeCondition(group.id, condition.id)}
                              variant="tertiary"
                              size={"small" as any}
                              isDestructive
                            >
                              {__('Remove condition', 'o4o')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add condition button */}
                    <Button
                      icon={plus}
                      onClick={() => addCondition(group.id)}
                      variant="secondary"
                      size={"small" as any}
                    >
                      {__('Add condition', 'o4o')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add group button */}
      <Button
        icon={plus}
        onClick={addConditionGroup}
        variant="primary"
      >
        {conditionGroups.length === 0 
          ? __('Add filter group', 'o4o')
          : __('Add another filter group', 'o4o')
        }
      </Button>
    </PanelBody>
  );
}