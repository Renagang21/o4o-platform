import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface QuoteBlockProps {
  attributes: {
    content?: string;
    citation?: string;
    align?: string;
  };
  setAttributes: (attrs: Partial<QuoteBlockProps['attributes']>) => void;
}

// Edit Component
const Edit: React.FC<QuoteBlockProps> = ({ attributes, setAttributes }) => {
  const { content, citation, align } = attributes;
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAttributes({ content: e.target.value });
  };
  
  const handleCitationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttributes({ citation: e.target.value });
  };
  
  const classNames = [
    'wp-block-quote',
    align && `has-text-align-${align}`,
  ].filter(Boolean).join(' ');
  
  return (
    <blockquote className={classNames}>
      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Write quote..."
        rows={3}
        style={{ width: '100%', border: 'none', resize: 'none' }}
      />
      <cite>
        <input
          type="text"
          value={citation || ''}
          onChange={handleCitationChange}
          placeholder="— Author citation (optional)"
          style={{ width: '100%', border: 'none', fontStyle: 'normal' }}
        />
      </cite>
    </blockquote>
  );
};

// Save Component
const Save: React.FC<Pick<QuoteBlockProps, 'attributes'>> = ({ attributes }) => {
  const { content, citation, align } = attributes;
  
  const classNames = [
    'wp-block-quote',
    align && `has-text-align-${align}`,
  ].filter(Boolean).join(' ');
  
  return (
    <blockquote className={classNames}>
      <p dangerouslySetInnerHTML={{ __html: content || '' }} />
      {citation && (
        <cite dangerouslySetInnerHTML={{ __html: citation }} />
      )}
    </blockquote>
  );
};

// Block Definition
const QuoteBlock: BlockDefinition = {
  name: 'o4o/quote',
  title: 'Quote',
  category: 'text',
  icon: 'format-quote',
  description: 'Give quoted text visual emphasis.',
  keywords: ['quote', 'blockquote', 'citation'],
  
  attributes: {
    content: {
      type: 'string',
      source: 'html',
      selector: 'p',
      default: ''
    },
    citation: {
      type: 'string',
      source: 'html',
      selector: 'cite',
      default: ''
    },
    align: {
      type: 'string',
      default: ''
    }
  },
  
  supports: {
    align: ['left', 'center', 'right'],
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

export default QuoteBlock;