/**
 * PlaylistList
 *
 * Sprint 2-5: Playlist management page
 * - List all playlists with filters
 * - Quick actions (edit, duplicate, delete)
 * - Link to playlist editor
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  Clock,
  Layers,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { playlistApi, type SignagePlaylist } from '@/lib/api/signageV2';

export default function PlaylistList() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<SignagePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; playlist: SignagePlaylist | null }>({
    open: false,
    playlist: null,
  });

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
      const response = await playlistApi.list(undefined, { isActive });

      if (response.success && response.data) {
        setPlaylists(response.data.items || []);
      } else {
        setError(response.error || 'Failed to load playlists');
      }
    } catch (err) {
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleDelete = async () => {
    if (!deleteDialog.playlist) return;

    try {
      const response = await playlistApi.delete(deleteDialog.playlist.id);
      if (response.success) {
        setPlaylists(prev => prev.filter(p => p.id !== deleteDialog.playlist!.id));
        setDeleteDialog({ open: false, playlist: null });
      } else {
        setError(response.error || 'Failed to delete playlist');
      }
    } catch (err) {
      setError('Failed to delete playlist');
    }
  };

  const handleDuplicate = async (playlist: SignagePlaylist) => {
    try {
      const response = await playlistApi.create({
        name: `${playlist.name} (Copy)`,
        description: playlist.description,
        defaultDuration: playlist.defaultDuration,
        defaultTransition: playlist.defaultTransition,
        isLoop: playlist.isLoop,
        tags: playlist.tags,
      });

      if (response.success && response.data) {
        // Copy items if original has items
        if (playlist.items && playlist.items.length > 0) {
          for (const item of playlist.items) {
            await playlistApi.addItem(response.data.id, {
              mediaId: item.mediaId,
              displayOrder: item.displayOrder,
              displayDuration: item.displayDuration,
              transitionEffect: item.transitionEffect,
              transitionDuration: item.transitionDuration,
              isForced: item.isForced,
              settings: item.settings,
            });
          }
        }
        fetchPlaylists();
      } else {
        setError(response.error || 'Failed to duplicate playlist');
      }
    } catch (err) {
      setError('Failed to duplicate playlist');
    }
  };

  const filteredPlaylists = playlists.filter(playlist => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      playlist.name.toLowerCase().includes(query) ||
      playlist.description?.toLowerCase().includes(query) ||
      playlist.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Playlists</h1>
          <p className="text-muted-foreground">Manage signage content playlists</p>
        </div>
        <Button onClick={() => navigate('/admin/digital-signage/v2/playlists/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Playlist
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Playlist Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No playlists found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try adjusting your search or filters' : 'Create your first playlist to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate('/admin/digital-signage/v2/playlists/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaylists.map(playlist => (
            <div
              key={playlist.id}
              className="border rounded-lg p-4 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <Link
                  to={`/admin/digital-signage/v2/playlists/${playlist.id}`}
                  className="font-medium hover:underline"
                >
                  {playlist.name}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/admin/digital-signage/v2/playlists/${playlist.id}`)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(playlist)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteDialog({ open: true, playlist })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {playlist.description || 'No description'}
              </p>

              <div className="flex items-center gap-2 mb-3">
                <Badge variant={playlist.isActive ? 'default' : 'secondary'}>
                  {playlist.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {playlist.isLoop && (
                  <Badge variant="outline">Loop</Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  <span>{playlist.itemCount || 0} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(playlist.totalDuration || 0)}</span>
                </div>
              </div>

              {playlist.tags && playlist.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {playlist.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {playlist.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{playlist.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, playlist: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Playlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.playlist?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, playlist: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
