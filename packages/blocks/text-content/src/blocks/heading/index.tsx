import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

// Edit Component
const Edit: React.FC<any> = ({ attributes, setAttributes }) => {
  const { content, level, align, textColor } = attributes;
  const Tag = `h${level || 2}` as keyof JSX.IntrinsicElements;
  
  const handleContentChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    setAttributes({ content: e.currentTarget.innerHTML });
  };
  
  const handleLevelChange = (newLevel: number) => {
    setAttributes({ level: newLevel });
  };
  
  const classNames = [
    'wp-block-heading',
    align && `has-text-align-${align}`,
    textColor && `has-${textColor}-color`,
  ].filter(Boolean).join(' ');
  
  return (
    <>
      <div className="block-editor-block-toolbar">
        {[1, 2, 3, 4, 5, 6].map(h => (
          <button
            key={h}
            className={level === h ? 'is-pressed' : ''}
            onClick={() => handleLevelChange(h)}
            aria-label={`Heading ${h}`}
          >
            H{h}
          </button>
        ))}
      </div>
      <Tag
        className={classNames}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleContentChange}
        dangerouslySetInnerHTML={{ __html: content || '' }}
        data-placeholder={`Heading (Level ${level})`}
      />
    </>
  );
};

// Save Component
const Save: React.FC<any> = ({ attributes }) => {
  const { content, level, align, textColor } = attributes;
  const Tag = `h${level || 2}` as keyof JSX.IntrinsicElements;
  
  const classNames = [
    'wp-block-heading',
    align && `has-text-align-${align}`,
    textColor && `has-${textColor}-color`,
  ].filter(Boolean).join(' ');
  
  return (
    <Tag 
      className={classNames}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

// Block Definition
const HeadingBlock: BlockDefinition = {
  name: 'o4o/heading',
  title: 'Heading',
  category: 'text',
  icon: 'heading',
  description: 'Introduce new sections and organize content to help visitors navigate your site.',
  keywords: ['title', 'heading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  
  attributes: {
    content: {
      type: 'string',
      source: 'html',
      selector: 'h1,h2,h3,h4,h5,h6',
      default: ''
    },
    level: {
      type: 'number',
      default: 2
    },
    align: {
      type: 'string',
      default: ''
    },
    textColor: {
      type: 'string',
      default: ''
    }
  },
  
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
    color: {
      text: true,
      background: false,
      gradients: false
    },
    typography: {
      fontSize: true,
      lineHeight: true
    }
  },
  
  edit: Edit,
  save: Save
};

export default HeadingBlock;