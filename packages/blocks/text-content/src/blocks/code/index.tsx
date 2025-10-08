import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface CodeBlockProps {
  attributes: {
    content?: string;
    language?: string;
  };
  setAttributes: (attrs: Partial<CodeBlockProps['attributes']>) => void;
}

// Edit Component
const Edit: React.FC<CodeBlockProps> = ({ attributes, setAttributes }) => {
  const { content, language } = attributes;
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAttributes({ content: e.target.value });
  };
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttributes({ language: e.target.value });
  };
  
  return (
    <div className="wp-block-code-editor">
      {language && (
        <div className="code-language-label">
          <input
            type="text"
            value={language}
            onChange={handleLanguageChange}
            placeholder="Language (optional)"
            style={{ background: 'transparent', border: 'none', fontSize: '0.9em' }}
          />
        </div>
      )}
      <pre className="wp-block-code">
        <code>
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Write code..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
            rows={10}
          />
        </code>
      </pre>
    </div>
  );
};

// Save Component
const Save: React.FC<Pick<CodeBlockProps, 'attributes'>> = ({ attributes }) => {
  const { content, language } = attributes;
  
  return (
    <pre className={`wp-block-code${language ? ` language-${language}` : ''}`}>
      <code>{content}</code>
    </pre>
  );
};

// Block Definition
const CodeBlock: BlockDefinition = {
  name: 'o4o/code',
  title: 'Code',
  category: 'text',
  icon: 'editor-code',
  description: 'Display code snippets that respect your spacing and tabs.',
  keywords: ['code', 'pre', 'programming', 'syntax'],
  
  attributes: {
    content: {
      type: 'string',
      source: 'text',
      selector: 'code',
      default: ''
    },
    language: {
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
      text: true
    },
    spacing: {
      margin: true,
      padding: true
    }
  },
  
  edit: Edit,
  save: Save
};

export default CodeBlock;