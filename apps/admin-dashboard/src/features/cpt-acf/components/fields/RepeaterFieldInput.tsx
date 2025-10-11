/**
 * Repeater Field Input Component
 * Allows users to add, remove, and edit rows of sub-fields
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from 'lucide-react';
import type { CustomField, RepeaterValue, RepeaterRow } from '../../types/acf.types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RepeaterFieldInputProps {
  field: CustomField;
  value?: RepeaterValue | null;
  onChange?: (value: RepeaterValue | null) => void;
  disabled?: boolean;
  /** Unique identifier for this repeater instance (important for nested repeaters) */
  repeaterId?: string;
  /** Parent repeater ID (for nested repeaters) */
  parentRepeaterId?: string;
  renderSubField?: (
    subField: CustomField,
    value: any,
    onChange: (value: any) => void,
    disabled?: boolean
  ) => React.ReactNode;
}

export const RepeaterFieldInput: React.FC<RepeaterFieldInputProps> = ({
  field,
  value = [],
  onChange,
  disabled = false,
  repeaterId,
  parentRepeaterId,
  renderSubField,
}) => {
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  // Generate a unique ID for this repeater instance if not provided
  const instanceId = useMemo(() => {
    return repeaterId || `repeater_${field.name}_${Date.now()}`;
  }, [repeaterId, field.name]);

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure value is an array
  const rows = useMemo(() => {
    if (!value || !Array.isArray(value)) return [];
    return value;
  }, [value]);

  // Get repeater configuration
  const config = useMemo(() => ({
    layout: field.layout || 'block',
    buttonLabel: field.buttonLabel || 'Add Row',
    minRows: field.minRows || 0,
    maxRows: field.maxRows || 0,
    collapsed: field.collapsed,
    subFields: field.subFields || [],
  }), [field]);

  // Create empty row with default values
  const createEmptyRow = useCallback((): RepeaterRow => {
    const row: RepeaterRow = {
      _id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Initialize with default values for each sub-field
    config.subFields.forEach(subField => {
      row[subField.name] = subField.defaultValue || null;
    });

    return row;
  }, [config.subFields]);

  // Add new row
  const handleAddRow = useCallback(() => {
    if (disabled) return;

    // Check max rows limit
    if (config.maxRows > 0 && rows.length >= config.maxRows) {
      return;
    }

    const newRow = createEmptyRow();
    const newRows = [...rows, newRow];
    onChange?.(newRows);
  }, [disabled, config.maxRows, rows, createEmptyRow, onChange]);

  // Remove row
  const handleRemoveRow = useCallback((rowId: string) => {
    if (disabled) return;

    // Check min rows limit
    if (config.minRows > 0 && rows.length <= config.minRows) {
      return;
    }

    const newRows = rows.filter(row => row._id !== rowId);
    onChange?.(newRows.length > 0 ? newRows : null);
  }, [disabled, config.minRows, rows, onChange]);

  // Update row field value
  const handleRowFieldChange = useCallback((rowId: string, fieldName: string, fieldValue: any) => {
    if (disabled) return;

    const newRows = rows.map(row => {
      if (row._id === rowId) {
        return { ...row, [fieldName]: fieldValue };
      }
      return row;
    });

    onChange?.(newRows);
  }, [disabled, rows, onChange]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedRowId = event.active.id as string;

    // Verify the row belongs to this repeater instance
    const rowExists = rows.some(row => row._id === draggedRowId);
    if (!rowExists) {
      console.warn(`[Repeater ${instanceId}] Attempted to drag row from different repeater`);
      return;
    }

    setActiveId(draggedRowId);
  }, [rows, instanceId]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    // Validate both items belong to this repeater
    const oldIndex = rows.findIndex(row => row._id === active.id);
    const newIndex = rows.findIndex(row => row._id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      console.warn(`[Repeater ${instanceId}] Attempted to drop row from different repeater`);
      setActiveId(null);
      return;
    }

    // Perform the reorder
    const newRows = arrayMove(rows, oldIndex, newIndex);
    onChange?.(newRows);

    setActiveId(null);
  }, [rows, onChange, instanceId]);

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Toggle row collapse
  const toggleRowCollapse = useCallback((rowId: string) => {
    setCollapsedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Collapse all rows
  const collapseAll = useCallback(() => {
    const allRowIds = new Set(rows.map(row => row._id));
    setCollapsedRows(allRowIds);
  }, [rows]);

  // Expand all rows
  const expandAll = useCallback(() => {
    setCollapsedRows(new Set());
  }, []);

  // Check if all rows are collapsed
  const allCollapsed = useMemo(() => {
    return rows.length > 0 && rows.every(row => collapsedRows.has(row._id));
  }, [rows, collapsedRows]);

  // Get collapsed field display value
  const getCollapsedValue = useCallback((row: RepeaterRow): string => {
    if (!config.collapsed) return '';

    const value = row[config.collapsed];
    if (value === null || value === undefined) return '';

    // Handle different value types
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }, [config.collapsed]);

  // Render sub-field input
  const renderFieldInput = useCallback((
    row: RepeaterRow,
    subField: CustomField
  ) => {
    const fieldValue = row[subField.name];

    // If custom renderSubField is provided, use it
    if (renderSubField) {
      return renderSubField(
        subField,
        fieldValue,
        (newValue) => handleRowFieldChange(row._id, subField.name, newValue),
        disabled
      );
    }

    // Default fallback rendering based on field type
    switch (subField.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <input
            type={subField.type}
            value={fieldValue || ''}
            onChange={(e) => handleRowFieldChange(row._id, subField.name, e.target.value)}
            placeholder={subField.placeholder}
            disabled={disabled}
            required={subField.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={fieldValue || ''}
            onChange={(e) => handleRowFieldChange(row._id, subField.name, e.target.value)}
            placeholder={subField.placeholder}
            disabled={disabled}
            required={subField.required}
            rows={subField.rows || 3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={fieldValue || ''}
            onChange={(e) => handleRowFieldChange(row._id, subField.name, e.target.value)}
            placeholder={subField.placeholder}
            disabled={disabled}
            required={subField.required}
            min={subField.min}
            max={subField.max}
            step={subField.step}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'select':
        return (
          <select
            value={fieldValue || ''}
            onChange={(e) => handleRowFieldChange(row._id, subField.name, e.target.value)}
            disabled={disabled}
            required={subField.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {subField.choices?.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <div className="text-sm text-gray-500 italic">
            Field type "{subField.type}" not yet implemented
          </div>
        );
    }
  }, [renderSubField, handleRowFieldChange, disabled]);

  // Sortable Row Wrapper Component
  interface SortableRowWrapperProps {
    id: string;
    children: React.ReactNode;
  }

  const SortableRowWrapper: React.FC<SortableRowWrapperProps> = ({ id, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 200ms ease, opacity 200ms ease, box-shadow 200ms ease',
      opacity: isDragging ? 0.4 : 1,
      position: 'relative',
      zIndex: isDragging ? 999 : 'auto',
      cursor: isDragging ? 'grabbing' : 'default',
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            // Pass drag listeners to the child
            return React.cloneElement(child, { dragListeners: listeners } as any);
          }
          return child;
        })}
      </div>
    );
  };

  // Render single row (Block layout)
  const renderBlockRow = useCallback((row: RepeaterRow, index: number, dragListeners?: any) => {
    const isCollapsed = collapsedRows.has(row._id);
    const collapsedValue = config.collapsed ? getCollapsedValue(row) : '';

    return (
      <Card key={row._id} className="mb-3">
        {/* Row Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
          <div className="flex items-center gap-2 flex-1">
            {/* Drag Handle */}
            <div
              className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
              {...(dragListeners || {})}
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Row Number */}
            <span className="text-sm font-medium text-gray-700">
              Row {index + 1}
            </span>

            {/* Collapsed Value */}
            {isCollapsed && collapsedValue && (
              <span className="text-sm text-gray-500 ml-2 truncate">
                - {collapsedValue}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Collapse Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => toggleRowCollapse(row._id)}
              className="h-8 w-8"
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>

            {/* Delete Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveRow(row._id)}
              disabled={disabled || (config.minRows > 0 && rows.length <= config.minRows)}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row Content */}
        {!isCollapsed && (
          <div className="p-4 space-y-4">
            {config.subFields.map((subField) => (
              <div key={subField.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {subField.label}
                  {subField.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {subField.instructions && (
                  <p className="text-xs text-gray-500 mb-2">{subField.instructions}</p>
                )}
                {renderFieldInput(row, subField)}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }, [collapsedRows, config, getCollapsedValue, toggleRowCollapse, handleRemoveRow, disabled, rows.length, renderFieldInput]);

  // Render single row (Row layout - compact inline)
  const renderRowLayoutRow = useCallback((row: RepeaterRow, index: number, dragListeners?: any) => {
    return (
      <div key={row._id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md bg-white mb-2 hover:bg-gray-50">
        {/* Drag Handle */}
        <div
          className="cursor-grab text-gray-400 hover:text-gray-600 flex-shrink-0 active:cursor-grabbing"
          {...(dragListeners || {})}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Row Number */}
        <span className="text-xs font-medium text-gray-600 w-12 flex-shrink-0">
          #{index + 1}
        </span>

        {/* Fields in a row */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {config.subFields.map((subField, idx) => (
            <div key={subField.name} className={`flex-1 min-w-0 ${idx < config.subFields.length - 1 ? 'border-r border-gray-200 pr-2' : ''}`}>
              <div className="text-xs text-gray-500 mb-1 truncate">{subField.label}</div>
              {renderFieldInput(row, subField)}
            </div>
          ))}
        </div>

        {/* Delete Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleRemoveRow(row._id)}
          disabled={disabled || (config.minRows > 0 && rows.length <= config.minRows)}
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    );
  }, [config, renderFieldInput, handleRemoveRow, disabled, rows.length]);

  // Render single table row
  const renderTableRow = useCallback((row: RepeaterRow, index: number, dragListeners?: any) => {
    return (
      <tr key={row._id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
        {/* Row Number with Drag Handle */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <div
              className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
              {...(dragListeners || {})}
            >
              <GripVertical className="w-3 h-3" />
            </div>
            <span className="text-xs font-medium text-gray-600">{index + 1}</span>
          </div>
        </td>

        {/* Field Cells */}
        {config.subFields.map((subField) => (
          <td key={subField.name} className="px-3 py-2">
            {renderFieldInput(row, subField)}
          </td>
        ))}

        {/* Delete Button */}
        <td className="px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveRow(row._id)}
            disabled={disabled || (config.minRows > 0 && rows.length <= config.minRows)}
            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </td>
      </tr>
    );
  }, [config, renderFieldInput, handleRemoveRow, disabled, rows.length]);

  // Render table layout
  const renderTableLayout = useCallback(() => {
    if (rows.length === 0) return null;

    return (
      <div className="border border-gray-200 rounded-md overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left w-16">#</th>
              {config.subFields.map((subField) => (
                <th key={subField.name} className="px-3 py-2 text-left font-medium text-gray-700">
                  {subField.label}
                  {subField.required && <span className="text-red-500 ml-1">*</span>}
                </th>
              ))}
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <SortableRowWrapper key={row._id} id={row._id}>
                {renderTableRow(row, index)}
              </SortableRowWrapper>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [rows, config, renderTableRow]);

  // Check if can add more rows
  const canAddRow = !disabled && (config.maxRows === 0 || rows.length < config.maxRows);

  // Get active row for drag overlay
  const activeRow = useMemo(() => {
    if (!activeId) return null;
    return rows.find(row => row._id === activeId);
  }, [activeId, rows]);

  return (
    <DndContext
      id={instanceId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={rows.map(row => row._id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="space-y-3"
          data-repeater-id={instanceId}
          data-parent-repeater={parentRepeaterId || 'root'}
        >
          {/* Header with Collapse/Expand All (Block layout only) */}
          {rows.length > 0 && config.layout === 'block' && (
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium text-gray-700">
                {rows.length} {rows.length === 1 ? 'Row' : 'Rows'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={allCollapsed ? expandAll : collapseAll}
                className="text-xs h-7"
              >
                {allCollapsed ? (
                  <>
                    <ChevronsDown className="w-3 h-3 mr-1" />
                    Expand All
                  </>
                ) : (
                  <>
                    <ChevronsUp className="w-3 h-3 mr-1" />
                    Collapse All
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Rows List - Layout-specific rendering */}
          {rows.length > 0 && config.layout === 'block' && (
            <div>
              {rows.map((row, index) => (
                <SortableRowWrapper key={row._id} id={row._id}>
                  {renderBlockRow(row, index)}
                </SortableRowWrapper>
              ))}
            </div>
          )}

          {rows.length > 0 && config.layout === 'table' && renderTableLayout()}

          {rows.length > 0 && config.layout === 'row' && (
            <div>
              {rows.map((row, index) => (
                <SortableRowWrapper key={row._id} id={row._id}>
                  {renderRowLayoutRow(row, index)}
                </SortableRowWrapper>
              ))}
            </div>
          )}

      {/* Empty State */}
      {rows.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600 mb-3">
            No rows added yet
          </p>
        </div>
      )}

      {/* Add Row Button */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={!canAddRow}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          {config.buttonLabel}
        </Button>

        {/* Row Counter */}
        <span className="text-sm text-gray-600">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          {config.maxRows > 0 && ` (max: ${config.maxRows})`}
        </span>
      </div>

      {/* Min/Max Warnings */}
      {config.minRows > 0 && rows.length < config.minRows && (
        <p className="text-sm text-orange-600">
          Minimum {config.minRows} row{config.minRows !== 1 ? 's' : ''} required
        </p>
      )}
    </div>
      </SortableContext>

      {/* Drag Overlay - Shows a preview of the dragged item */}
      <DragOverlay>
        {activeRow && (
          <div className="opacity-90 shadow-2xl ring-2 ring-blue-500 rounded-md bg-white">
            {config.layout === 'block' && renderBlockRow(activeRow, -1)}
            {config.layout === 'row' && renderRowLayoutRow(activeRow, -1)}
            {config.layout === 'table' && (
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="font-medium">Row being moved...</div>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default RepeaterFieldInput;
