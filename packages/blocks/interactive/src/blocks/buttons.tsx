import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

// Buttons Container Block
interface ButtonsBlockProps {
  attributes: {
    layout: string;
    orientation: string;
  };
  setAttributes: (attrs: Partial<ButtonsBlockProps['attributes']>) => void;
}

const ButtonsEdit: React.FC<ButtonsBlockProps> = ({ attributes, setAttributes }) => {
  const { layout, orientation } = attributes;
  
  const classNames = [
    'wp-block-buttons',
    layout && `is-layout-${layout}`,
    orientation && `is-${orientation}`,
  ].filter(Boolean).join(' ');
  
  return (
    <div>
      <div className="block-editor-block-toolbar">
        <select 
          value={layout || 'flex'} 
          onChange={(e) => setAttributes({ layout: e.target.value })}
        >
          <option value="flex">Flex</option>
          <option value="fill">Fill</option>
        </select>
        <select 
          value={orientation || 'horizontal'} 
          onChange={(e) => setAttributes({ orientation: e.target.value })}
        >
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </div>
      <div className={classNames}>
        <p style={{ padding: '10px', background: '#f0f0f0' }}>Button container - add buttons here</p>
      </div>
    </div>
  );
};

const ButtonsSave: React.FC<Pick<ButtonsBlockProps, 'attributes'>> = ({ attributes }) => {
  const { layout, orientation } = attributes;
  
  const classNames = [
    'wp-block-buttons',
    layout && `is-layout-${layout}`,
    orientation && `is-${orientation}`,
  ].filter(Boolean).join(' ');
  
  return <div className={classNames} />;
};

export const ButtonsBlock: BlockDefinition = {
  name: 'o4o/buttons',
  title: 'Buttons',
  category: 'interactive',
  icon: 'button',
  description: 'Group multiple buttons together.',
  keywords: ['buttons', 'button group'],
  
  attributes: {
    layout: {
      type: 'string',
      default: 'flex'
    },
    orientation: {
      type: 'string',
      default: 'horizontal'
    }
  },
  
  supports: {
    align: ['wide', 'full', 'center'],
    anchor: true,
    className: true
  },
  
  edit: ButtonsEdit,
  save: ButtonsSave
};

// Individual Button Block
interface ButtonBlockProps {
  attributes: {
    text: string;
    url?: string;
    linkTarget?: string;
    rel?: string;
    style: string;
    backgroundColor?: string;
    textColor?: string;
    width?: number;
  };
  setAttributes: (attrs: Partial<ButtonBlockProps['attributes']>) => void;
}

const ButtonEdit: React.FC<ButtonBlockProps> = ({ attributes, setAttributes }) => {
  const { text, url, linkTarget, rel, style, backgroundColor, textColor, width } = attributes;
  
  const buttonClass = [
    'wp-block-button__link',
    style && `is-style-${style}`,
    backgroundColor && `has-${backgroundColor}-background-color`,
    textColor && `has-${textColor}-color`,
  ].filter(Boolean).join(' ');
  
  const wrapperClass = [
    'wp-block-button',
    width && `has-custom-width wp-block-button__width-${width}`,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={wrapperClass}>
      <div className="block-editor-block-toolbar" style={{ marginBottom: '10px' }}>
        <input 
          type="url" 
          value={url || ''} 
          onChange={(e) => setAttributes({ url: e.target.value })}
          placeholder="Button URL"
          style={{ marginRight: '10px' }}
        />
        <select 
          value={style || 'fill'} 
          onChange={(e) => setAttributes({ style: e.target.value })}
        >
          <option value="fill">Fill</option>
          <option value="outline">Outline</option>
        </select>
        <label style={{ marginLeft: '10px' }}>
          <input 
            type="checkbox" 
            checked={linkTarget === '_blank'} 
            onChange={(e) => setAttributes({ 
              linkTarget: e.target.checked ? '_blank' : undefined,
              rel: e.target.checked ? 'noopener' : undefined
            })}
          />
          Open in new tab
        </label>
      </div>
      <a className={buttonClass} href={url || '#'}>
        <input 
          type="text" 
          value={text || ''} 
          onChange={(e) => setAttributes({ text: e.target.value })}
          placeholder="Button text..."
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'inherit',
            textAlign: 'center',
            width: '100%'
          }}
        />
      </a>
    </div>
  );
};

const ButtonSave: React.FC<Pick<ButtonBlockProps, 'attributes'>> = ({ attributes }) => {
  const { text, url, linkTarget, rel, style, backgroundColor, textColor, width } = attributes;
  
  const buttonClass = [
    'wp-block-button__link',
    style && `is-style-${style}`,
    backgroundColor && `has-${backgroundColor}-background-color`,
    textColor && `has-${textColor}-color`,
  ].filter(Boolean).join(' ');
  
  const wrapperClass = [
    'wp-block-button',
    width && `has-custom-width wp-block-button__width-${width}`,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={wrapperClass}>
      <a 
        className={buttonClass} 
        href={url || '#'}
        target={linkTarget}
        rel={rel}
      >
        {text}
      </a>
    </div>
  );
};

export const ButtonBlock: BlockDefinition = {
  name: 'o4o/button',
  title: 'Button',
  category: 'interactive',
  icon: 'button',
  description: 'Add a button to prompt user action.',
  keywords: ['button', 'link', 'cta', 'call to action'],
  
  attributes: {
    text: {
      type: 'string',
      source: 'text',
      selector: '.wp-block-button__link',
      default: ''
    },
    url: {
      type: 'string',
      source: 'attribute',
      selector: '.wp-block-button__link',
      attribute: 'href'
    },
    linkTarget: {
      type: 'string',
      source: 'attribute',
      selector: '.wp-block-button__link',
      attribute: 'target'
    },
    rel: {
      type: 'string',
      source: 'attribute',
      selector: '.wp-block-button__link',
      attribute: 'rel'
    },
    style: {
      type: 'string',
      default: 'fill'
    },
    backgroundColor: {
      type: 'string'
    },
    textColor: {
      type: 'string'
    },
    width: {
      type: 'number'
    }
  },
  
  supports: {
    align: true,
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
      gradients: true
    },
    spacing: {
      padding: true
    },
    typography: {
      fontSize: true
    }
  },
  
  edit: ButtonEdit,
  save: ButtonSave
};