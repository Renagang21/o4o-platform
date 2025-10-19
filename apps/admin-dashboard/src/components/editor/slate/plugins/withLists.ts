/**
 * withLists Plugin
 *
 * Handles list-specific behaviors in Slate editor:
 * - Tab/Shift+Tab for indenting/outdenting list items
 * - Enter key handling (create new list item or exit list)
 * - Backspace handling (delete empty list items or outdent)
 * - Ensuring proper list structure
 */

import { Editor, Element as SlateElement, Transforms, Path, Range, Node } from 'slate';
import type { ListElement, ListItemElement } from '../types/slate-types';
import { isListElement, isListItemElement } from '../types/slate-types';

/**
 * Check if cursor is in a list
 */
export const isInList = (editor: Editor): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && (n.type === 'ordered-list' || n.type === 'unordered-list'),
    mode: 'lowest',
  });

  return !!match;
};

/**
 * Check if cursor is in a list item
 */
export const isInListItem = (editor: Editor): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && n.type === 'list-item',
    mode: 'lowest',
  });

  return !!match;
};

/**
 * Get current list item node and path
 */
export const getCurrentListItem = (editor: Editor): [ListItemElement, Path] | null => {
  const { selection } = editor;
  if (!selection) return null;

  const [match] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && n.type === 'list-item',
    mode: 'lowest',
  });

  if (!match) return null;
  return match as [ListItemElement, Path];
};

/**
 * Get current list node and path
 */
export const getCurrentList = (editor: Editor): [ListElement, Path] | null => {
  const { selection } = editor;
  if (!selection) return null;

  const [match] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && (n.type === 'ordered-list' || n.type === 'unordered-list'),
    mode: 'lowest',
  });

  if (!match) return null;
  return match as [ListElement, Path];
};

/**
 * Indent list item (Tab key)
 */
export const indentListItem = (editor: Editor): boolean => {
  const listItemMatch = getCurrentListItem(editor);
  if (!listItemMatch) return false;

  const [listItem, listItemPath] = listItemMatch;

  // Get previous sibling
  if (listItemPath[listItemPath.length - 1] === 0) {
    // First item cannot be indented
    return false;
  }

  const previousItemPath = Path.previous(listItemPath);
  const previousItem = Node.get(editor, previousItemPath) as ListItemElement;

  if (!isListItemElement(previousItem)) return false;

  // Check if previous item already has a nested list
  const nestedList = previousItem.children.find(
    (child) => SlateElement.isElement(child) && isListElement(child)
  ) as ListElement | undefined;

  // Get the parent list to determine type
  const parentListMatch = getCurrentList(editor);
  if (!parentListMatch) return false;
  const [parentList] = parentListMatch;

  if (nestedList) {
    // Add current item to existing nested list
    Transforms.moveNodes(editor, {
      at: listItemPath,
      to: [...previousItemPath, previousItem.children.length - 1, nestedList.children.length],
    });
  } else {
    // Create new nested list in previous item
    const newNestedList: ListElement = {
      type: parentList.type,
      children: [],
    };

    // Remove current item from parent list
    Transforms.removeNodes(editor, { at: listItemPath });

    // Insert nested list into previous item with the removed item
    Transforms.insertNodes(
      editor,
      {
        ...newNestedList,
        children: [listItem],
      },
      {
        at: [...previousItemPath, previousItem.children.length],
      }
    );
  }

  return true;
};

/**
 * Outdent list item (Shift+Tab key)
 */
export const outdentListItem = (editor: Editor): boolean => {
  const listItemMatch = getCurrentListItem(editor);
  if (!listItemMatch) return false;

  const [, listItemPath] = listItemMatch;

  // Get parent list
  const parentListPath = Path.parent(listItemPath);
  const parentList = Node.get(editor, parentListPath);

  if (!isListElement(parentList)) return false;

  // Get grandparent (should be a list item if this is a nested list)
  const grandparentPath = Path.parent(parentListPath);
  const grandparent = Node.get(editor, grandparentPath);

  if (!isListItemElement(grandparent)) {
    // Already at top level, cannot outdent
    return false;
  }

  // Get great-grandparent list path
  const greatGrandparentListPath = Path.parent(grandparentPath);

  // Calculate new position (after grandparent)
  const newPath = Path.next(grandparentPath);

  // Move the item to after grandparent
  Transforms.moveNodes(editor, {
    at: listItemPath,
    to: newPath,
  });

  return true;
};

/**
 * withLists plugin
 */
export const withLists = (editor: Editor): Editor => {
  const { insertBreak, deleteBackward } = editor;

  // Override insertBreak to handle Enter key in lists
  editor.insertBreak = () => {
    const listItemMatch = getCurrentListItem(editor);

    if (listItemMatch) {
      const [listItem, listItemPath] = listItemMatch;

      // Check if current list item is empty
      const text = Node.string(listItem);
      const isEmpty = !text || text.trim() === '';

      if (isEmpty) {
        // Empty list item - exit the list
        const listMatch = getCurrentList(editor);
        if (!listMatch) {
          insertBreak();
          return;
        }

        const [, listPath] = listMatch;

        // Remove empty list item
        Transforms.removeNodes(editor, { at: listItemPath });

        // Insert a paragraph after the list
        Transforms.insertNodes(
          editor,
          {
            type: 'paragraph',
            children: [{ text: '' }],
          },
          {
            at: Path.next(listPath),
          }
        );

        // Move selection to new paragraph
        Transforms.select(editor, Path.next(listPath));

        return;
      }

      // Non-empty list item - create new list item
      Transforms.splitNodes(editor, {
        match: (n) => SlateElement.isElement(n) && n.type === 'list-item',
      });

      return;
    }

    // Not in a list, use default behavior
    insertBreak();
  };

  // Override deleteBackward to handle Backspace in lists
  editor.deleteBackward = (unit) => {
    const { selection } = editor;

    if (selection && Range.isCollapsed(selection)) {
      const listItemMatch = getCurrentListItem(editor);

      if (listItemMatch) {
        const [listItem, listItemPath] = listItemMatch;

        // Check if at start of list item
        const [start] = Range.edges(selection);
        const startOffset = start.offset;

        if (startOffset === 0) {
          // Check if list item is empty
          const text = Node.string(listItem);
          const isEmpty = !text || text.trim() === '';

          if (isEmpty) {
            // Empty list item at start - remove it
            const listMatch = getCurrentList(editor);
            if (!listMatch) {
              deleteBackward(unit);
              return;
            }

            const [list, listPath] = listMatch;

            // If this is the only item in the list, remove the list
            if (list.children.length === 1) {
              Transforms.removeNodes(editor, { at: listPath });
              // Insert paragraph
              Transforms.insertNodes(
                editor,
                {
                  type: 'paragraph',
                  children: [{ text: '' }],
                },
                { at: listPath }
              );
              return;
            }

            // Otherwise just remove this item
            Transforms.removeNodes(editor, { at: listItemPath });
            return;
          }

          // Non-empty list item - try to outdent
          if (outdentListItem(editor)) {
            return;
          }
        }
      }
    }

    // Default behavior
    deleteBackward(unit);
  };

  return editor;
};
