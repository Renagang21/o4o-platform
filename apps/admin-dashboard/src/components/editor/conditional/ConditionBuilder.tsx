/**
 * ConditionBuilder Component
 * Manage multiple conditions with AND/OR logic (WordPress Toolset-style)
 */

import React, { useState, useCallback } from 'react';
import { Plus, Save, X } from 'lucide-react';
import {
  Condition,
  LogicOperator,
  ConditionalBlockData,
} from '@/types/conditional-block.types';
import ConditionRow from './ConditionRow';

interface ConditionBuilderProps {
  initialData?: ConditionalBlockData;
  onSave: (data: ConditionalBlockData) => void;
  onCancel: () => void;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  // State
  const [conditions, setConditions] = useState<Condition[]>(
    initialData?.conditions || []
  );
  const [logicOperator, setLogicOperator] = useState<LogicOperator>(
    initialData?.logicOperator || 'AND'
  );
  const [showWhenMet, setShowWhenMet] = useState<boolean>(
    initialData?.showWhenMet ?? true
  );

  // Add new condition
  const handleAddCondition = useCallback(() => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user_logged_in',
      operator: 'is',
      value: true,
      label: 'User Login Status',
    };

    setConditions((prev) => [...prev, newCondition]);
  }, []);

  // Update condition
  const handleUpdateCondition = useCallback((index: number, condition: Condition) => {
    setConditions((prev) => {
      const newConditions = [...prev];
      newConditions[index] = condition;
      return newConditions;
    });
  }, []);

  // Remove condition
  const handleRemoveCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Save
  const handleSave = useCallback(() => {
    onSave({
      conditions,
      logicOperator,
      showWhenMet,
    });
  }, [conditions, logicOperator, showWhenMet, onSave]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Conditional Block Settings
          </h2>
          <button
            onClick={onCancel}
            style={{
              padding: '4px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#666',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Visibility Settings */}
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
              }}
            >
              Visibility Action:
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  checked={showWhenMet === true}
                  onChange={() => setShowWhenMet(true)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>Show when conditions are met</span>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  checked={showWhenMet === false}
                  onChange={() => setShowWhenMet(false)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>Hide when conditions are met</span>
              </label>
            </div>
          </div>

          {/* Logic Operator */}
          {conditions.length > 1 && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#fff8e1',
                borderRadius: '6px',
                border: '1px solid #ffc107',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Logic:
              </label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    checked={logicOperator === 'AND'}
                    onChange={() => setLogicOperator('AND')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    <strong>AND</strong> - All conditions must be met
                  </span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    checked={logicOperator === 'OR'}
                    onChange={() => setLogicOperator('OR')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    <strong>OR</strong> - At least one condition must be met
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Conditions List */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
              }}
            >
              Conditions:
            </div>

            {conditions.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  border: '2px dashed #ddd',
                  color: '#666',
                  fontSize: '14px',
                }}
              >
                No conditions added yet. Click "Add Condition" to get started.
              </div>
            ) : (
              <div>
                {conditions.map((condition, index) => (
                  <div key={condition.id} style={{ position: 'relative' }}>
                    <ConditionRow
                      condition={condition}
                      onChange={(updated) => handleUpdateCondition(index, updated)}
                      onRemove={() => handleRemoveCondition(index)}
                      showRemove={conditions.length > 1}
                    />
                    {index < conditions.length - 1 && (
                      <div
                        style={{
                          textAlign: 'center',
                          margin: '4px 0',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: logicOperator === 'AND' ? '#0073aa' : '#d63384',
                        }}
                      >
                        {logicOperator}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Condition Button */}
          <button
            onClick={handleAddCondition}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px dashed #0073aa',
              background: 'transparent',
              color: '#0073aa',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 115, 170, 0.05)';
              e.currentTarget.style.borderColor = '#005a87';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#0073aa';
            }}
          >
            <Plus size={16} />
            Add Condition
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              background: '#fff',
              color: '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: '#0073aa',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Save size={16} />
            Save Conditions
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConditionBuilder;
