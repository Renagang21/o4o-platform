import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Undo,
  Redo,
  Maximize2,
  Minimize2,
  MoreVertical,
  Eye,
  ListTree,
  Code,
  Settings,
  Save,
  Info,
  Keyboard,
  Trash2,
} from 'lucide-react';

interface EditorHeaderProps {
  onSave: () => void;
  onPublish: () => void;
  onBack?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isDirty?: boolean;
  isPublished?: boolean;
  onToggleListView?: () => void;
  onToggleCodeView?: () => void;
  isCodeView?: boolean;
  postStatus?: string;
  onPreview?: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onSave,
  onPublish,
  onBack,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isFullscreen = false,
  onToggleFullscreen,
  isDirty = false,
  isPublished = false,
  onToggleListView,
  onToggleCodeView,
  isCodeView = false,
  postStatus = 'draft',
  onPreview,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* WordPress Logo / Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 hover:bg-gray-100"
            title="Back to Dashboard"
          >
            <div className="text-2xl font-bold text-blue-600">W</div>
          </Button>
          
          {/* Undo/Redo */}
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 w-8 rounded-r-none hover:bg-gray-100"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-8 w-8 rounded-l-none border-l hover:bg-gray-100"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* View Options */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleListView}
              className="h-8 w-8 hover:bg-gray-100"
              title="List View"
            >
              <ListTree className="h-4 w-4" />
            </Button>
            <Button
              variant={isCodeView ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleCodeView}
              className="h-8 w-8 hover:bg-gray-100"
              title={isCodeView ? "Visual Editor" : "Code Editor"}
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100"
              title="Document Overview"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center Section - Status Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={postStatus === 'published' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {postStatus === 'published' ? 'Published' : 'Draft'}
          </Badge>
          {isDirty && (
            <span className="text-xs text-orange-500">• Unsaved changes</span>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* Preview */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="h-8 px-3 hover:bg-gray-100"
            title="Preview"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>

          {/* Save Draft */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={cn(
              "h-8 px-3",
              isDirty && "border-orange-500 hover:bg-orange-50"
            )}
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Save draft
              </>
            )}
          </Button>

          {/* Publish/Update */}
          <Button
            size="sm"
            onClick={onPublish}
            className={cn(
              "h-8 px-3",
              isPublished 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isPublished ? "Update" : "Publish"}
          </Button>

          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-sm">
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFullscreen} className="text-sm">
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Fullscreen Mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm">
                <Keyboard className="h-4 w-4 mr-2" />
                Keyboard shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                <Info className="h-4 w-4 mr-2" />
                Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};