/**
 * ConditionalBlock Component
 * Container block that shows/hides content based on conditions
 */

import React, { useCallback } from 'react';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { BlockProps } from '@/blocks/registry/types';
import { GitBranch, Eye, EyeOff, Plus } from 'lucide-react';
import { Condition, LogicOperator } from '@/types/conditional-block.types';

interface ConditionalBlockProps extends BlockProps {
  attributes?: {
    conditions?: Condition[];
    logicOperator?: LogicOperator;
    showWhenMet?: boolean;
    showIndicator?: boolean;
    indicatorText?: string;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const ConditionalBlock: React.FC<ConditionalBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
}) => {
  const {
    conditions = [],
    logicOperator = 'AND',
    showWhenMet = true,
    showIndicator = true,
    indicatorText = 'Conditional Content',
  } = attributes;

  // Handle inner blocks change
  const handleInnerBlocksChange = useCallback((newBlocks: Block[]) => {
    if (onInnerBlocksChange) {
      onInnerBlocksChange(newBlocks);
    }
  }, [onInnerBlocksChange]);

  // Handle add condition (placeholder for Phase 6)
  const handleAddCondition = useCallback(() => {
    // TODO: Open ConditionBuilder modal/panel in Phase 6
    console.log('Add condition clicked - UI to be implemented in Phase 6');
  }, []);

  // Get condition summary text
  const getConditionSummary = (): string => {
    if (conditions.length === 0) {
      return 'No conditions set (always visible)';
    }

    const action = showWhenMet ? 'Show' : 'Hide';
    const operator = logicOperator === 'AND' ? 'all' : 'any';
    const plural = conditions.length === 1 ? 'condition' : 'conditions';

    return `${action} when ${operator} of ${conditions.length} ${plural} met`;
  };

  return (
    <div
      className="wp-block-conditional"
      style={{
        position: 'relative',
        border: '2px dashed #0073aa',
        borderRadius: '4px',
        padding: '16px',
        backgroundColor: isSelected ? 'rgba(0, 115, 170, 0.05)' : 'transparent',
        minHeight: '100px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {/* Indicator header */}
      {showIndicator && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            padding: '8px 12px',
            background: '#0073aa',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <GitBranch size={16} />
          <span>{indicatorText}</span>
          {showWhenMet ? (
            <Eye size={16} title="Show when conditions met" />
          ) : (
            <EyeOff size={16} title="Hide when conditions met" />
          )}
        </div>
      )}

      {/* Conditions summary */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '8px 12px',
          background: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#555',
        }}
      >
        <span>{getConditionSummary()}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddCondition();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 12px',
            background: '#0073aa',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
          title="Add/Edit Conditions"
        >
          <Plus size={14} />
          {conditions.length === 0 ? 'Add Condition' : 'Edit Conditions'}
        </button>
      </div>

      {/* Conditions list (temporary simple view) */}
      {conditions.length > 0 && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#555' }}>
            Active Conditions ({logicOperator}):
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
            {conditions.map((condition, index) => (
              <li key={condition.id || index} style={{ marginBottom: '4px' }}>
                {condition.label || `${condition.type} ${condition.operator} ${JSON.stringify(condition.value)}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inner blocks container */}
      <div
        style={{
          minHeight: '60px',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
          border: '1px dashed #ccc',
        }}
      >
        <InnerBlocks
          parentBlockId={id || 'conditional'}
          blocks={innerBlocks}
          onBlocksChange={handleInnerBlocksChange}
          selectedBlockId={isSelected ? id : null}
          placeholder="Add content to show/hide conditionally..."
          renderAppender={true}
          orientation="vertical"
          className="conditional-inner-blocks"
          currentDepth={2}
        />
      </div>

      {/* Editor hint */}
      {isSelected && conditions.length === 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            background: '#fff8e1',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#856404',
          }}
        >
          ⚠️ <strong>No conditions set:</strong> This content will always be visible.
          Click "Add Condition" to set visibility rules.
        </div>
      )}
    </div>
  );
};

export default ConditionalBlock;
