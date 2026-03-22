/**
 * useTemplateBuilder — Custom hook for Template Builder state & operations
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx
 *
 * Responsibilities:
 *   - All state management (template, zones, forms, dialogs, drag)
 *   - API calls via templateApi, layoutPresetApi, playlistApi
 *   - CRUD handlers (template create/update, zone add/update/delete)
 *   - Drag/resize logic for canvas zone editing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  templateApi,
  layoutPresetApi,
  playlistApi,
  type SignageTemplate,
  type SignageTemplateZone,
  type SignageLayoutPreset,
  type SignagePlaylist,
  type CreateTemplateDto,
  type CreateTemplateZoneDto,
  type ZoneType,
} from '@/lib/api/signageV2';
import { DEFAULT_PRESETS } from './template-builder-constants';

const INITIAL_TEMPLATE_FORM: CreateTemplateDto = {
  name: '',
  description: '',
  layoutConfig: {
    width: 1920,
    height: 1080,
    orientation: 'landscape',
    backgroundColor: '#000000',
  },
  tags: [],
};

const INITIAL_ZONE_FORM: CreateTemplateZoneDto = {
  name: '',
  zoneType: 'main',
  position: { x: 0, y: 0, width: 50, height: 50, unit: 'percent' },
  zIndex: 1,
  defaultPlaylistId: undefined,
  settings: {},
};

export function useTemplateBuilder(templateId?: string) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Data state
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
  const [templateForm, setTemplateForm] = useState<CreateTemplateDto>(INITIAL_TEMPLATE_FORM);
  const [zoneForm, setZoneForm] = useState<CreateTemplateZoneDto>(INITIAL_ZONE_FORM);
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

  // Reset zone form
  const resetZoneForm = () => {
    setZoneForm({
      ...INITIAL_ZONE_FORM,
      zIndex: zones.length + 1,
    });
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
    return `/signage/preview/template/${template.id}`;
  };

  return {
    // Data
    template,
    zones,
    layoutPresets,
    playlists,
    loading,
    saving,
    selectedZoneId,
    setSelectedZoneId,
    canvasRef,
    // Forms
    templateForm,
    setTemplateForm,
    zoneForm,
    setZoneForm,
    editingZone,
    // Dialogs
    showNewTemplateDialog,
    setShowNewTemplateDialog,
    showPresetDialog,
    setShowPresetDialog,
    showZoneDialog,
    setShowZoneDialog,
    showPreviewDialog,
    setShowPreviewDialog,
    // Actions
    handleCreateTemplate,
    handleUpdateTemplate,
    handleApplyPreset,
    handleAddZone,
    handleUpdateZone,
    handleDeleteZone,
    openZoneEditor,
    handleZoneMouseDown,
    getPreviewUrl,
    navigate,
  };
}
