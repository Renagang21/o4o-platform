/**
 * Template Builder
 *
 * Sprint 2-5: Admin Dashboard - Template/Zone/Layout management
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  templateApi,
  layoutPresetApi,
  playlistApi,
  SignageTemplate,
  SignageTemplateZone,
  SignageLayoutPreset,
  SignagePlaylist,
  CreateTemplateDto,
  CreateTemplateZoneDto,
  ZoneType,
  ZonePosition,
} from '@/lib/api/signageV2';
import {
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  Settings,
  Layout,
  Maximize2,
  Move,
  Eye,
  Copy,
  RefreshCw,
  Monitor,
  Square,
  Image,
  Film,
  Type,
  Code,
  Clock,
  Cloud,
  Rss,
  QrCode,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Zone type configurations
const ZONE_TYPE_CONFIGS: Record<ZoneType, { label: string; color: string; icon: typeof Square }> = {
  main: { label: 'Main', color: 'bg-blue-500', icon: Monitor },
  header: { label: 'Header', color: 'bg-green-500', icon: Layout },
  footer: { label: 'Footer', color: 'bg-purple-500', icon: Layout },
  sidebar: { label: 'Sidebar', color: 'bg-orange-500', icon: Layout },
  ticker: { label: 'Ticker', color: 'bg-yellow-500', icon: Type },
  overlay: { label: 'Overlay', color: 'bg-red-500', icon: Square },
  custom: { label: 'Custom', color: 'bg-gray-500', icon: Square },
};

// Default preset zones for quick start
const DEFAULT_PRESETS = [
  {
    name: 'Full Screen',
    description: 'Single zone covering entire screen',
    zones: [
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 0, width: 100, height: 100, unit: 'percent' as const }, zIndex: 1 },
    ],
  },
  {
    name: 'Header + Main',
    description: 'Top header with main content below',
    zones: [
      { name: 'Header', zoneType: 'header' as ZoneType, position: { x: 0, y: 0, width: 100, height: 15, unit: 'percent' as const }, zIndex: 2 },
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 15, width: 100, height: 85, unit: 'percent' as const }, zIndex: 1 },
    ],
  },
  {
    name: 'Main + Sidebar',
    description: 'Main content with right sidebar',
    zones: [
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 0, width: 75, height: 100, unit: 'percent' as const }, zIndex: 1 },
      { name: 'Sidebar', zoneType: 'sidebar' as ZoneType, position: { x: 75, y: 0, width: 25, height: 100, unit: 'percent' as const }, zIndex: 2 },
    ],
  },
  {
    name: 'L-Shape',
    description: 'Header + Main + Sidebar layout',
    zones: [
      { name: 'Header', zoneType: 'header' as ZoneType, position: { x: 0, y: 0, width: 100, height: 15, unit: 'percent' as const }, zIndex: 3 },
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 15, width: 75, height: 85, unit: 'percent' as const }, zIndex: 1 },
      { name: 'Sidebar', zoneType: 'sidebar' as ZoneType, position: { x: 75, y: 15, width: 25, height: 85, unit: 'percent' as const }, zIndex: 2 },
    ],
  },
  {
    name: 'Full + Ticker',
    description: 'Main content with bottom ticker',
    zones: [
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 0, width: 100, height: 90, unit: 'percent' as const }, zIndex: 1 },
      { name: 'Ticker', zoneType: 'ticker' as ZoneType, position: { x: 0, y: 90, width: 100, height: 10, unit: 'percent' as const }, zIndex: 2 },
    ],
  },
];

export default function TemplateBuilder() {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId?: string }>();
  const canvasRef = useRef<HTMLDivElement>(null);

  // State
  const [template, setTemplate] = useState<SignageTemplate | null>(null);
  const [zones, setZones] = useState<SignageTemplateZone[]>([]);
  const [layoutPresets, setLayoutPresets] = useState<SignageLayoutPreset[]>([]);
  const [playlists, setPlaylists] = useState<SignagePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Dialog states
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Form states
  const [templateForm, setTemplateForm] = useState<CreateTemplateDto>({
    name: '',
    description: '',
    layoutConfig: {
      width: 1920,
      height: 1080,
      orientation: 'landscape',
      backgroundColor: '#000000',
    },
    tags: [],
  });

  const [zoneForm, setZoneForm] = useState<CreateTemplateZoneDto>({
    name: '',
    zoneType: 'main',
    position: { x: 0, y: 0, width: 50, height: 50, unit: 'percent' },
    zIndex: 1,
    defaultPlaylistId: undefined,
    settings: {},
  });

  const [editingZone, setEditingZone] = useState<SignageTemplateZone | null>(null);

  // Drag state for zone editing
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load data
  useEffect(() => {
    loadData();
  }, [templateId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load presets and playlists
      const [presetsRes, playlistsRes] = await Promise.all([
        layoutPresetApi.list(),
        playlistApi.list(),
      ]);

      if (presetsRes.success && presetsRes.data) {
        setLayoutPresets(presetsRes.data.items || []);
      }
      if (playlistsRes.success && playlistsRes.data) {
        setPlaylists(playlistsRes.data.items || []);
      }

      // Load template if editing
      if (templateId && templateId !== 'new') {
        const [templateRes, zonesRes] = await Promise.all([
          templateApi.get(templateId),
          templateApi.getZones(templateId),
        ]);

        if (templateRes.success && templateRes.data) {
          setTemplate(templateRes.data);
          setTemplateForm({
            name: templateRes.data.name,
            description: templateRes.data.description || '',
            layoutConfig: templateRes.data.layoutConfig,
            tags: templateRes.data.tags || [],
          });
        }

        if (zonesRes.success && zonesRes.data) {
          setZones(zonesRes.data);
        }
      } else if (templateId === 'new') {
        setShowNewTemplateDialog(true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new template
  const handleCreateTemplate = async () => {
    setSaving(true);
    try {
      const result = await templateApi.create(templateForm);
      if (result.success && result.data) {
        setTemplate(result.data);
        setShowNewTemplateDialog(false);
        navigate(`/digital-signage/v2/templates/${result.data.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    } finally {
      setSaving(false);
    }
  };

  // Update template
  const handleUpdateTemplate = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const result = await templateApi.update(template.id, {
        name: templateForm.name,
        description: templateForm.description,
        layoutConfig: templateForm.layoutConfig,
        tags: templateForm.tags,
      });
      if (result.success && result.data) {
        setTemplate(result.data);
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    } finally {
      setSaving(false);
    }
  };

  // Apply layout preset
  const handleApplyPreset = async (preset: typeof DEFAULT_PRESETS[0]) => {
    if (!template) return;

    // Remove existing zones
    for (const zone of zones) {
      await templateApi.removeZone(template.id, zone.id);
    }

    // Add new zones from preset
    const newZones: SignageTemplateZone[] = [];
    for (const zoneData of preset.zones) {
      const result = await templateApi.addZone(template.id, zoneData);
      if (result.success && result.data) {
        newZones.push(result.data);
      }
    }

    setZones(newZones);
    setShowPresetDialog(false);
  };

  // Add zone
  const handleAddZone = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const result = await templateApi.addZone(template.id, zoneForm);
      if (result.success && result.data) {
        setZones([...zones, result.data]);
        setShowZoneDialog(false);
        resetZoneForm();
      }
    } catch (error) {
      console.error('Failed to add zone:', error);
    } finally {
      setSaving(false);
    }
  };

  // Update zone
  const handleUpdateZone = async () => {
    if (!template || !editingZone) return;
    setSaving(true);
    try {
      const result = await templateApi.updateZone(template.id, editingZone.id, zoneForm);
      if (result.success && result.data) {
        setZones(zones.map(z => z.id === editingZone.id ? result.data! : z));
        setShowZoneDialog(false);
        setEditingZone(null);
        resetZoneForm();
      }
    } catch (error) {
      console.error('Failed to update zone:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete zone
  const handleDeleteZone = async (zoneId: string) => {
    if (!template) return;
    if (!window.confirm('Are you sure you want to delete this zone?')) return;

    try {
      const result = await templateApi.removeZone(template.id, zoneId);
      if (result.success) {
        setZones(zones.filter(z => z.id !== zoneId));
        if (selectedZoneId === zoneId) {
          setSelectedZoneId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete zone:', error);
    }
  };

  // Reset zone form
  const resetZoneForm = () => {
    setZoneForm({
      name: '',
      zoneType: 'main',
      position: { x: 0, y: 0, width: 50, height: 50, unit: 'percent' },
      zIndex: zones.length + 1,
      defaultPlaylistId: undefined,
      settings: {},
    });
  };

  // Open zone editor
  const openZoneEditor = (zone?: SignageTemplateZone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({
        name: zone.name,
        zoneType: zone.zoneType,
        position: zone.position,
        zIndex: zone.zIndex,
        defaultPlaylistId: zone.defaultPlaylistId,
        settings: zone.settings,
      });
    } else {
      setEditingZone(null);
      resetZoneForm();
    }
    setShowZoneDialog(true);
  };

  // Handle zone drag/resize on canvas
  const handleZoneMouseDown = (e: React.MouseEvent, zoneId: string, mode: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedZoneId(zoneId);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (mode === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
  };

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current || (!isDragging && !isResizing) || !selectedZoneId) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    setZones(prevZones =>
      prevZones.map(zone => {
        if (zone.id !== selectedZoneId) return zone;

        const newPosition = { ...zone.position };
        if (isDragging) {
          newPosition.x = Math.max(0, Math.min(100 - newPosition.width, zone.position.x + deltaX));
          newPosition.y = Math.max(0, Math.min(100 - newPosition.height, zone.position.y + deltaY));
        } else if (isResizing) {
          newPosition.width = Math.max(10, Math.min(100 - newPosition.x, zone.position.width + deltaX));
          newPosition.height = Math.max(10, Math.min(100 - newPosition.y, zone.position.height + deltaY));
        }

        return { ...zone, position: newPosition };
      })
    );

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, isResizing, selectedZoneId, dragStart]);

  const handleCanvasMouseUp = useCallback(async () => {
    if ((isDragging || isResizing) && selectedZoneId && template) {
      const zone = zones.find(z => z.id === selectedZoneId);
      if (zone) {
        await templateApi.updateZone(template.id, zone.id, { position: zone.position });
      }
    }
    setIsDragging(false);
    setIsResizing(false);
  }, [isDragging, isResizing, selectedZoneId, template, zones]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleCanvasMouseMove);
      window.addEventListener('mouseup', handleCanvasMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleCanvasMouseMove);
        window.removeEventListener('mouseup', handleCanvasMouseUp);
      };
    }
  }, [isDragging, isResizing, handleCanvasMouseMove, handleCanvasMouseUp]);

  // Get preview URL
  const getPreviewUrl = () => {
    if (!template) return '';
    // TODO: Implement actual preview URL based on player routes
    return `/signage/preview/template/${template.id}`;
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/digital-signage/v2/templates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {template ? template.name : 'New Template'}
            </h1>
            {template && (
              <p className="text-sm text-muted-foreground">
                {template.layoutConfig.width}x{template.layoutConfig.height} ({template.layoutConfig.orientation})
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPresetDialog(true)} disabled={!template}>
            <Layout className="h-4 w-4 mr-2" />
            Apply Preset
          </Button>
          <Button variant="outline" onClick={() => setShowPreviewDialog(true)} disabled={!template}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleUpdateTemplate} disabled={!template || saving}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {template && (
        <div className="grid grid-cols-12 gap-6">
          {/* Canvas Area */}
          <div className="col-span-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Layout Canvas</CardTitle>
                  <Button size="sm" onClick={() => openZoneEditor()}>
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
                        onClick={() => setSelectedZoneId(zone.id)}
                        onMouseDown={(e) => handleZoneMouseDown(e, zone.id, 'drag')}
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
                          onMouseDown={(e) => handleZoneMouseDown(e, zone.id, 'resize')}
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
          </div>

          {/* Side Panel */}
          <div className="col-span-4 space-y-4">
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
                            onClick={() => setSelectedZoneId(zone.id)}
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
                                    openZoneEditor(zone);
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
                                    handleDeleteZone(zone.id);
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
        </div>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
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
            <Button variant="outline" onClick={() => navigate('/digital-signage/v2/templates')}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!templateForm.name || saving}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout Preset Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
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
                onClick={() => handleApplyPreset(preset)}
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

      {/* Zone Editor Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
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
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingZone ? handleUpdateZone : handleAddZone}
              disabled={!zoneForm.name || saving}
            >
              {editingZone ? 'Update Zone' : 'Add Zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {template && (
                <iframe
                  src={getPreviewUrl()}
                  className="w-full h-full border-0"
                  title="Template Preview"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
