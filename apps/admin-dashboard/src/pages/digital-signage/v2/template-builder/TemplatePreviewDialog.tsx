/**
 * Template Preview Dialog — iframe preview
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx (lines 1017-1035)
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  hasTemplate: boolean;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  previewUrl,
  hasTemplate,
}: TemplatePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {hasTemplate && (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="Template Preview"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
