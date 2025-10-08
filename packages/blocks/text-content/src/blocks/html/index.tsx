import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface HtmlBlockProps {
  attributes: {
    content?: string;
  };
  setAttributes: (attrs: Partial<HtmlBlockProps['attributes']>) => void;
}

// Edit Component
const Edit: React.FC<HtmlBlockProps> = ({ attributes, setAttributes }) => {
  const { content } = attributes;
  const [isEditing, setIsEditing] = useState(true);
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAttributes({ content: e.target.value });
  };
  
  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };
  
  return (
    <div className="wp-block-html-editor">
      <div className="block-editor-block-toolbar">
        <button onClick={toggleEdit}>
          {isEditing ? 'Preview' : 'Edit HTML'}
        </button>
      </div>
      
      {isEditing ? (
        <div className="html-editor">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Write custom HTML..."
            style={{
              width: '100%',
              minHeight: '200px',
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            rows={10}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            ⚠️ Be careful with custom HTML. Incorrect HTML can break your layout.
          </p>
        </div>
      ) : (
        <div className="html-preview">
          <div
            className="wp-block-html"
            dangerouslySetInnerHTML={{ __html: content || '' }}
            style={{
              padding: '10px',
              border: '1px dashed #ddd',
              borderRadius: '4px',
              minHeight: '50px'
            }}
          />
        </div>
      )}
    </div>
  );
};

// Save Component
const Save: React.FC<Pick<HtmlBlockProps, 'attributes'>> = ({ attributes }) => {
  const { content } = attributes;
  
  // For custom HTML, we return the raw HTML without wrapper
  // WordPress will handle the rendering
  return (
    <div
      className="wp-block-html"
      dangerouslySetInnerHTML={{ __html: content || '' }}
    />
  );
};

// Block Definition
const HtmlBlock: BlockDefinition = {
  name: 'o4o/html',
  title: 'Custom HTML',
  category: 'text',
  icon: 'html',
  description: 'Add custom HTML code and preview it as you edit.',
  keywords: ['html', 'custom', 'code', 'embed'],
  
  attributes: {
    content: {
      type: 'string',
      source: 'html',
      selector: '.wp-block-html',
      default: ''
    }
  },
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    html: false // Prevent user from editing HTML of the block wrapper
  },
  
  edit: Edit,
  save: Save
};

export default HtmlBlock;