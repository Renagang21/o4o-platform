/**
 * Layout Preset Dialog — Preset layout selection
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx (lines 831-877)
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_PRESETS, ZONE_TYPE_CONFIGS } from './template-builder-constants';

interface LayoutPresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPreset: (preset: typeof DEFAULT_PRESETS[0]) => void;
}

export function LayoutPresetDialog({
  open,
  onOpenChange,
  onApplyPreset,
}: LayoutPresetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply Layout Preset</DialogTitle>
          <DialogDescription>
            Choose a preset layout to quickly set up zones. This will replace all existing zones.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {DEFAULT_PRESETS.map((preset) => (
            <Card
              key={preset.name}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onApplyPreset(preset)}
            >
              <CardContent className="p-4">
                {/* Preview */}
                <div className="relative w-full aspect-video bg-muted rounded border mb-3">
                  {preset.zones.map((zone, idx) => (
                    <div
                      key={idx}
                      className={`absolute ${ZONE_TYPE_CONFIGS[zone.zoneType].color} opacity-50 border border-white/30`}
                      style={{
                        left: `${zone.position.x}%`,
                        top: `${zone.position.y}%`,
                        width: `${zone.position.width}%`,
                        height: `${zone.position.height}%`,
                      }}
                    />
                  ))}
                </div>
                <h4 className="font-medium">{preset.name}</h4>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
                <div className="flex gap-1 mt-2">
                  {preset.zones.map((zone, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {zone.zoneType}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
