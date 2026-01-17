/**
 * Channel List
 *
 * Sprint 2-5: Admin Dashboard - Channel management list
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { authClient } from '@o4o/auth-client';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Monitor,
  RefreshCw,
  Eye,
  Grid,
  List,
  Play,
  Pause,
  Settings,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Channel type from API
interface SignageChannel {
  id: string;
  serviceKey: string;
  organizationId?: string;
  organizationName?: string;
  code: string;
  name: string;
  description?: string;
  templateId?: string;
  templateName?: string;
  defaultPlaylistId?: string;
  defaultPlaylistName?: string;
  isActive: boolean;
  isOnline?: boolean;
  lastHeartbeat?: string;
  playerConfig: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SERVICE_KEY = 'neture';

export default function ChannelList() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<SignageChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<SignageChannel | null>(null);

  // Load channels
  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get(`/api/signage/${DEFAULT_SERVICE_KEY}/channels`);
      setChannels(response.data.items || response.data || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered channels
  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle duplicate
  const handleDuplicate = async (channel: SignageChannel) => {
    try {
      await authClient.api.post(`/api/signage/${DEFAULT_SERVICE_KEY}/channels`, {
        name: `${channel.name} (Copy)`,
        description: channel.description,
        templateId: channel.templateId,
        defaultPlaylistId: channel.defaultPlaylistId,
        playerConfig: channel.playerConfig,
      });
      loadChannels();
    } catch (error) {
      console.error('Failed to duplicate channel:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await authClient.api.delete(`/api/signage/${DEFAULT_SERVICE_KEY}/channels/${deleteTarget.id}`);
      setChannels(channels.filter((c) => c.id !== deleteTarget.id));
    } catch (error) {
      console.error('Failed to delete channel:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Toggle active status
  const handleToggleActive = async (channel: SignageChannel) => {
    try {
      await authClient.api.patch(`/api/signage/${DEFAULT_SERVICE_KEY}/channels/${channel.id}`, {
        isActive: !channel.isActive,
      });
      setChannels(channels.map((c) =>
        c.id === channel.id ? { ...c, isActive: !c.isActive } : c
      ));
    } catch (error) {
      console.error('Failed to toggle channel status:', error);
    }
  };

  // Open player URL
  const openPlayerUrl = (channel: SignageChannel) => {
    const playerUrl = `/signage/${DEFAULT_SERVICE_KEY}/channel/${channel.id}`;
    window.open(playerUrl, '_blank');
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
          <h1 className="text-2xl font-bold">Channels</h1>
          <p className="text-muted-foreground">
            Manage signage display channels
          </p>
        </div>
        <Button onClick={() => navigate('/digital-signage/v2/channels/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Channel
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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
        <Button variant="outline" size="icon" onClick={loadChannels}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Channels */}
      {filteredChannels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No channels found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first channel to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/digital-signage/v2/channels/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChannels.map((channel) => (
            <Card
              key={channel.id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/digital-signage/v2/channels/${channel.id}`)}
            >
              <CardContent className="p-0">
                {/* Preview */}
                <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <Monitor className="h-12 w-12 text-white/30" />
                  </div>
                  {/* Status indicators */}
                  <div className="absolute top-2 left-2 flex items-center gap-2">
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
                  </div>
                  {/* Overlay actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPlayerUrl(channel); }}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Player
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/digital-signage/v2/channels/${channel.id}`); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleActive(channel); }}>
                          {channel.isActive ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(channel); }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(channel); }}
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
                    <h3 className="font-medium truncate">{channel.name}</h3>
                    {!channel.isActive && (
                      <Badge variant="outline" className="text-xs ml-2">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                    {channel.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-mono">
                      {channel.code}
                    </Badge>
                    {channel.templateName && (
                      <span className="truncate">
                        {channel.templateName}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredChannels.map((channel) => (
            <Card
              key={channel.id}
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/digital-signage/v2/channels/${channel.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-20 h-12 rounded bg-gray-900 flex-shrink-0 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-white/30" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{channel.name}</h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {channel.code}
                    </Badge>
                    {channel.isOnline ? (
                      <Badge className="bg-green-500 text-white border-0 text-xs">Online</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Offline</Badge>
                    )}
                    {!channel.isActive && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {channel.description || 'No description'}
                  </p>
                </div>

                {/* Template/Playlist */}
                <div className="text-sm text-muted-foreground hidden md:block">
                  {channel.templateName || 'No template'}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPlayerUrl(channel); }}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Player
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/digital-signage/v2/channels/${channel.id}`); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleActive(channel); }}>
                      {channel.isActive ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(channel); }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(channel); }}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel</AlertDialogTitle>
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
