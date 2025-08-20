import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

// Columns Container Block
const ColumnsEdit: React.FC<any> = ({ attributes, setAttributes }) => {
  const { verticalAlignment, isStackedOnMobile, columnCount } = attributes;
  
  const updateColumnCount = (count: number) => {
    setAttributes({ columnCount: count });
  };
  
  const toggleStackedMobile = () => {
    setAttributes({ isStackedOnMobile: !isStackedOnMobile });
  };
  
  const setVerticalAlignment = (alignment: string) => {
    setAttributes({ verticalAlignment: alignment });
  };
  
  const classNames = [
    'wp-block-columns',
    verticalAlignment && `are-vertically-aligned-${verticalAlignment}`,
    isStackedOnMobile === false && 'is-not-stacked-on-mobile',
  ].filter(Boolean).join(' ');
  
  return (
    <div>
      <div className="block-editor-block-toolbar">
        <select 
          value={columnCount || 2} 
          onChange={(e) => updateColumnCount(Number(e.target.value))}
        >
          {[2, 3, 4, 5, 6].map(num => (
            <option key={num} value={num}>{num} Columns</option>
          ))}
        </select>
        
        <button onClick={toggleStackedMobile}>
          {isStackedOnMobile ? 'Stack on Mobile' : 'No Stack on Mobile'}
        </button>
        
        <select 
          value={verticalAlignment || ''} 
          onChange={(e) => setVerticalAlignment(e.target.value)}
        >
          <option value="">No vertical alignment</option>
          <option value="top">Align top</option>
          <option value="center">Align center</option>
          <option value="bottom">Align bottom</option>
        </select>
      </div>
      
      <div className={classNames}>
        <div className="wp-block-columns-is-layout-flex">
          {Array.from({ length: columnCount || 2 }).map((_, index) => (
            <div key={index} className="wp-block-column">
              <p style={{ padding: '20px', background: '#f0f0f0', textAlign: 'center' }}>
                Column {index + 1}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ColumnsSave: React.FC<any> = ({ attributes }) => {
  const { verticalAlignment, isStackedOnMobile } = attributes;
  
  const classNames = [
    'wp-block-columns',
    verticalAlignment && `are-vertically-aligned-${verticalAlignment}`,
    isStackedOnMobile === false && 'is-not-stacked-on-mobile',
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classNames}>
      <div className="wp-block-columns-is-layout-flex" />
    </div>
  );
};

export const ColumnsBlock: BlockDefinition = {
  name: 'o4o/columns',
  title: 'Columns',
  category: 'layout',
  icon: 'columns',
  description: 'Display content in multiple columns.',
  keywords: ['columns', 'layout', 'grid'],
  
  attributes: {
    verticalAlignment: {
      type: 'string',
      default: ''
    },
    isStackedOnMobile: {
      type: 'boolean',
      default: true
    },
    columnCount: {
      type: 'number',
      default: 2
    }
  },
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: false
    },
    spacing: {
      margin: true,
      padding: true,
      blockGap: true
    }
  },
  
  edit: ColumnsEdit,
  save: ColumnsSave
};

// Individual Column Block
const ColumnEdit: React.FC<any> = ({ attributes, setAttributes }) => {
  const { width, verticalAlignment } = attributes;
  
  const updateWidth = (newWidth: string) => {
    setAttributes({ width: newWidth });
  };
  
  const classNames = [
    'wp-block-column',
    verticalAlignment && `is-vertically-aligned-${verticalAlignment}`,
  ].filter(Boolean).join(' ');
  
  const style = width ? { flexBasis: width } : {};
  
  return (
    <div className={classNames} style={style}>
      <div className="block-editor-block-toolbar">
        <input 
          type="text" 
          value={width || ''} 
          onChange={(e) => updateWidth(e.target.value)}
          placeholder="Width (e.g., 50%)"
        />
      </div>
      <div className="column-content" style={{ minHeight: '100px', background: '#f9f9f9' }}>
        <p>Column content goes here</p>
      </div>
    </div>
  );
};

const ColumnSave: React.FC<any> = ({ attributes }) => {
  const { width, verticalAlignment } = attributes;
  
  const classNames = [
    'wp-block-column',
    verticalAlignment && `is-vertically-aligned-${verticalAlignment}`,
  ].filter(Boolean).join(' ');
  
  const style = width ? { flexBasis: width } : {};
  
  return (
    <div className={classNames} style={style} />
  );
};

export const ColumnBlock: BlockDefinition = {
  name: 'o4o/column',
  title: 'Column',
  category: 'layout',
  icon: 'column',
  description: 'A single column within a columns block.',
  keywords: ['column', 'layout'],
  
  attributes: {
    width: {
      type: 'string',
      default: ''
    },
    verticalAlignment: {
      type: 'string',
      default: ''
    }
  },
  
  supports: {
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true
    },
    spacing: {
      padding: true
    }
  },
  
  edit: ColumnEdit,
  save: ColumnSave
};