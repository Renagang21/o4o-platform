import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface ParagraphBlockProps {
  attributes: {
    content?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    dropCap?: boolean;
    fontSize?: string;
    textColor?: string;
    backgroundColor?: string;
  };
  setAttributes: (attrs: Partial<ParagraphBlockProps['attributes']>) => void;
}

// Edit Component
const Edit: React.FC<ParagraphBlockProps> = ({ attributes, setAttributes }) => {
  const { content, align, dropCap, fontSize, textColor, backgroundColor } = attributes;
  
  const handleContentChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    setAttributes({ content: e.currentTarget.innerHTML });
  };
  
  const classNames = [
    'wp-block-paragraph',
    align && `has-text-align-${align}`,
    dropCap && 'has-drop-cap',
    fontSize && `has-${fontSize}-font-size`,
    textColor && `has-${textColor}-color`,
    backgroundColor && `has-${backgroundColor}-background-color`,
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={classNames}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleContentChange}
      dangerouslySetInnerHTML={{ __html: content || '' }}
      data-placeholder="Start writing or type / to choose a block"
    />
  );
};

// Save Component
const Save: React.FC<Pick<ParagraphBlockProps, 'attributes'>> = ({ attributes }) => {
  const { content, align, dropCap, fontSize, textColor, backgroundColor } = attributes;
  
  const classNames = [
    'wp-block-paragraph',
    align && `has-text-align-${align}`,
    dropCap && 'has-drop-cap',
    fontSize && `has-${fontSize}-font-size`,
    textColor && `has-${textColor}-color`,
    backgroundColor && `has-${backgroundColor}-background-color`,
  ].filter(Boolean).join(' ');
  
  return (
    <p
      className={classNames}
      dangerouslySetInnerHTML={{ __html: content || '' }}
    />
  );
};

// Block Definition
const ParagraphBlock: BlockDefinition = {
  name: 'o4o/paragraph',
  title: 'Paragraph',
  category: 'text',
  icon: 'editor-paragraph',
  description: 'Start with the basic building block of all narrative.',
  keywords: ['text', 'paragraph', 'p'],
  
  attributes: {
    content: {
      type: 'string',
      source: 'html',
      selector: 'p',
      default: ''
    },
    align: {
      type: 'string',
      default: ''
    },
    dropCap: {
      type: 'boolean',
      default: false
    },
    fontSize: {
      type: 'string',
      default: ''
    },
    textColor: {
      type: 'string',
      default: ''
    },
    backgroundColor: {
      type: 'string',
      default: ''
    }
  },
  
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
      gradients: true
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

export default ParagraphBlock;