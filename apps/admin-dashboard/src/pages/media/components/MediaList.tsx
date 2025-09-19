import { FC } from 'react';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { MediaFile } from '@/types/content';
import MediaItem from './MediaItem';
import { formatFileSize } from '@/utils/format';
import { formatDate } from '@/lib/utils';

interface MediaListProps {
  files: MediaFile[];
  selectedFiles: string[];
  onFileSelect: (fileId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onFileAction?: (fileId: string, action: string) => void;
}

/**
 * WordPress-style Media list component
 * Standardized with WordPressTable component
 */
const MediaList: FC<MediaListProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  onFileAction
}) => {
  // Table columns configuration
  const columns: WordPressTableColumn[] = [
    {
      id: 'file',
      label: 'File',
      sortable: true
    },
    {
      id: 'type',
      label: 'Type',
      width: '100px'
    },
    {
      id: 'size',
      label: 'Size',
      sortable: true,
      width: '100px'
    },
    {
      id: 'dimensions',
      label: 'Dimensions',
      width: '120px',
      align: 'center'
    },
    {
      id: 'uploaded',
      label: 'Uploaded',
      sortable: true,
      width: '150px'
    },
    {
      id: 'uploader',
      label: 'Uploader',
      width: '120px'
    }
  ];

  // Transform files to table rows
  const rows: WordPressTableRow[] = files.map((file: MediaFile) => ({
    id: file.id,
    data: {
      file: (
        <MediaItem
          item={file}
          view="list"
          isSelected={selectedFiles.includes(file.id)}
          onSelect={() => onFileSelect(file.id)}
        />
      ),
      type: (
        <div className="text-sm">
          <div className="font-medium">
            {file.mimeType.split('/')[1]?.toUpperCase() || file.type}
          </div>
          <div className="text-gray-500 text-xs">{file.mimeType}</div>
        </div>
      ),
      size: (
        <div className="text-sm font-mono">
          {formatFileSize(file.size)}
        </div>
      ),
      dimensions: file.dimensions ? (
        <div className="text-sm text-center">
          {file.dimensions.width} × {file.dimensions.height}
        </div>
      ) : (
        <div className="text-gray-400 text-center">—</div>
      ),
      uploaded: (
        <div className="text-sm">
          <div>{formatDate(file.uploadedAt)}</div>
          <div className="text-gray-500 text-xs">
            {new Date(file.uploadedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      ),
      uploader: (
        <div className="text-sm">
          {file.uploadedBy || 'Unknown'}
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        onClick: () => onFileAction?.(file.id, 'edit')
      },
      {
        label: 'View',
        onClick: () => onFileAction?.(file.id, 'view')
      },
      {
        label: 'Download',
        onClick: () => onFileAction?.(file.id, 'download')
      },
      {
        label: 'Copy URL',
        onClick: () => onFileAction?.(file.id, 'copy-url')
      },
      {
        label: 'Delete Permanently',
        onClick: () => onFileAction?.(file.id, 'delete'),
        className: 'text-red-600'
      }
    ]
  }));

  // Handle row selection
  const handleSelectRow = (rowId: string, selected: boolean) => {
    onFileSelect(rowId);
  };

  const handleSelectAll = (selected: boolean) => {
    onSelectAll(selected);
  };

  return (
    <WordPressTable
      columns={columns}
      rows={rows}
      selectable={true}
      selectedRows={selectedFiles}
      onSelectRow={handleSelectRow}
      onSelectAll={handleSelectAll}
      emptyMessage="No media files found. Upload your first file!"
      className="media-list-table"
    />
  );
};

export default MediaList;
