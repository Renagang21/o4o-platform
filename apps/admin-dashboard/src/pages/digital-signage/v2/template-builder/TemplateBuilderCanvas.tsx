/**
 * Template Builder Canvas — Zone overlay rendering + drag/resize handles
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx (lines 494-576)
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SignageTemplate, SignageTemplateZone } from '@/lib/api/signageV2';
import { Plus, Layout } from 'lucide-react';
import { ZONE_TYPE_CONFIGS } from './template-builder-constants';

interface TemplateBuilderCanvasProps {
  template: SignageTemplate;
  zones: SignageTemplateZone[];
  selectedZoneId: string | null;
  canvasRef: React.RefObject<HTMLDivElement>;
  onZoneSelect: (id: string) => void;
  onZoneMouseDown: (e: React.MouseEvent, zoneId: string, mode: 'drag' | 'resize') => void;
  onAddZone: () => void;
}

export function TemplateBuilderCanvas({
  template,
  zones,
  selectedZoneId,
  canvasRef,
  onZoneSelect,
  onZoneMouseDown,
  onAddZone,
}: TemplateBuilderCanvasProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Layout Canvas</CardTitle>
          <Button size="sm" onClick={onAddZone}>
            <Plus className="h-4 w-4 mr-1" />
            Add Zone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative bg-black border border-border rounded-lg overflow-hidden"
          style={{
            aspectRatio: `${template.layoutConfig.width} / ${template.layoutConfig.height}`,
            backgroundColor: template.layoutConfig.backgroundColor || '#000000',
          }}
        >
          {/* Zones */}
          {zones.map((zone) => {
            const config = ZONE_TYPE_CONFIGS[zone.zoneType];
            const isSelected = selectedZoneId === zone.id;

            return (
              <div
                key={zone.id}
                className={`absolute border-2 transition-colors cursor-move ${
                  isSelected ? 'border-white shadow-lg' : 'border-white/50 hover:border-white/80'
                }`}
                style={{
                  left: `${zone.position.x}%`,
                  top: `${zone.position.y}%`,
                  width: `${zone.position.width}%`,
                  height: `${zone.position.height}%`,
                  zIndex: zone.zIndex,
                }}
                onClick={() => onZoneSelect(zone.id)}
                onMouseDown={(e) => onZoneMouseDown(e, zone.id, 'drag')}
              >
                {/* Zone Content */}
                <div className={`absolute inset-0 ${config.color} opacity-30`} />

                {/* Zone Label */}
                <div className="absolute top-1 left-1 flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs py-0">
                    {zone.name}
                  </Badge>
                </div>

                {/* Resize Handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-white cursor-se-resize"
                  onMouseDown={(e) => onZoneMouseDown(e, zone.id, 'resize')}
                />
              </div>
            );
          })}

          {/* Empty state */}
          {zones.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <div className="text-center">
                <Layout className="h-12 w-12 mx-auto mb-2" />
                <p>No zones defined</p>
                <p className="text-sm">Add zones or apply a preset</p>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Info */}
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{zones.length} zone(s)</span>
          <span>{template.layoutConfig.width}x{template.layoutConfig.height}px</span>
          <span className="capitalize">{template.layoutConfig.orientation}</span>
        </div>
      </CardContent>
    </Card>
  );
}
