/**
 * Channel Editor
 *
 * Sprint 2-5: Admin Dashboard - Channel create/edit page
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { authClient } from '@o4o/auth-client';
import {
  templateApi,
  playlistApi,
  SignageTemplate,
  SignagePlaylist,
} from '@/lib/api/signageV2';
import {
  ArrowLeft,
  Save,
  Monitor,
  Settings,
  Layout,
  Play,
  RefreshCw,
  Copy,
  ExternalLink,
  Eye,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';

const DEFAULT_SERVICE_KEY = 'neture';

interface ChannelFormData {
  name: string;
  description: string;
  code: string;
  templateId: string;
  defaultPlaylistId: string;
  isActive: boolean;
  playerConfig: {
    mode: 'zero-ui' | 'minimal' | 'preview' | 'debug';
    autoStart: boolean;
    showClock: boolean;
    showLogo: boolean;
    transitionDuration: number;
    cacheStrategy: 'aggressive' | 'normal' | 'minimal';
  };
}

interface ChannelData extends ChannelFormData {
  id: string;
  serviceKey: string;
  organizationId?: string;
  isOnline?: boolean;
  lastHeartbeat?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChannelEditor() {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId?: string }>();
  const isNew = channelId === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [templates, setTemplates] = useState<SignageTemplate[]>([]);
  const [playlists, setPlaylists] = useState<SignagePlaylist[]>([]);

  const [form, setForm] = useState<ChannelFormData>({
    name: '',
    description: '',
    code: '',
    templateId: '',
    defaultPlaylistId: '',
    isActive: true,
    playerConfig: {
      mode: 'zero-ui',
      autoStart: true,
      showClock: false,
      showLogo: false,
      transitionDuration: 500,
      cacheStrategy: 'normal',
    },
  });

  // Generate channel code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, code });
  };

  // Load data
  useEffect(() => {
    loadData();
  }, [channelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load templates and playlists
      const [templatesRes, playlistsRes] = await Promise.all([
        templateApi.list(),
        playlistApi.list(),
      ]);

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data.items || []);
      }
      if (playlistsRes.success && playlistsRes.data) {
        setPlaylists(playlistsRes.data.items || []);
      }

      // Load channel if editing
      if (!isNew && channelId) {
        const response = await authClient.api.get(
          `/api/signage/${DEFAULT_SERVICE_KEY}/channels/${channelId}`
        );
        const data = response.data;
        setChannel(data);
        setForm({
          name: data.name || '',
          description: data.description || '',
          code: data.code || '',
          templateId: data.templateId || '',
          defaultPlaylistId: data.defaultPlaylistId || '',
          isActive: data.isActive ?? true,
          playerConfig: {
            mode: data.playerConfig?.mode || 'zero-ui',
            autoStart: data.playerConfig?.autoStart ?? true,
            showClock: data.playerConfig?.showClock ?? false,
            showLogo: data.playerConfig?.showLogo ?? false,
            transitionDuration: data.playerConfig?.transitionDuration || 500,
            cacheStrategy: data.playerConfig?.cacheStrategy || 'normal',
          },
        });
      } else {
        // Generate code for new channel
        generateCode();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save channel
  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const response = await authClient.api.post(
          `/api/signage/${DEFAULT_SERVICE_KEY}/channels`,
          form
        );
        navigate(`/digital-signage/v2/channels/${response.data.id}`, { replace: true });
      } else {
        await authClient.api.patch(
          `/api/signage/${DEFAULT_SERVICE_KEY}/channels/${channelId}`,
          form
        );
        loadData();
      }
    } catch (error) {
      console.error('Failed to save channel:', error);
    } finally {
      setSaving(false);
    }
  };

  // Copy player URL
  const copyPlayerUrl = () => {
    const url = `${window.location.origin}/signage/${DEFAULT_SERVICE_KEY}/channel/${channel?.id || 'preview'}`;
    navigator.clipboard.writeText(url);
  };

  // Open player
  const openPlayer = () => {
    const url = `/signage/${DEFAULT_SERVICE_KEY}/channel/${channel?.id || 'preview'}`;
    window.open(url, '_blank');
  };

  // Format relative time
  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return 'Never';
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/digital-signage/v2/channels')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? 'New Channel' : form.name || 'Channel'}
            </h1>
            {!isNew && channel && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-mono">
                  {channel.code}
                </Badge>
                {channel.isOnline ? (
                  <Badge className="bg-green-500 text-white border-0">
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
                {channel.lastHeartbeat && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(channel.lastHeartbeat)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <Button variant="outline" onClick={copyPlayerUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
              <Button variant="outline" onClick={openPlayer}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Player
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={saving || !form.name}>
            <Save className="h-4 w-4 mr-2" />
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Monitor className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Layout className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="player" className="gap-2">
            <Settings className="h-4 w-4" />
            Player Settings
          </TabsTrigger>
          {!isNew && (
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          )}
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Channel Information</CardTitle>
              <CardDescription>
                Basic settings for this display channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Channel Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Lobby Display"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Channel Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="ABC12345"
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={generateCode}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for easy device pairing
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe where this channel is displayed..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this channel
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Template</CardTitle>
                <CardDescription>
                  Layout template for multi-zone display
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={form.templateId || 'none'}
                  onValueChange={(value) => setForm({ ...form, templateId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template (single zone)</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.layoutConfig.width}x{template.layoutConfig.height})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.templateId && (
                  <div className="p-4 bg-muted rounded-lg">
                    {(() => {
                      const template = templates.find(t => t.id === form.templateId);
                      if (!template) return null;
                      return (
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {template.layoutConfig.width}x{template.layoutConfig.height} • {template.zones?.length || 0} zones
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Playlist</CardTitle>
                <CardDescription>
                  Content to play when no schedule is active
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={form.defaultPlaylistId || 'none'}
                  onValueChange={(value) => setForm({ ...form, defaultPlaylistId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select playlist..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default playlist</SelectItem>
                    {playlists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        {playlist.name} ({playlist.itemCount} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.defaultPlaylistId && (
                  <div className="p-4 bg-muted rounded-lg">
                    {(() => {
                      const playlist = playlists.find(p => p.id === form.defaultPlaylistId);
                      if (!playlist) return null;
                      return (
                        <div>
                          <p className="font-medium">{playlist.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {playlist.itemCount} items • {Math.round(playlist.totalDuration / 60)}min total
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Player Settings Tab */}
        <TabsContent value="player">
          <Card>
            <CardHeader>
              <CardTitle>Player Configuration</CardTitle>
              <CardDescription>
                Customize player behavior and appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Player Mode</Label>
                  <Select
                    value={form.playerConfig.mode}
                    onValueChange={(value: ChannelFormData['playerConfig']['mode']) =>
                      setForm({
                        ...form,
                        playerConfig: { ...form.playerConfig, mode: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zero-ui">Zero UI (Production)</SelectItem>
                      <SelectItem value="minimal">Minimal (Status only)</SelectItem>
                      <SelectItem value="preview">Preview (Admin)</SelectItem>
                      <SelectItem value="debug">Debug (Development)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls what UI elements are shown on the player
                  </p>
                </div>

                <div>
                  <Label>Cache Strategy</Label>
                  <Select
                    value={form.playerConfig.cacheStrategy}
                    onValueChange={(value: ChannelFormData['playerConfig']['cacheStrategy']) =>
                      setForm({
                        ...form,
                        playerConfig: { ...form.playerConfig, cacheStrategy: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aggressive">Aggressive (Max offline support)</SelectItem>
                      <SelectItem value="normal">Normal (Balanced)</SelectItem>
                      <SelectItem value="minimal">Minimal (Save storage)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How media files are cached locally
                  </p>
                </div>

                <div>
                  <Label>Transition Duration (ms)</Label>
                  <Input
                    type="number"
                    value={form.playerConfig.transitionDuration}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        playerConfig: {
                          ...form.playerConfig,
                          transitionDuration: parseInt(e.target.value) || 500,
                        },
                      })
                    }
                    min={0}
                    max={3000}
                    step={100}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Auto Start</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically start playback when player loads
                    </p>
                  </div>
                  <Switch
                    checked={form.playerConfig.autoStart}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        playerConfig: { ...form.playerConfig, autoStart: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Show Clock</Label>
                    <p className="text-sm text-muted-foreground">
                      Display current time on screen
                    </p>
                  </div>
                  <Switch
                    checked={form.playerConfig.showClock}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        playerConfig: { ...form.playerConfig, showClock: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Show Logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Display organization logo watermark
                    </p>
                  </div>
                  <Switch
                    checked={form.playerConfig.showLogo}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        playerConfig: { ...form.playerConfig, showLogo: checked },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        {!isNew && (
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Channel Preview</CardTitle>
                <CardDescription>
                  Live preview of the channel player
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={`/signage/${DEFAULT_SERVICE_KEY}/channel/${channelId}?mode=preview`}
                    className="w-full h-full border-0"
                    title="Channel Preview"
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <Button variant="outline" onClick={openPlayer}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button variant="outline" onClick={copyPlayerUrl}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Player URL
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
