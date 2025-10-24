/**
 * SlateBlockWrapper Component
 *
 * Common wrapper for Slate.js-based blocks that handles view/edit mode switching.
 *
 * Features:
 * - Automatically switches between edit mode (Slate editor) and view mode (rendered HTML)
 * - Reduces code duplication across text-based blocks
 * - Maintains consistent behavior for all Slate blocks
 *
 * Usage:
 * ```tsx
 * <SlateBlockWrapper
 *   isSelected={isSelected}
 *   content={content}
 *   viewModeStyle={{ textAlign: align }}
 *   emptyPlaceholder="<p><br></p>"
 * >
 *   <Slate editor={editor}>
 *     <Editable ... />
 *   </Slate>
 * </SlateBlockWrapper>
 * ```
 */

import React, { ReactNode, CSSProperties } from 'react';

interface SlateBlockWrapperProps {
  /** Whether this block is currently selected/focused */
  isSelected: boolean;
  /** HTML content to display in view mode */
  content: string;
  /** Children to render in edit mode (typically Slate editor) */
  children: ReactNode;
  /** Additional styles for view mode container */
  viewModeStyle?: CSSProperties;
  /** Additional class names for view mode container */
  viewModeClassName?: string;
  /** Placeholder HTML when content is empty */
  emptyPlaceholder?: string;
}

const SlateBlockWrapper: React.FC<SlateBlockWrapperProps> = ({
  isSelected,
  content,
  children,
  viewModeStyle = {},
  viewModeClassName = '',
  emptyPlaceholder = '<p><br></p>',
}) => {
  if (isSelected) {
    // Edit mode: Render Slate editor
    return <>{children}</>;
  }

  // View mode: Render HTML content
  return (
    <div
      className={`view-mode-content ${viewModeClassName}`.trim()}
      style={{
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        minHeight: '1.5em',
        ...viewModeStyle,
      }}
      dangerouslySetInnerHTML={{ __html: content || emptyPlaceholder }}
    />
  );
};

export default SlateBlockWrapper;
