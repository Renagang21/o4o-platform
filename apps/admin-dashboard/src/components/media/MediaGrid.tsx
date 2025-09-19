import { FC, useState, useCallback } from 'react';
import { 
  Check, 
  Trash2, 
  Edit2, 
  Eye, 
  Download,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@o4o/types';

interface MediaGridProps {
  items: MediaItem[];
  selectedIds: string[];
  onItemSelect: (id: string, selected: boolean) => void;
  onItemDelete?: (id: string) => void;
  onItemEdit?: (item: MediaItem) => void;
  onItemView?: (item: MediaItem) => void;
}

const MediaGrid: FC<MediaGridProps> = ({
  items,
  selectedIds,
  onItemSelect,
  onItemDelete,
  onItemEdit,
  onItemView
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent, item: MediaItem) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const isSelected = selectedIds.includes(item.id);
      onItemSelect(item.id, !isSelected);
    }
  }, [selectedIds, onItemSelect]);

  return (
    <div 
      className="attachments-browser"
      role="region"
      aria-label="Media grid"
    >
      <ul 
        className="attachments ui-sortable ui-sortable-disabled"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '8px',
          padding: '8px',
          margin: 0,
          listStyle: 'none'
        }}
      >
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const Icon = getFileIcon(item.mediaType, item.mimeType);
          
          return (
            <li
              key={item.id}
              className={cn(
                "attachment",
                isSelected && "selected details",
                hoveredItem === item.id && "hover"
              )}
              style={{
                position: 'relative',
                float: 'left',
                margin: 0,
                padding: '8px',
                border: '1px solid #c3c4c7',
                borderRadius: '2px',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              tabIndex={0}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${item.title || item.filename}, ${item.mediaType}, ${formatFileSize(item.size)}`}
              onClick={() => onItemSelect(item.id, !isSelected)}
              onKeyDown={(e) => handleKeyDown(e, item)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* WordPress-style attachment preview */}
              <div 
                className="attachment-preview js--select-attachment"
                style={{ position: 'relative' }}
              >
                <div 
                  className="thumbnail"
                  style={{
                    width: '100%',
                    height: '150px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    backgroundColor: '#f0f0f1'
                  }}
                >
                  {item.mediaType === 'image' && item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.alt || item.title || item.filename}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      draggable={false}
                    />
                  ) : (
                    <div 
                      className="icon"
                      style={{
                        width: '48px',
                        height: '64px',
                        margin: '0 auto',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Filename */}
                <div 
                  className="filename"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '5px 10px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    lineHeight: '1.5'
                  }}
                >
                  <div>{item.filename}</div>
                </div>
              </div>

              {/* WordPress-style check button */}
              <button
                type="button"
                className={cn(
                  "check",
                  isSelected && "selected"
                )}
                style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '24px',
                  height: '24px',
                  margin: '8px',
                  padding: '0',
                  border: '1px solid #c3c4c7',
                  borderRadius: '3px',
                  background: isSelected ? '#2271b1' : '#fff',
                  boxShadow: '0 0 0 1px #fff, 0 0 0 2px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemSelect(item.id, !isSelected);
                }}
                aria-label={isSelected ? 'Deselect' : 'Select'}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </button>

              {/* Hover actions */}
              {hoveredItem === item.id && !isSelected && (
                <div
                  className="attachment-actions"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    gap: '4px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '4px',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {onItemView && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemView(item);
                      }}
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {onItemEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemEdit(item);
                      }}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  {onItemDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this item permanently?')) {
                          onItemDelete(item.id);
                        }
                      }}
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default MediaGrid;