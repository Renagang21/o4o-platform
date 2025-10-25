/**
 * Default Leaf Renderer for Slate Editor
 *
 * Renders text formatting marks (bold, italic, underline, etc.)
 * Eliminates duplication across HeadingBlock, ParagraphBlock, ListBlock
 */

import { RenderLeafProps } from 'slate-react';
import { CustomText } from '@/components/editor/slate/types/slate-types';

/**
 * Default leaf renderer with common text formatting
 *
 * Supports:
 * - Bold (Cmd+B)
 * - Italic (Cmd+I)
 * - Underline (Cmd+U)
 * - Code (Cmd+E)
 * - Strikethrough
 *
 * @param props - Slate RenderLeafProps
 * @returns Formatted text span
 *
 * @example
 * ```typescript
 * <Editable
 *   renderLeaf={DefaultLeafRenderer}
 *   // ... other props
 * />
 * ```
 */
export const DefaultLeafRenderer = (props: RenderLeafProps) => {
  let children = props.children;
  const leaf = props.leaf as CustomText;

  // Apply formatting in specific order for consistent nesting
  if (leaf.code) {
    children = (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  }

  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.strikethrough) {
    children = <s>{children}</s>;
  }

  return <span {...props.attributes}>{children}</span>;
};
