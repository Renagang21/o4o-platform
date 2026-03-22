/**
 * Block Delete Dialog — Delete confirmation
 *
 * WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1
 * Extracted from ContentBlockLibrary.tsx
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SignageContentBlock } from '@/lib/api/signageV2';

interface BlockDeleteDialogProps {
  target: SignageContentBlock | null;
  onOpenChange: () => void;
  onConfirm: () => void;
}

export function BlockDeleteDialog({ target, onOpenChange, onConfirm }: BlockDeleteDialogProps) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Content Block</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{target?.name}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
