import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface TableBlockProps {
  block: MainSiteBlock;
}

interface TableCell {
  content?: string;
  tag?: string;
  align?: string;
}

export const TableBlock: FC<TableBlockProps> = ({ block }) => {
  const { data } = block;
  
  const tableClassNames = [
    'wp-block-table',
    data?.hasFixedLayout && 'has-fixed-layout',
  ].filter(Boolean).join(' ');
  
  const renderCell = (cell: TableCell, isHeader: boolean = false) => {
    const Tag = cell.tag || (isHeader ? 'th' : 'td');
    const style: React.CSSProperties = {
      textAlign: cell.align as any,
    };
    
    return (
      <Tag 
        key={Math.random()} 
        style={style}
        dangerouslySetInnerHTML={{ __html: cell.content || '' }}
      />
    );
  };
  
  const renderRow = (cells: TableCell[], isHeader: boolean = false) => (
    <tr key={Math.random()}>
      {cells.map((cell) => renderCell(cell, isHeader))}
    </tr>
  );
  
  return (
    <figure className={tableClassNames}>
      <table className="wp-block-table__table">
        {data?.head && data.head.length > 0 && (
          <thead>
            {data.head.map((row: { cells: TableCell[] }) => 
              renderRow(row.cells, true)
            )}
          </thead>
        )}
        {data?.body && data.body.length > 0 && (
          <tbody>
            {data.body.map((row: { cells: TableCell[] }) => 
              renderRow(row.cells)
            )}
          </tbody>
        )}
        {data?.foot && data.foot.length > 0 && (
          <tfoot>
            {data.foot.map((row: { cells: TableCell[] }) => 
              renderRow(row.cells)
            )}
          </tfoot>
        )}
      </table>
      {data?.caption && (
        <figcaption 
          className="wp-element-caption"
          dangerouslySetInnerHTML={{ __html: data.caption }}
        />
      )}
    </figure>
  );
};