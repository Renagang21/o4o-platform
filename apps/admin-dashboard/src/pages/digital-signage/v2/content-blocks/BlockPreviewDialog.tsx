/**
 * Block Preview Dialog — Content block preview
 *
 * WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1
 * Extracted from ContentBlockLibrary.tsx
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SignageContentBlock } from '@/lib/api/signageV2';
import { BLOCK_TYPE_CONFIGS } from './content-block-constants';

interface BlockPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: SignageContentBlock | null;
}

export function BlockPreviewDialog({ open, onOpenChange, block }: BlockPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Block Preview: {block?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
            {block && (
              <div className="text-white text-center">
                <p className="text-lg">{block.name}</p>
                <p className="text-sm text-white/70 mt-2">
                  Type: {BLOCK_TYPE_CONFIGS[block.blockType].label}
                </p>
                <pre className="mt-4 text-xs text-left bg-white/10 p-4 rounded max-h-40 overflow-auto">
                  {JSON.stringify(block.content, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
