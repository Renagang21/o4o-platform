/**
 * Block Editor Dialog — Create/Edit content block form dialog
 *
 * WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1
 * Extracted from ContentBlockLibrary.tsx
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SignageContentBlock, ContentBlockType, CreateContentBlockDto } from '@/lib/api/signageV2';
import { BLOCK_TYPE_CONFIGS } from './content-block-constants';
import { ContentBlockEditors } from './ContentBlockEditors';

interface BlockEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBlock: SignageContentBlock | null;
  blockForm: CreateContentBlockDto;
  setBlockForm: (form: CreateContentBlockDto) => void;
  onSave: () => void;
}

export function BlockEditorDialog({
  open,
  onOpenChange,
  editingBlock,
  blockForm,
  setBlockForm,
  onSave,
}: BlockEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingBlock ? 'Edit Content Block' : 'Create Content Block'}</DialogTitle>
          <DialogDescription>
            Configure your content block settings and content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={blockForm.name}
                onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                placeholder="My Content Block"
              />
            </div>
            <div>
              <Label>Block Type</Label>
              <Select
                value={blockForm.blockType}
                onValueChange={(value: ContentBlockType) =>
                  !editingBlock && setBlockForm({ ...blockForm, blockType: value, content: {} })
                }
              >
                <SelectTrigger className={editingBlock ? 'opacity-60 cursor-not-allowed' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BLOCK_TYPE_CONFIGS).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type-specific Content */}
          <div>
            <Label className="text-base font-medium">Content Settings</Label>
            <div className="mt-3 p-4 border rounded-lg bg-muted/30">
              <ContentBlockEditors blockForm={blockForm} setBlockForm={setBlockForm} />
            </div>
          </div>

          {/* Style Settings */}
          <div>
            <Label className="text-base font-medium">Style Settings</Label>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={blockForm.settings?.backgroundColor || '#transparent'}
                    onChange={(e) =>
                      setBlockForm({
                        ...blockForm,
                        settings: { ...blockForm.settings, backgroundColor: e.target.value },
                      })
                    }
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={blockForm.settings?.backgroundColor || ''}
                    onChange={(e) =>
                      setBlockForm({
                        ...blockForm,
                        settings: { ...blockForm.settings, backgroundColor: e.target.value },
                      })
                    }
                    placeholder="transparent"
                  />
                </div>
              </div>
              <div>
                <Label>Padding (px)</Label>
                <Input
                  type="number"
                  value={blockForm.settings?.padding || 0}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      settings: { ...blockForm.settings, padding: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div>
                <Label>Border Radius (px)</Label>
                <Input
                  type="number"
                  value={blockForm.settings?.borderRadius || 0}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      settings: { ...blockForm.settings, borderRadius: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!blockForm.name}>
            {editingBlock ? 'Update Block' : 'Create Block'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
