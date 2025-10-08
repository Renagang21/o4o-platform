import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface ListBlockProps {
  attributes: {
    items?: string[];
    ordered?: boolean;
    reversed?: boolean;
    start?: number;
  };
  setAttributes: (attrs: Partial<ListBlockProps['attributes']>) => void;
}

// Edit Component
const Edit: React.FC<ListBlockProps> = ({ attributes, setAttributes }) => {
  const { items = [], ordered, reversed, start } = attributes;
  const Tag = ordered ? 'ol' : 'ul';

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setAttributes({ items: newItems });
  };

  const addItem = () => {
    setAttributes({ items: [...items, ''] });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_: string, i: number) => i !== index);
    setAttributes({ items: newItems });
  };
  
  const toggleOrdered = () => {
    setAttributes({ ordered: !ordered });
  };

  const listAttributes: React.OlHTMLAttributes<HTMLOListElement> & React.HTMLAttributes<HTMLUListElement> = {
    className: 'wp-block-list',
  };

  if (ordered && reversed) {
    listAttributes.reversed = true;
  }

  if (ordered && start && start !== 1) {
    listAttributes.start = start;
  }
  
  return (
    <>
      <div className="block-editor-block-toolbar">
        <button onClick={toggleOrdered}>
          {ordered ? 'Numbered List' : 'Bullet List'}
        </button>
        <button onClick={addItem}>Add Item</button>
      </div>
      <Tag {...listAttributes}>
        {items.map((item: string, index: number) => (
          <li key={index}>
            <input
              type="text"
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              placeholder="List item..."
            />
            <button onClick={() => removeItem(index)}>×</button>
          </li>
        ))}
      </Tag>
    </>
  );
};

// Save Component
const Save: React.FC<Pick<ListBlockProps, 'attributes'>> = ({ attributes }) => {
  const { items = [], ordered, reversed, start } = attributes;
  const Tag = ordered ? 'ol' : 'ul';

  const listAttributes: React.OlHTMLAttributes<HTMLOListElement> & React.HTMLAttributes<HTMLUListElement> = {
    className: 'wp-block-list',
  };

  if (ordered && reversed) {
    listAttributes.reversed = true;
  }

  if (ordered && start && start !== 1) {
    listAttributes.start = start;
  }

  return (
    <Tag {...listAttributes}>
      {items.map((item: string, index: number) => (
        <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </Tag>
  );
};

// Block Definition
const ListBlock: BlockDefinition = {
  name: 'o4o/list',
  title: 'List',
  category: 'text',
  icon: 'editor-ul',
  description: 'Create a bulleted or numbered list.',
  keywords: ['list', 'ul', 'ol', 'bullet', 'numbered'],
  
  attributes: {
    items: {
      type: 'array',
      default: ['']
    },
    ordered: {
      type: 'boolean',
      default: false
    },
    reversed: {
      type: 'boolean',
      default: false
    },
    start: {
      type: 'number',
      default: 1
    }
  },
  
  supports: {
    align: true,
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true
    },
    spacing: {
      margin: true,
      padding: true
    },
    typography: {
      fontSize: true,
      lineHeight: true
    }
  },
  
  edit: Edit,
  save: Save
};

export default ListBlock;