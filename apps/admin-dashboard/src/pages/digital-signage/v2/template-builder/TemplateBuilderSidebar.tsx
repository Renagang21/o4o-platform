/**
 * Template Builder Sidebar — Template settings form + zone list
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx (lines 578-746)
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  SignageTemplateZone,
  SignagePlaylist,
  CreateTemplateDto,
} from '@/lib/api/signageV2';
import { Settings, Trash2 } from 'lucide-react';
import { ZONE_TYPE_CONFIGS } from './template-builder-constants';

interface TemplateBuilderSidebarProps {
  templateForm: CreateTemplateDto;
  setTemplateForm: (form: CreateTemplateDto) => void;
  zones: SignageTemplateZone[];
  playlists: SignagePlaylist[];
  selectedZoneId: string | null;
  onZoneSelect: (id: string) => void;
  onZoneEdit: (zone: SignageTemplateZone) => void;
  onZoneDelete: (zoneId: string) => void;
}

export function TemplateBuilderSidebar({
  templateForm,
  setTemplateForm,
  zones,
  playlists,
  selectedZoneId,
  onZoneSelect,
  onZoneEdit,
  onZoneDelete,
}: TemplateBuilderSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Template Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Template Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="templateName">Name</Label>
            <Input
              id="templateName"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="templateDesc">Description</Label>
            <Textarea
              id="templateDesc"
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width</Label>
              <Input
                type="number"
                value={templateForm.layoutConfig.width}
                onChange={(e) => setTemplateForm({
                  ...templateForm,
                  layoutConfig: { ...templateForm.layoutConfig, width: parseInt(e.target.value) || 1920 },
                })}
              />
            </div>
            <div>
              <Label>Height</Label>
              <Input
                type="number"
                value={templateForm.layoutConfig.height}
                onChange={(e) => setTemplateForm({
                  ...templateForm,
                  layoutConfig: { ...templateForm.layoutConfig, height: parseInt(e.target.value) || 1080 },
                })}
              />
            </div>
          </div>
          <div>
            <Label>Orientation</Label>
            <Select
              value={templateForm.layoutConfig.orientation}
              onValueChange={(value: 'landscape' | 'portrait') => setTemplateForm({
                ...templateForm,
                layoutConfig: { ...templateForm.layoutConfig, orientation: value },
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Landscape</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Background Color</Label>
            <div className="flex gap-2">
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
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Zones ({zones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No zones yet. Add zones or apply a preset.
            </p>
          ) : (
            <div className="space-y-2">
              {zones
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((zone) => {
                  const config = ZONE_TYPE_CONFIGS[zone.zoneType];
                  const isSelected = selectedZoneId === zone.id;

                  return (
                    <div
                      key={zone.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => onZoneSelect(zone.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${config.color}`} />
                          <span className="font-medium">{zone.name}</span>
                          <Badge variant="outline" className="text-xs">
                            z:{zone.zIndex}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onZoneEdit(zone);
                            }}
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onZoneDelete(zone.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {zone.position.x}%, {zone.position.y}% / {zone.position.width}% x {zone.position.height}%
                      </div>
                      {zone.defaultPlaylistId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Playlist: {playlists.find(p => p.id === zone.defaultPlaylistId)?.name || 'Unknown'}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
