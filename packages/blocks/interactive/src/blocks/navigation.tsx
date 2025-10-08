import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface NavItem {
  label: string;
  url: string;
  id: number;
}

interface NavigationBlockProps {
  attributes: {
    items: NavItem[];
    orientation: 'horizontal' | 'vertical';
  };
  setAttributes: (attrs: Partial<NavigationBlockProps['attributes']>) => void;
}

const Edit: React.FC<NavigationBlockProps> = ({ attributes, setAttributes }) => {
  const { items = [], orientation = 'horizontal' } = attributes;

  const addItem = () => {
    const newItem: NavItem = {
      id: Date.now(),
      label: 'New Link',
      url: '#'
    };
    setAttributes({ items: [...items, newItem] });
  };

  const updateItem = (id: number, field: 'label' | 'url', value: string) => {
    setAttributes({
      items: items.map((item: NavItem) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const removeItem = (id: number) => {
    setAttributes({ items: items.filter((item: NavItem) => item.id !== id) });
  };

  const classNames = [
    'wp-block-navigation',
    orientation === 'vertical' && 'is-vertical'
  ].filter(Boolean).join(' ');

  return (
    <div>
      <div className="block-editor-block-toolbar">
        <select
          value={orientation}
          onChange={(e) => setAttributes({ orientation: e.target.value as 'horizontal' | 'vertical' })}
        >
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
        <button onClick={addItem} style={{ marginLeft: '10px' }}>
          Add Link
        </button>
      </div>

      <nav className={classNames}>
        <ul className="wp-block-navigation__container">
          {items.length === 0 ? (
            <li style={{ padding: '10px', background: '#f0f0f0' }}>
              Click "Add Link" to create navigation
            </li>
          ) : (
            items.map((item: NavItem) => (
              <li key={item.id} className="wp-block-navigation-item">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                  placeholder="Label"
                  style={{ marginRight: '5px', padding: '2px' }}
                />
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => updateItem(item.id, 'url', e.target.value)}
                  placeholder="URL"
                  style={{ marginRight: '5px', padding: '2px' }}
                />
                <button onClick={() => removeItem(item.id)}>×</button>
              </li>
            ))
          )}
        </ul>
      </nav>
    </div>
  );
};

const Save: React.FC<Pick<NavigationBlockProps, 'attributes'>> = ({ attributes }) => {
  const { items = [], orientation = 'horizontal' } = attributes;

  const classNames = [
    'wp-block-navigation',
    orientation === 'vertical' && 'is-vertical'
  ].filter(Boolean).join(' ');

  return (
    <nav className={classNames}>
      <ul className="wp-block-navigation__container">
        {items.map((item: NavItem) => (
          <li key={item.id} className="wp-block-navigation-item">
            <a href={item.url}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const NavigationBlock: BlockDefinition = {
  name: 'o4o/navigation',
  title: 'Navigation',
  category: 'interactive',
  icon: 'menu',
  description: 'Add a navigation menu with custom links.',
  keywords: ['navigation', 'menu', 'nav', 'links'],

  attributes: {
    items: {
      type: 'array',
      default: []
    },
    orientation: {
      type: 'string',
      default: 'horizontal'
    }
  },

  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true
  },

  edit: Edit,
  save: Save
};

export default NavigationBlock;