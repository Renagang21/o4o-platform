import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface TableCell {
  content: string;
}

interface TableRow {
  cells: TableCell[];
}

interface TableBlockProps {
  attributes: {
    hasFixedLayout: boolean;
    head?: TableRow[];
    body?: TableRow[];
    foot?: TableRow[];
  };
  setAttributes: (attrs: Partial<TableBlockProps['attributes']>) => void;
}

const Edit: React.FC<TableBlockProps> = ({ attributes, setAttributes }) => {
  const { hasFixedLayout, head, body, foot } = attributes;
  const [rows, setRows] = useState(body?.length || 2);
  const [cols, setCols] = useState(body?.[0]?.cells?.length || 2);
  
  const updateTable = (newRows: number, newCols: number) => {
    const newBody = Array(newRows).fill(null).map(() => ({
      cells: Array(newCols).fill(null).map(() => ({ content: '' }))
    }));
    setAttributes({ body: newBody });
    setRows(newRows);
    setCols(newCols);
  };
  
  const updateCell = (section: 'head' | 'body' | 'foot', rowIndex: number, colIndex: number, content: string) => {
    const newSection = [...(attributes[section] || [])];
    if (!newSection[rowIndex]) {
      newSection[rowIndex] = { cells: [] };
    }
    if (!newSection[rowIndex].cells[colIndex]) {
      newSection[rowIndex].cells[colIndex] = { content: '' };
    }
    newSection[rowIndex].cells[colIndex].content = content;
    setAttributes({ [section]: newSection });
  };
  
  const classNames = [
    'wp-block-table',
    hasFixedLayout && 'has-fixed-layout',
  ].filter(Boolean).join(' ');
  
  return (
    <div>
      <div className="block-editor-block-toolbar">
        <label>
          Rows: 
          <input 
            type="number" 
            value={rows} 
            onChange={(e) => updateTable(Number(e.target.value), cols)}
            min="1" 
            max="10"
          />
        </label>
        <label style={{ marginLeft: '10px' }}>
          Columns: 
          <input 
            type="number" 
            value={cols} 
            onChange={(e) => updateTable(rows, Number(e.target.value))}
            min="1" 
            max="10"
          />
        </label>
        <label style={{ marginLeft: '10px' }}>
          <input 
            type="checkbox" 
            checked={hasFixedLayout} 
            onChange={(e) => setAttributes({ hasFixedLayout: e.target.checked })}
          />
          Fixed width
        </label>
      </div>
      
      <figure className={classNames}>
        <table>
          <tbody>
            {Array(rows).fill(null).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array(cols).fill(null).map((_, colIndex) => (
                  <td key={colIndex}>
                    <input
                      type="text"
                      value={body?.[rowIndex]?.cells?.[colIndex]?.content || ''}
                      onChange={(e) => updateCell('body', rowIndex, colIndex, e.target.value)}
                      placeholder="Cell content"
                      style={{ 
                        width: '100%', 
                        border: 'none',
                        padding: '5px'
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </div>
  );
};

const Save: React.FC<Pick<TableBlockProps, 'attributes'>> = ({ attributes }) => {
  const { hasFixedLayout, head, body, foot } = attributes;
  
  const classNames = [
    'wp-block-table',
    hasFixedLayout && 'has-fixed-layout',
  ].filter(Boolean).join(' ');
  
  return (
    <figure className={classNames}>
      <table>
        {head && head.length > 0 && (
          <thead>
            {head.map((row: TableRow, idx: number) => (
              <tr key={idx}>
                {row.cells.map((cell: TableCell, cellIdx: number) => (
                  <th key={cellIdx}>{cell.content}</th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        {body && body.length > 0 && (
          <tbody>
            {body.map((row: TableRow, idx: number) => (
              <tr key={idx}>
                {row.cells.map((cell: TableCell, cellIdx: number) => (
                  <td key={cellIdx}>{cell.content}</td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
        {foot && foot.length > 0 && (
          <tfoot>
            {foot.map((row: TableRow, idx: number) => (
              <tr key={idx}>
                {row.cells.map((cell: TableCell, cellIdx: number) => (
                  <td key={cellIdx}>{cell.content}</td>
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </figure>
  );
};

const TableBlock: BlockDefinition = {
  name: 'o4o/table',
  title: 'Table',
  category: 'interactive',
  icon: 'editor-table',
  description: 'Create structured content in rows and columns.',
  keywords: ['table', 'grid', 'data'],
  
  attributes: {
    hasFixedLayout: {
      type: 'boolean',
      default: false
    },
    head: {
      type: 'array',
      default: []
    },
    body: {
      type: 'array',
      default: []
    },
    foot: {
      type: 'array',
      default: []
    }
  },
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true
    }
  },
  
  edit: Edit,
  save: Save
};

export default TableBlock;