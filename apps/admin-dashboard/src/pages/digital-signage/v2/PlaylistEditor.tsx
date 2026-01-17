/**
 * PlaylistEditor
 *
 * Sprint 2-5: Full playlist editor with drag-and-drop
 * - Visual item arrangement
 * - Duration control
 * - Transition effects
 * - Forced item marking
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Play,
  Settings,
  Lock,
  Image,
  Film,
  FileText,
  Globe,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  playlistApi,
  signageMediaApi,
  type SignagePlaylist,
  type SignagePlaylistItem,
  type SignageMedia,
  type TransitionEffect,
  type AddPlaylistItemDto,
} from '@/lib/api/signageV2';

const TRANSITION_OPTIONS: { value: TransitionEffect; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'zoom', label: 'Zoom' },
];

const MEDIA_TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  video: Film,
  text: FileText,
  html: Globe,
  youtube: Film,
  vimeo: Film,
  external: Globe,
};

interface EditableItem extends SignagePlaylistItem {
  isNew?: boolean;
  isModified?: boolean;
}

export default function PlaylistEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  // Playlist state
  const [playlist, setPlaylist] = useState<Partial<SignagePlaylist>>({
    name: '',
    description: '',
    defaultDuration: 10,
    defaultTransition: 'fade',
    isLoop: true,
    isActive: true,
    tags: [],
  });
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [availableMedia, setAvailableMedia] = useState<SignageMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Item settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load playlist
  useEffect(() => {
    if (isNew) return;

    const loadPlaylist = async () => {
      setLoading(true);
      try {
        const [playlistRes, itemsRes] = await Promise.all([
          playlistApi.get(id!),
          playlistApi.getItems(id!),
        ]);

        if (playlistRes.success && playlistRes.data) {
          setPlaylist(playlistRes.data);
        } else {
          setError('Failed to load playlist');
          return;
        }

        if (itemsRes.success && itemsRes.data) {
          setItems(itemsRes.data.map(item => ({ ...item })));
        }
      } catch (err) {
        setError('Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
  }, [id, isNew]);

  // Load available media
  const loadAvailableMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const response = await signageMediaApi.list(undefined, { limit: 100 });
      if (response.success && response.data) {
        setAvailableMedia(response.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableMedia();
  }, [loadAvailableMedia]);

  // Save playlist
  const handleSave = async () => {
    if (!playlist.name?.trim()) {
      setError('Playlist name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let playlistId = id;

      if (isNew) {
        const response = await playlistApi.create({
          name: playlist.name!,
          description: playlist.description,
          defaultDuration: playlist.defaultDuration,
          defaultTransition: playlist.defaultTransition,
          isLoop: playlist.isLoop,
          tags: playlist.tags,
        });

        if (!response.success || !response.data) {
          setError(response.error || 'Failed to create playlist');
          return;
        }
        playlistId = response.data.id;
      } else {
        const response = await playlistApi.update(id!, {
          name: playlist.name,
          description: playlist.description,
          defaultDuration: playlist.defaultDuration,
          defaultTransition: playlist.defaultTransition,
          isLoop: playlist.isLoop,
          isActive: playlist.isActive,
          tags: playlist.tags,
        });

        if (!response.success) {
          setError(response.error || 'Failed to update playlist');
          return;
        }
      }

      // Save items
      for (const item of items) {
        if (item.isNew) {
          await playlistApi.addItem(playlistId!, {
            mediaId: item.mediaId,
            displayOrder: item.displayOrder,
            displayDuration: item.displayDuration,
            transitionEffect: item.transitionEffect,
            transitionDuration: item.transitionDuration,
            isForced: item.isForced,
            settings: item.settings,
          });
        } else if (item.isModified) {
          await playlistApi.updateItem(playlistId!, item.id, {
            displayOrder: item.displayOrder,
            displayDuration: item.displayDuration,
            transitionEffect: item.transitionEffect,
            transitionDuration: item.transitionDuration,
            isForced: item.isForced,
            settings: item.settings,
          });
        }
      }

      // Reorder items
      const itemIds = items.map(i => i.id).filter(Boolean);
      if (itemIds.length > 0 && !isNew) {
        await playlistApi.reorderItems(playlistId!, itemIds);
      }

      navigate('/admin/digital-signage/v2/playlists');
    } catch (err) {
      setError('Failed to save playlist');
    } finally {
      setSaving(false);
    }
  };

  // Add media to playlist
  const handleAddMedia = (media: SignageMedia) => {
    const newItem: EditableItem = {
      id: `temp-${Date.now()}`,
      playlistId: id || '',
      mediaId: media.id,
      media,
      displayOrder: items.length,
      displayDuration: playlist.defaultDuration || 10,
      transitionEffect: playlist.defaultTransition || 'fade',
      transitionDuration: 300,
      isForced: false,
      settings: {},
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isNew: true,
    };
    setItems([...items, newItem]);
    setMediaPickerOpen(false);
  };

  // Remove item
  const handleRemoveItem = async (index: number) => {
    const item = items[index];
    if (!item.isNew && id) {
      await playlistApi.removeItem(id, item.id);
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    // Update display orders
    newItems.forEach((item, i) => {
      item.displayOrder = i;
      if (!item.isNew) item.isModified = true;
    });

    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Move item up/down
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

    newItems.forEach((item, i) => {
      item.displayOrder = i;
      if (!item.isNew) item.isModified = true;
    });

    setItems(newItems);
  };

  // Update item
  const updateItem = (index: number, updates: Partial<EditableItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    if (!newItems[index].isNew) newItems[index].isModified = true;
    setItems(newItems);
  };

  // Calculate total duration
  const totalDuration = items.reduce((sum, item) => sum + (item.displayDuration || 0), 0);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/digital-signage/v2/playlists')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? 'New Playlist' : 'Edit Playlist'}
            </h1>
            <p className="text-muted-foreground">
              {items.length} items • {formatDuration(totalDuration)} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" onClick={() => window.open(`/signage/neture/channel/${id}?mode=preview`, '_blank')}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="font-semibold">Playlist Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={playlist.name || ''}
                onChange={(e) => setPlaylist({ ...playlist, name: e.target.value })}
                placeholder="Enter playlist name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={playlist.description || ''}
                onChange={(e) => setPlaylist({ ...playlist, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Default Duration (seconds)</Label>
              <Input
                id="defaultDuration"
                type="number"
                min={1}
                value={playlist.defaultDuration || 10}
                onChange={(e) => setPlaylist({ ...playlist, defaultDuration: parseInt(e.target.value) || 10 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultTransition">Default Transition</Label>
              <Select
                value={playlist.defaultTransition || 'fade'}
                onValueChange={(v: TransitionEffect) => setPlaylist({ ...playlist, defaultTransition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSITION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isLoop">Loop Playlist</Label>
              <Switch
                id="isLoop"
                checked={playlist.isLoop ?? true}
                onCheckedChange={(v) => setPlaylist({ ...playlist, isLoop: v })}
              />
            </div>

            {!isNew && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={playlist.isActive ?? true}
                  onCheckedChange={(v) => setPlaylist({ ...playlist, isActive: v })}
                />
              </div>
            )}
          </div>
        </div>

        {/* Playlist Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Playlist Items</h2>
            <Button onClick={() => setMediaPickerOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Media
            </Button>
          </div>

          <div className="border rounded-lg divide-y">
            {items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No items in playlist</p>
                <p className="text-sm">Click "Add Media" to add content</p>
              </div>
            ) : (
              items.map((item, index) => {
                const MediaIcon = MEDIA_TYPE_ICONS[item.media?.mediaType || 'image'] || Image;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="cursor-grab">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                      {item.media?.thumbnailUrl ? (
                        <img
                          src={item.media.thumbnailUrl}
                          alt={item.media.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <MediaIcon className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.media?.name || 'Unknown Media'}</span>
                        {item.isForced && (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="w-3 h-3" />
                            Forced
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.displayDuration}s
                        </span>
                        <span>
                          {TRANSITION_OPTIONS.find(t => t.value === item.transitionEffect)?.label || 'No transition'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItemIndex(index);
                          setSettingsOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Media Picker Dialog */}
      <Dialog open={mediaPickerOpen} onOpenChange={setMediaPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Media to Playlist</DialogTitle>
          </DialogHeader>

          {loadingMedia ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : availableMedia.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No media available. Upload some media first.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {availableMedia.map(media => {
                const MediaIcon = MEDIA_TYPE_ICONS[media.mediaType] || Image;
                const isAlreadyAdded = items.some(item => item.mediaId === media.id);

                return (
                  <button
                    key={media.id}
                    onClick={() => handleAddMedia(media)}
                    disabled={isAlreadyAdded}
                    className={`border rounded-lg p-4 text-left hover:border-primary transition-colors ${
                      isAlreadyAdded ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="aspect-video bg-muted rounded flex items-center justify-center overflow-hidden mb-2">
                      {media.thumbnailUrl ? (
                        <img src={media.thumbnailUrl} alt={media.name} className="w-full h-full object-cover" />
                      ) : (
                        <MediaIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-medium truncate">{media.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{media.mediaType}</p>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item Settings</DialogTitle>
          </DialogHeader>

          {selectedItemIndex !== null && items[selectedItemIndex] && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Duration (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  value={items[selectedItemIndex].displayDuration || 10}
                  onChange={(e) => updateItem(selectedItemIndex, { displayDuration: parseInt(e.target.value) || 10 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Transition Effect</Label>
                <Select
                  value={items[selectedItemIndex].transitionEffect || 'fade'}
                  onValueChange={(v: TransitionEffect) => updateItem(selectedItemIndex, { transitionEffect: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSITION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Transition Duration (ms)</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={items[selectedItemIndex].transitionDuration || 300}
                  onChange={(e) => updateItem(selectedItemIndex, { transitionDuration: parseInt(e.target.value) || 300 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Forced Item</Label>
                  <p className="text-sm text-muted-foreground">Cannot be skipped or removed by schedules</p>
                </div>
                <Switch
                  checked={items[selectedItemIndex].isForced || false}
                  onCheckedChange={(v) => updateItem(selectedItemIndex, { isForced: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
