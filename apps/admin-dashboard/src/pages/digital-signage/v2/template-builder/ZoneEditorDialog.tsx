/**
 * Zone Editor Dialog — Zone add/edit form
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx (lines 879-1015)
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import type {
  SignageTemplateZone,
  SignagePlaylist,
  CreateTemplateZoneDto,
  ZoneType,
} from '@/lib/api/signageV2';
import { ZONE_TYPE_CONFIGS } from './template-builder-constants';

interface ZoneEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingZone: SignageTemplateZone | null;
  zoneForm: CreateTemplateZoneDto;
  setZoneForm: (form: CreateTemplateZoneDto) => void;
  playlists: SignagePlaylist[];
  onSave: () => void;
  saving: boolean;
}

export function ZoneEditorDialog({
  open,
  onOpenChange,
  editingZone,
  zoneForm,
  setZoneForm,
  playlists,
  onSave,
  saving,
}: ZoneEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Zone Name</Label>
            <Input
              value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              placeholder="Main Content"
            />
          </div>
          <div>
            <Label>Zone Type</Label>
            <Select
              value={zoneForm.zoneType}
              onValueChange={(value: ZoneType) => setZoneForm({ ...zoneForm, zoneType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ZONE_TYPE_CONFIGS).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded ${config.color}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>X Position (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={zoneForm.position.x}
                onChange={(e) => setZoneForm({
                  ...zoneForm,
                  position: { ...zoneForm.position, x: parseInt(e.target.value) || 0 },
                })}
              />
            </div>
            <div>
              <Label>Y Position (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={zoneForm.position.y}
                onChange={(e) => setZoneForm({
                  ...zoneForm,
                  position: { ...zoneForm.position, y: parseInt(e.target.value) || 0 },
                })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={zoneForm.position.width}
                onChange={(e) => setZoneForm({
                  ...zoneForm,
                  position: { ...zoneForm.position, width: parseInt(e.target.value) || 50 },
                })}
              />
            </div>
            <div>
              <Label>Height (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={zoneForm.position.height}
                onChange={(e) => setZoneForm({
                  ...zoneForm,
                  position: { ...zoneForm.position, height: parseInt(e.target.value) || 50 },
                })}
              />
            </div>
          </div>
          <div>
            <Label>Z-Index (Layer Order)</Label>
            <Input
              type="number"
              min={1}
              value={zoneForm.zIndex}
              onChange={(e) => setZoneForm({ ...zoneForm, zIndex: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <Label>Default Playlist</Label>
            <Select
              value={zoneForm.defaultPlaylistId || 'none'}
              onValueChange={(value) => setZoneForm({
                ...zoneForm,
                defaultPlaylistId: value === 'none' ? undefined : value,
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select playlist..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default playlist</SelectItem>
                {playlists.map((playlist) => (
                  <SelectItem key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!zoneForm.name || saving}
          >
            {editingZone ? 'Update Zone' : 'Add Zone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
