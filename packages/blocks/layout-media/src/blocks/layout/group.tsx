import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface GroupBlockProps {
  attributes: {
    tagName: string;
    layout: string;
    backgroundColor: string;
    textColor: string;
  };
  setAttributes: (attrs: Partial<GroupBlockProps['attributes']>) => void;
}

const Edit: React.FC<GroupBlockProps> = ({ attributes, setAttributes }) => {
  const { tagName, layout, backgroundColor, textColor } = attributes;
  const Tag = (tagName || 'div') as keyof JSX.IntrinsicElements;
  
  const updateTagName = (newTag: string) => {
    setAttributes({ tagName: newTag });
  };
  
  const updateLayout = (newLayout: string) => {
    setAttributes({ layout: newLayout });
  };
  
  const classNames = [
    'wp-block-group',
    layout && `is-layout-${layout}`,
    backgroundColor && `has-${backgroundColor}-background-color`,
    textColor && `has-${textColor}-color`,
  ].filter(Boolean).join(' ');
  
  return (
    <div>
      <div className="block-editor-block-toolbar">
        <select value={tagName || 'div'} onChange={(e) => updateTagName(e.target.value)}>
          <option value="div">div</option>
          <option value="section">section</option>
          <option value="article">article</option>
          <option value="aside">aside</option>
          <option value="main">main</option>
          <option value="header">header</option>
          <option value="footer">footer</option>
        </select>
        
        <select value={layout || 'default'} onChange={(e) => updateLayout(e.target.value)}>
          <option value="default">Default</option>
          <option value="constrained">Constrained</option>
          <option value="flow">Flow</option>
          <option value="flex">Flex</option>
          <option value="grid">Grid</option>
        </select>
      </div>
      
      <Tag className={classNames}>
        <div className="wp-block-group__inner-container">
          <p style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5' }}>
            Group content goes here
          </p>
        </div>
      </Tag>
    </div>
  );
};

const Save: React.FC<Pick<GroupBlockProps, 'attributes'>> = ({ attributes }) => {
  const { tagName, layout, backgroundColor, textColor } = attributes;
  const Tag = (tagName || 'div') as keyof JSX.IntrinsicElements;
  
  const classNames = [
    'wp-block-group',
    layout && `is-layout-${layout}`,
    backgroundColor && `has-${backgroundColor}-background-color`,
    textColor && `has-${textColor}-color`,
  ].filter(Boolean).join(' ');
  
  return (
    <Tag className={classNames}>
      <div className="wp-block-group__inner-container" />
    </Tag>
  );
};

const GroupBlock: BlockDefinition = {
  name: 'o4o/group',
  title: 'Group',
  category: 'layout',
  icon: 'block-default',
  description: 'Gather blocks in a container.',
  keywords: ['group', 'container', 'wrapper', 'row', 'section'],
  
  attributes: {
    tagName: {
      type: 'string',
      default: 'div'
    },
    layout: {
      type: 'string',
      default: 'default'
    },
    backgroundColor: {
      type: 'string',
      default: ''
    },
    textColor: {
      type: 'string',
      default: ''
    }
  },
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
      gradients: true
    },
    spacing: {
      margin: true,
      padding: true,
      blockGap: true
    },
    typography: {
      fontSize: true,
      lineHeight: true
    }
  },
  
  edit: Edit,
  save: Save
};

export default GroupBlock;