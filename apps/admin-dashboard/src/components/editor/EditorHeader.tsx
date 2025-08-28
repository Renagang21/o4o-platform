import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
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
} from 'lucide-react';

interface EditorHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
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
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  onTitleChange,
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
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="text-2xl font-bold text-blue-600">W</div>
          
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 w-8 rounded-r-none"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-8 w-8 rounded-l-none border-l"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleListView}
              className="h-8 w-8"
              title="List View"
            >
              <ListTree className="h-4 w-4" />
            </Button>
            <Button
              variant={isCodeView ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleCodeView}
              className="h-8 w-8"
              title={isCodeView ? "Visual Editor" : "Code Editor"}
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center Section - Title */}
        <div className="flex-1 max-w-2xl">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Add title"
            className="text-xl font-medium text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className={cn(isDirty && "border-orange-500")}
          >
            {isSaving ? (
              "Saving..."
            ) : isDirty ? (
              <>
                <Save className="h-3 w-3 mr-1" />
                Save Draft
              </>
            ) : (
              "Saved"
            )}
          </Button>

          <Button
            size="sm"
            onClick={onPublish}
            className={cn(
              isPublished 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isPublished ? "Update" : "Publish"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFullscreen}>
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
              <DropdownMenuItem>Keyboard shortcuts</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Bar */}
      {isDirty && (
        <div className="absolute top-full left-4 mt-1">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
            Unsaved changes
          </Badge>
        </div>
      )}
    </div>
  );
};