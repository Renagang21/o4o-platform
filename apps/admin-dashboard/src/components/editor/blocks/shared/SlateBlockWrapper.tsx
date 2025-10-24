/**
 * SlateBlockWrapper Component
 *
 * Common wrapper for Slate.js-based blocks that handles view/edit mode switching.
 *
 * Features:
 * - Automatically switches between edit mode (Slate editor) and view mode (rendered HTML)
 * - Reduces code duplication across text-based blocks
 * - Maintains consistent behavior for all Slate blocks
 * - Uses current editor state for view mode to prevent content loss
 *
 * Usage:
 * ```tsx
 * <SlateBlockWrapper
 *   isSelected={isSelected}
 *   value={value}
 *   serialize={serialize}
 *   viewModeStyle={{ textAlign: align }}
 *   emptyPlaceholder="<p><br></p>"
 * >
 *   <Slate editor={editor}>
 *     <Editable ... />
 *   </Slate>
 * </SlateBlockWrapper>
 * ```
 */

import React, { ReactNode, CSSProperties, useMemo } from 'react';
import { Descendant } from 'slate';

interface SlateBlockWrapperProps {
  /** Whether this block is currently selected/focused */
  isSelected: boolean;
  /** Current Slate editor value (state) */
  value: Descendant[];
  /** Function to serialize Slate value to HTML */
  serialize: (value: Descendant[]) => string;
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
  value,
  serialize,
  children,
  viewModeStyle = {},
  viewModeClassName = '',
  emptyPlaceholder = '<p><br></p>',
}) => {
  // Serialize current value for view mode
  const viewModeHtml = useMemo(() => {
    try {
      const html = serialize(value);
      return html || emptyPlaceholder;
    } catch (error) {
      console.error('Failed to serialize Slate value:', error);
      return emptyPlaceholder;
    }
  }, [value, serialize, emptyPlaceholder]);

  if (isSelected) {
    // Edit mode: Render Slate editor
    return <>{children}</>;
  }

  // View mode: Render HTML content from current state
  return (
    <div
      className={`view-mode-content ${viewModeClassName}`.trim()}
      style={{
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        minHeight: '1.5em',
        ...viewModeStyle,
      }}
      dangerouslySetInnerHTML={{ __html: viewModeHtml }}
    />
  );
};

export default SlateBlockWrapper;
