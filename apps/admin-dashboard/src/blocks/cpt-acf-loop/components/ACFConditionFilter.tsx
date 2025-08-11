/**
 * ACF Condition Filter Component
 * 
 * Meta query builder for filtering posts by ACF field values
 */

import { useState } from '@wordpress/element';
import { PanelBody, Button, SelectControl, TextControl, Notice,  } from '@wordpress/components';
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
    { label: 'Equal to', value: '=' },
    { label: 'Not equal to', value: '!=' },
    { label: 'Greater than', value: '>' },
    { label: 'Greater than or equal', value: '>=' },
    { label: 'Less than', value: '<' },
    { label: 'Less than or equal', value: '<=' },
    { label: 'Contains', value: 'LIKE' },
    { label: 'Does not contain', value: 'NOT LIKE' },
    { label: 'Exists', value: 'EXISTS' },
    { label: 'Does not exist', value: 'NOT EXISTS' },
    { label: 'In array', value: 'IN' },
    { label: 'Not in array', value: 'NOT IN' },
    { label: 'Between', value: 'BETWEEN' },
    { label: 'Not between', value: 'NOT BETWEEN' },
  ];

  // Value types
  const valueTypes = [
    { label: 'Text', value: 'CHAR' },
    { label: 'Number', value: 'NUMERIC' },
    { label: 'Date', value: 'DATE' },
    { label: 'DateTime', value: 'DATETIME' },
    { label: 'Time', value: 'TIME' },
    { label: 'Binary', value: 'BINARY' },
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
    { label: 'Select a field', value: '' },
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
          label={'Values (comma separated)'}
          value={condition.value}
          onChange={(value: string) => updateCondition(groupId, condition.id, { value })}
          placeholder="value1, value2, value3"
          className=""
          help=""
          __nextHasNoMarginBottom={false}
          hideLabelFromVision={false}
        />
      );
    }

    if (rangeOperators.includes(condition.compare)) {
      return (
        <TextControl
          label={'Range (min, max)'}
          value={condition.value}
          onChange={(value: string) => updateCondition(groupId, condition.id, { value })}
          placeholder="10, 100"
          className=""
          help=""
          __nextHasNoMarginBottom={false}
          hideLabelFromVision={false}
        />
      );
    }

    // Default text input
    return (
      <TextControl
        label={'Value'}
        value={condition.value}
        className=""
        help=""
        __nextHasNoMarginBottom={false}
        hideLabelFromVision={false}
        onChange={(value: any) => updateCondition(groupId, condition.id, { value })}
        type={condition.type === 'NUMERIC' ? 'number' : 'text'}
      />
    );
  };

  return (
    <PanelBody 
      title={'ACF Field Filters'} 
      initialOpen={false}
      icon={settings}
    >
      {conditionGroups.length === 0 ? (
        <Notice status="info" isDismissible={false}>
          <p>{'No field filters active.'}</p>
          <p>{'Add filters to query posts based on ACF field values.'}</p>
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
                      {'Filter Group'} {groupIndex + 1}
                    </span>
                    <span style={{
                      background: '#0073aa',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                    }}>
                      {group.conditions.length} {group.conditions.length === 1 ? 'condition' : 'conditions'}
                    </span>
                  </div>
                  <Button
                    icon={trash}
                    onClick={() => removeConditionGroup(group.id)}
                    variant="tertiary"
                    size={"small" as any}
                    isDestructive
                    label={'Remove group'}
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
                          label={'Combine with previous group using'}
                          value={group.relation}
                          options={[
                            { label: 'AND', value: 'AND' },
                            { label: 'OR', value: 'OR' },
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
                            label={'Field'}
                            value={condition.field}
                            options={fieldOptions}
                            onChange={(field: any) => updateCondition(group.id, condition.id, { field })}
                          />

                          <SelectControl
                            label={'Comparison'}
                            value={condition.compare}
                            options={compareOperators}
                            onChange={(compare: any) => updateCondition(group.id, condition.id, { compare })}
                          />

                          {renderValueInput(condition, group.id)}

                          <SelectControl
                            label={'Type'}
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
                              {'Remove condition'}
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
                      {'Add condition'}
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
          ? 'Add filter group'
          : 'Add another filter group'
        }
      </Button>
    </PanelBody>
  );
}