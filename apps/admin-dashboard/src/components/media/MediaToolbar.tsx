import { FC } from 'react';
import { Grid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaToolbarProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  selectedCount: number;
  onBulkDelete?: () => void;
  onClearSelection?: () => void;
}

const MediaToolbar: FC<MediaToolbarProps> = ({
  viewMode,
  onViewModeChange,
  selectedCount,
  onBulkDelete,
  onClearSelection
}) => {
  return (
    <div 
      className="media-frame-toolbar"
      style={{
        position: 'relative',
        height: '50px',
        borderBottom: '1px solid #dcdcde',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: '#fff'
      }}
    >
      {/* Left side - Selection info and bulk actions */}
      <div className="media-toolbar-primary" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {selectedCount > 0 && (
          <>
            <span style={{ fontSize: '14px', color: '#2c3338' }}>
              {selectedCount} selected
            </span>
            
            {onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                style={{ padding: '4px 8px' }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
            
            {onBulkDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkDelete}
                style={{ 
                  padding: '4px 8px',
                  color: '#b32d2e'
                }}
              >
                Delete Selected
              </Button>
            )}
          </>
        )}
      </div>

      {/* Right side - View switcher */}
      <div 
        className="view-switch media-grid-view-switch"
        style={{ display: 'flex', gap: '0' }}
      >
        <button
          className={cn(
            "view-list",
            viewMode === 'list' && "current"
          )}
          onClick={() => onViewModeChange('list')}
          title="List view"
          aria-label="List view"
          aria-current={viewMode === 'list' ? 'true' : 'false'}
          style={{
            position: 'relative',
            padding: '8px',
            border: '1px solid #dcdcde',
            borderRight: 'none',
            borderRadius: '3px 0 0 3px',
            background: viewMode === 'list' ? '#f0f0f1' : '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.1s ease'
          }}
        >
          <List className="w-4 h-4" style={{ color: viewMode === 'list' ? '#2271b1' : '#646970' }} />
        </button>
        <button
          className={cn(
            "view-grid",
            viewMode === 'grid' && "current"
          )}
          onClick={() => onViewModeChange('grid')}
          title="Grid view"
          aria-label="Grid view"
          aria-current={viewMode === 'grid' ? 'true' : 'false'}
          style={{
            position: 'relative',
            padding: '8px',
            border: '1px solid #dcdcde',
            borderRadius: '0 3px 3px 0',
            background: viewMode === 'grid' ? '#f0f0f1' : '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.1s ease'
          }}
        >
          <Grid className="w-4 h-4" style={{ color: viewMode === 'grid' ? '#2271b1' : '#646970' }} />
        </button>
      </div>
    </div>
  );
};

export default MediaToolbar;