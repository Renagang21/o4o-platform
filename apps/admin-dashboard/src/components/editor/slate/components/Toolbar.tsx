/**
 * Slate Editor Toolbar Component
 *
 * Provides formatting buttons for the Slate editor:
 * - Bold (Ctrl/Cmd + B)
 * - Italic (Ctrl/Cmd + I)
 *
 * Uses useSlate hook to access editor state and operations
 */

import React from 'react';
import { useSlate } from 'slate-react';
import { isMarkActive, toggleMark } from '../utils/marks';
import type { CustomText } from '../types/slate-types';

/**
 * Toolbar Component Props
 */
export interface ToolbarProps {
  className?: string;
}

/**
 * Main Toolbar Component
 */
export const Toolbar: React.FC<ToolbarProps> = ({ className = '' }) => {
  const editor = useSlate();

  return (
    <div
      className={`slate-toolbar ${className}`}
      style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}
    >
      <FormatButton
        format="bold"
        icon="B"
        tooltip="Bold (Ctrl+B)"
        editor={editor}
      />
      <FormatButton
        format="italic"
        icon="I"
        tooltip="Italic (Ctrl+I)"
        editor={editor}
      />
    </div>
  );
};

/**
 * Format Button Props
 */
interface FormatButtonProps {
  format: keyof CustomText;
  icon: string;
  tooltip: string;
  editor: any;
}

/**
 * Format Button Component
 *
 * Renders a single formatting button with active state
 */
const FormatButton: React.FC<FormatButtonProps> = ({
  format,
  icon,
  tooltip,
  editor,
}) => {
  const isActive = isMarkActive(editor, format);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    toggleMark(editor, format);
  };

  return (
    <button
      type="button"
      title={tooltip}
      onMouseDown={handleMouseDown}
      style={{
        padding: '6px 12px',
        border: '1px solid #cbd5e1',
        borderRadius: '4px',
        backgroundColor: isActive ? '#3b82f6' : '#ffffff',
        color: isActive ? '#ffffff' : '#1e293b',
        fontWeight: format === 'bold' ? 'bold' : 'normal',
        fontStyle: format === 'italic' ? 'italic' : 'normal',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.target as HTMLButtonElement).style.backgroundColor = '#f1f5f9';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.target as HTMLButtonElement).style.backgroundColor = '#ffffff';
        }
      }}
    >
      {icon}
    </button>
  );
};
