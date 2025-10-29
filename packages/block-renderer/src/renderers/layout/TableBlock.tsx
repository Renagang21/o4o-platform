/**
 * Table Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const TableBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const hasFixedLayout = getBlockData(block, 'hasFixedLayout', false);
  const caption = getBlockData(block, 'caption');
  const head = getBlockData(block, 'head', []);
  const body = getBlockData(block, 'body', []);
  const foot = getBlockData(block, 'foot', []);
  const className = getBlockData(block, 'className', '');

  // Alternative: tableData format (array of arrays)
  const tableData = getBlockData(block, 'tableData');

  if (!tableData && (!body || body.length === 0)) return null;

  // Build class names
  const tableClasses = clsx(
    'block-table min-w-full border-collapse border border-gray-300',
    hasFixedLayout && 'table-fixed',
    className
  );

  // Render from tableData format
  if (tableData && Array.isArray(tableData)) {
    return (
      <div className="mb-6 overflow-x-auto">
        <table className={tableClasses}>
          <tbody>
            {tableData.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100 font-semibold' : ''}>
                {row.map((cell: any, cellIndex: number) => {
                  const CellTag = rowIndex === 0 ? 'th' : 'td';
                  const cellContent = typeof cell === 'string' ? cell : String(cell);
                  return (
                    <CellTag
                      key={cellIndex}
                      className="border border-gray-300 px-4 py-2 text-left"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cellContent) }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render from head/body/foot format
  return (
    <div className="mb-6 overflow-x-auto">
      <table className={tableClasses}>
        {caption && (
          <caption className="caption-bottom text-sm text-gray-600 mt-2">
            {caption}
          </caption>
        )}
        {head && head.length > 0 && (
          <thead className="bg-gray-100">
            {head.map((row: any, rowIndex: number) => (
              <tr key={rowIndex}>
                {row.cells?.map((cell: any, cellIndex: number) => (
                  <th
                    key={cellIndex}
                    className="border border-gray-300 px-4 py-2 text-left font-semibold"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cell.content) }}
                  />
                ))}
              </tr>
            ))}
          </thead>
        )}
        {body && body.length > 0 && (
          <tbody>
            {body.map((row: any, rowIndex: number) => (
              <tr key={rowIndex}>
                {row.cells?.map((cell: any, cellIndex: number) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-300 px-4 py-2"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cell.content) }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        )}
        {foot && foot.length > 0 && (
          <tfoot className="bg-gray-50">
            {foot.map((row: any, rowIndex: number) => (
              <tr key={rowIndex}>
                {row.cells?.map((cell: any, cellIndex: number) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-300 px-4 py-2 font-medium"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cell.content) }}
                  />
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default TableBlock;
