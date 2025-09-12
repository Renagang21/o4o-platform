import { FC, useCallback } from 'react';
import {
  Trash2,
  Edit2,
  Eye,
  Download,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  File,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MediaItem } from '@/pages/media/MediaLibrary';

interface MediaListProps {
  items: MediaItem[];
  selectedIds: string[];
  onItemSelect: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onItemDelete?: (id: string) => void;
  onItemEdit?: (item: MediaItem) => void;
  onItemView?: (item: MediaItem) => void;
}

const MediaList: FC<MediaListProps> = ({
  items,
  selectedIds,
  onItemSelect,
  onSelectAll,
  onItemDelete,
  onItemEdit,
  onItemView
}) => {
  const getFileIcon = useCallback((mediaType: string, mimeType: string) => {
    if (mediaType === 'image') return ImageIcon;
    if (mediaType === 'video') return Film;
    if (mediaType === 'audio') return Music;
    if (mimeType?.includes('pdf')) return FileText;
    return File;
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <table className="wp-list-table widefat fixed striped media">
      <thead>
        <tr>
          <td className="manage-column column-cb check-column">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              aria-label="Select all"
              className="!border-gray-400"
              style={{ marginLeft: '8px' }}
            />
          </td>
          <th scope="col" className="manage-column column-title column-primary">
            File
          </th>
          <th scope="col" className="manage-column column-author">
            Author
          </th>
          <th scope="col" className="manage-column column-parent">
            Uploaded to
          </th>
          <th scope="col" className="manage-column column-comments">
            <span className="vers comment-grey-bubble" title="Comments">
              <span className="screen-reader-text">Comments</span>
            </span>
          </th>
          <th scope="col" className="manage-column column-date">
            Date
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const Icon = getFileIcon(item.mediaType, item.mimeType);
          
          return (
            <tr
              key={item.id}
              className={isSelected ? 'selected' : ''}
            >
              <th scope="row" className="check-column">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
                  aria-label={`Select ${item.title || item.filename}`}
                  className="!border-gray-400"
                />
              </th>
              <td className="title column-title has-row-actions column-primary">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Thumbnail or icon */}
                  <div 
                    className="media-icon"
                    style={{
                      width: '60px',
                      height: '60px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f0f0f1',
                      borderRadius: '2px'
                    }}
                  >
                    {item.mediaType === 'image' && item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <Icon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Title and details */}
                  <div>
                    <strong>
                      <a 
                        href="#"
                        className="row-title"
                        onClick={(e) => {
                          e.preventDefault();
                          onItemView?.(item);
                        }}
                      >
                        {item.title || item.filename}
                      </a>
                    </strong>
                    <p className="filename" style={{ margin: '4px 0 0', color: '#646970' }}>
                      {item.filename}
                    </p>
                    <div className="row-actions">
                      <span className="edit">
                        <a 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onItemEdit?.(item);
                          }}
                        >
                          Edit
                        </a>
                      </span>
                      {' | '}
                      <span className="delete">
                        <a 
                          href="#"
                          className="submitdelete"
                          style={{ color: '#b32d2e' }}
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm('Delete this item permanently?')) {
                              onItemDelete?.(item.id);
                            }
                          }}
                        >
                          Delete Permanently
                        </a>
                      </span>
                      {' | '}
                      <span className="view">
                        <a 
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="author column-author">
                {item.uploadedBy?.name || '—'}
              </td>
              <td className="parent column-parent">
                {item.attachedTo ? (
                  <strong>
                    <a href="#">{item.attachedTo.title}</a>
                  </strong>
                ) : (
                  <span style={{ color: '#646970' }}>(Unattached)</span>
                )}
              </td>
              <td className="comments column-comments">
                <div className="post-com-count-wrapper">
                  <span aria-hidden="true">—</span>
                </div>
              </td>
              <td className="date column-date">
                <div>
                  {formatDate(item.uploadedAt)}
                  <br />
                  <span style={{ color: '#646970', fontSize: '12px' }}>
                    {formatFileSize(item.size)}
                  </span>
                  {item.width && item.height && (
                    <>
                      <br />
                      <span style={{ color: '#646970', fontSize: '12px' }}>
                        {item.width} × {item.height}
                      </span>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td className="manage-column column-cb check-column">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              aria-label="Select all"
              className="!border-gray-400"
              style={{ marginLeft: '8px' }}
            />
          </td>
          <th scope="col" className="manage-column column-title column-primary">
            File
          </th>
          <th scope="col" className="manage-column column-author">
            Author
          </th>
          <th scope="col" className="manage-column column-parent">
            Uploaded to
          </th>
          <th scope="col" className="manage-column column-comments">
            <span className="vers comment-grey-bubble" title="Comments">
              <span className="screen-reader-text">Comments</span>
            </span>
          </th>
          <th scope="col" className="manage-column column-date">
            Date
          </th>
        </tr>
      </tfoot>
    </table>
  );
};

export default MediaList;