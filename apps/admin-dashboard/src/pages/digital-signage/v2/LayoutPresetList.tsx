/**
 * Layout Preset List
 *
 * Sprint 2-5: Admin Dashboard - Layout Preset management
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import {
  layoutPresetApi,
  SignageLayoutPreset,
  CreateLayoutPresetDto,
  LayoutPresetData,
  PresetZoneData,
  ZonePosition,
} from '@/lib/api/signageV2';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Layout,
  RefreshCw,
  Monitor,
  Smartphone,
  Grid,
  List,
} from 'lucide-react';

// Zone type colors for visualization
const ZONE_COLORS: Record<string, string> = {
  main: 'bg-blue-500',
  header: 'bg-green-500',
  footer: 'bg-purple-500',
  sidebar: 'bg-orange-500',
  ticker: 'bg-yellow-500',
  overlay: 'bg-red-500',
  custom: 'bg-gray-500',
};

// Preset categories
const PRESET_CATEGORIES = [
  { value: 'simple', label: 'Simple' },
  { value: 'multi-zone', label: 'Multi-Zone' },
  { value: 'ticker', label: 'With Ticker' },
  { value: 'sidebar', label: 'With Sidebar' },
  { value: 'custom', label: 'Custom' },
];

export default function LayoutPresetList() {
  const [presets, setPresets] = useState<SignageLayoutPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dialog states
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<SignageLayoutPreset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SignageLayoutPreset | null>(null);

  // Form state
  const [presetForm, setPresetForm] = useState<CreateLayoutPresetDto>({
    name: '',
    description: '',
    presetData: {
      orientation: 'landscape',
      aspectRatio: '16:9',
      zones: [],
    },
    category: 'simple',
    tags: [],
  });

  // Zone editor state
  const [zoneEditorOpen, setZoneEditorOpen] = useState(false);
  const [editingZoneIndex, setEditingZoneIndex] = useState<number | null>(null);
  const [zoneForm, setZoneForm] = useState<PresetZoneData>({
    name: '',
    zoneType: 'main',
    position: { x: 0, y: 0, width: 100, height: 100, unit: 'percent' },
    zIndex: 1,
  });

  // Load presets
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const result = await layoutPresetApi.list();
      if (result.success && result.data) {
        setPresets(result.data.items || []);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered presets
  const filteredPresets = presets.filter((preset) => {
    const matchesSearch =
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || preset.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Reset form
  const resetForm = () => {
    setPresetForm({
      name: '',
      description: '',
      presetData: {
        orientation: 'landscape',
        aspectRatio: '16:9',
        zones: [],
      },
      category: 'simple',
      tags: [],
    });
    setEditingPreset(null);
  };

  // Open create/edit dialog
  const openPresetDialog = (preset?: SignageLayoutPreset) => {
    if (preset) {
      setEditingPreset(preset);
      setPresetForm({
        name: preset.name,
        description: preset.description || '',
        presetData: preset.presetData,
        category: preset.category || 'custom',
        tags: preset.tags || [],
      });
    } else {
      resetForm();
    }
    setShowPresetDialog(true);
  };

  // Handle create/update
  const handleSavePreset = async () => {
    try {
      if (editingPreset) {
        const result = await layoutPresetApi.update(editingPreset.id, presetForm);
        if (result.success && result.data) {
          setPresets(presets.map((p) => (p.id === editingPreset.id ? result.data! : p)));
        }
      } else {
        const result = await layoutPresetApi.create(presetForm);
        if (result.success && result.data) {
          setPresets([result.data, ...presets]);
        }
      }
      setShowPresetDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (preset: SignageLayoutPreset) => {
    try {
      const result = await layoutPresetApi.create({
        name: `${preset.name} (Copy)`,
        description: preset.description,
        presetData: preset.presetData,
        category: preset.category,
        tags: preset.tags,
      });
      if (result.success && result.data) {
        setPresets([result.data, ...presets]);
      }
    } catch (error) {
      console.error('Failed to duplicate preset:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await layoutPresetApi.delete(deleteTarget.id);
      if (result.success) {
        setPresets(presets.filter((p) => p.id !== deleteTarget.id));
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Zone management
  const openZoneEditor = (index?: number) => {
    if (index !== undefined) {
      setEditingZoneIndex(index);
      setZoneForm(presetForm.presetData.zones[index]);
    } else {
      setEditingZoneIndex(null);
      setZoneForm({
        name: '',
        zoneType: 'main',
        position: { x: 0, y: 0, width: 50, height: 50, unit: 'percent' },
        zIndex: presetForm.presetData.zones.length + 1,
      });
    }
    setZoneEditorOpen(true);
  };

  const handleSaveZone = () => {
    const newZones = [...presetForm.presetData.zones];
    if (editingZoneIndex !== null) {
      newZones[editingZoneIndex] = zoneForm;
    } else {
      newZones.push(zoneForm);
    }
    setPresetForm({
      ...presetForm,
      presetData: { ...presetForm.presetData, zones: newZones },
    });
    setZoneEditorOpen(false);
  };

  const handleDeleteZone = (index: number) => {
    const newZones = presetForm.presetData.zones.filter((_, i) => i !== index);
    setPresetForm({
      ...presetForm,
      presetData: { ...presetForm.presetData, zones: newZones },
    });
  };

  // Render preview
  const renderPresetPreview = (presetData: LayoutPresetData, small = false) => {
    const isPortrait = presetData.orientation === 'portrait';
    const aspectClass = isPortrait ? 'aspect-[9/16]' : 'aspect-video';

    return (
      <div className={`relative ${aspectClass} bg-gray-900 rounded border border-border overflow-hidden`}>
        {presetData.zones.map((zone, idx) => (
          <div
            key={idx}
            className={`absolute ${ZONE_COLORS[zone.zoneType] || 'bg-gray-500'} opacity-60 border border-white/30`}
            style={{
              left: `${zone.position.x}%`,
              top: `${zone.position.y}%`,
              width: `${zone.position.width}%`,
              height: `${zone.position.height}%`,
            }}
          >
            {!small && (
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                {zone.name}
              </span>
            )}
          </div>
        ))}
        {presetData.zones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30">
            <Layout className={small ? 'h-4 w-4' : 'h-8 w-8'} />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Layout Presets</h1>
          <p className="text-muted-foreground">
            Pre-defined zone layouts for quick template setup
          </p>
        </div>
        <Button onClick={() => openPresetDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Preset
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterCategory}
          onValueChange={setFilterCategory}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRESET_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={loadPresets}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Presets */}
      {filteredPresets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No layout presets found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterCategory !== 'all'
                ? 'Try different filters'
                : 'Create your first layout preset to get started'}
            </p>
            {!searchQuery && filterCategory === 'all' && (
              <Button onClick={() => openPresetDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Preset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPresets.map((preset) => (
            <Card key={preset.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {/* Preview */}
                <div className="relative p-4 bg-muted/50 rounded-t-lg">
                  <div className="max-w-[200px] mx-auto">
                    {renderPresetPreview(preset.presetData)}
                  </div>
                  {/* Overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPresetDialog(preset)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(preset)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(preset)}
                          disabled={preset.isSystem}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium truncate">{preset.name}</h3>
                    {preset.isSystem && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        System
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                    {preset.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {preset.presetData.orientation === 'portrait' ? (
                        <Smartphone className="h-3 w-3" />
                      ) : (
                        <Monitor className="h-3 w-3" />
                      )}
                      {preset.presetData.aspectRatio}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layout className="h-3 w-3" />
                      {preset.presetData.zones.length} zones
                    </span>
                    {preset.category && (
                      <Badge variant="outline" className="text-xs">
                        {preset.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPresets.map((preset) => (
            <Card key={preset.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {/* Preview */}
                <div className="w-24 flex-shrink-0">
                  {renderPresetPreview(preset.presetData, true)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{preset.name}</h3>
                    {preset.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {preset.description || 'No description'}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {preset.presetData.orientation === 'portrait' ? (
                      <Smartphone className="h-3.5 w-3.5" />
                    ) : (
                      <Monitor className="h-3.5 w-3.5" />
                    )}
                    {preset.presetData.aspectRatio}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layout className="h-3.5 w-3.5" />
                    {preset.presetData.zones.length}
                  </span>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openPresetDialog(preset)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(preset)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(preset)}
                      disabled={preset.isSystem}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preset Editor Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Edit Layout Preset' : 'Create Layout Preset'}</DialogTitle>
            <DialogDescription>
              Define a reusable zone layout for templates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Left: Form */}
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={presetForm.name}
                  onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                  placeholder="My Layout Preset"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={presetForm.description}
                  onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                  rows={2}
                  placeholder="Describe this layout..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Orientation</Label>
                  <Select
                    value={presetForm.presetData.orientation}
                    onValueChange={(value: 'landscape' | 'portrait') =>
                      setPresetForm({
                        ...presetForm,
                        presetData: { ...presetForm.presetData, orientation: value },
                      })
                    }
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
                  <Label>Aspect Ratio</Label>
                  <Select
                    value={presetForm.presetData.aspectRatio}
                    onValueChange={(value) =>
                      setPresetForm({
                        ...presetForm,
                        presetData: { ...presetForm.presetData, aspectRatio: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                      <SelectItem value="21:9">21:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={presetForm.category || 'custom'}
                  onValueChange={(value) => setPresetForm({ ...presetForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zones List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Zones ({presetForm.presetData.zones.length})</Label>
                  <Button size="sm" onClick={() => openZoneEditor()}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {presetForm.presetData.zones.map((zone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${ZONE_COLORS[zone.zoneType] || 'bg-gray-500'}`} />
                        <span className="font-medium text-sm">{zone.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({zone.position.x}%, {zone.position.y}%) {zone.position.width}%x{zone.position.height}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openZoneEditor(idx)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteZone(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {presetForm.presetData.zones.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No zones added yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div>
              <Label className="mb-2 block">Preview</Label>
              <div className="p-4 bg-muted/30 rounded-lg">
                {renderPresetPreview(presetForm.presetData)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {presetForm.presetData.orientation} • {presetForm.presetData.aspectRatio}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPresetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetForm.name}>
              {editingPreset ? 'Update Preset' : 'Create Preset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Editor Dialog */}
      <Dialog open={zoneEditorOpen} onOpenChange={setZoneEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZoneIndex !== null ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
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
                onValueChange={(value) => setZoneForm({ ...zoneForm, zoneType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ZONE_COLORS).map(([type, color]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded ${color}`} />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
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
                  onChange={(e) =>
                    setZoneForm({
                      ...zoneForm,
                      position: { ...zoneForm.position, x: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div>
                <Label>Y Position (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={zoneForm.position.y}
                  onChange={(e) =>
                    setZoneForm({
                      ...zoneForm,
                      position: { ...zoneForm.position, y: parseInt(e.target.value) || 0 },
                    })
                  }
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
                  onChange={(e) =>
                    setZoneForm({
                      ...zoneForm,
                      position: { ...zoneForm.position, width: parseInt(e.target.value) || 50 },
                    })
                  }
                />
              </div>
              <div>
                <Label>Height (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={zoneForm.position.height}
                  onChange={(e) =>
                    setZoneForm({
                      ...zoneForm,
                      position: { ...zoneForm.position, height: parseInt(e.target.value) || 50 },
                    })
                  }
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveZone} disabled={!zoneForm.name}>
              {editingZoneIndex !== null ? 'Update Zone' : 'Add Zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Layout Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
