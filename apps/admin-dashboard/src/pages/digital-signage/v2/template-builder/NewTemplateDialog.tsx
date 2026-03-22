/**
 * New Template Dialog — Create new template with name/resolution/background
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx (lines 751-829)
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
import type { CreateTemplateDto } from '@/lib/api/signageV2';

interface NewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateForm: CreateTemplateDto;
  setTemplateForm: (form: CreateTemplateDto) => void;
  onCancel: () => void;
  onCreate: () => void;
  saving: boolean;
}

export function NewTemplateDialog({
  open,
  onOpenChange,
  templateForm,
  setTemplateForm,
  onCancel,
  onCreate,
  saving,
}: NewTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Set up the basic properties for your template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="newTemplateName">Template Name</Label>
            <Input
              id="newTemplateName"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              placeholder="My Template"
            />
          </div>
          <div>
            <Label>Resolution</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { w: 1920, h: 1080, label: 'FHD' },
                { w: 3840, h: 2160, label: '4K' },
                { w: 1080, h: 1920, label: 'Portrait' },
                { w: 1080, h: 1080, label: 'Square' },
              ].map((res) => (
                <Button
                  key={res.label}
                  variant={templateForm.layoutConfig.width === res.w && templateForm.layoutConfig.height === res.h ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTemplateForm({
                    ...templateForm,
                    layoutConfig: {
                      ...templateForm.layoutConfig,
                      width: res.w,
                      height: res.h,
                      orientation: res.w >= res.h ? 'landscape' : 'portrait',
                    },
                  })}
                >
                  {res.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Background Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                value={templateForm.layoutConfig.backgroundColor || '#000000'}
                onChange={(e) => setTemplateForm({
                  ...templateForm,
                  layoutConfig: { ...templateForm.layoutConfig, backgroundColor: e.target.value },
                })}
                className="w-12 h-9 p-1"
              />
              <Input
                value={templateForm.layoutConfig.backgroundColor || '#000000'}
                onChange={(e) => setTemplateForm({
                  ...templateForm,
                  layoutConfig: { ...templateForm.layoutConfig, backgroundColor: e.target.value },
                })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!templateForm.name || saving}>
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
