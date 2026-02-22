/**
 * HQ Content Manager
 *
 * Sprint 2-6: Global Content
 * Content creation and management interface for HQ operators
 *
 * Features:
 * - Create global playlists and media
 * - Manage forced items
 * - Track content distribution
 * - Analytics on download counts
 */

import { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Heart,
  Lock,
  Unlock,
  ListMusic,
  Image as ImageIcon,
  Search,
  Upload,
  BarChart3,
} from 'lucide-react';

// Types
interface HQPlaylist {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'draft';
  itemCount: number;
  totalDuration: number;
  likeCount: number;
  downloadCount: number;
  source: 'hq';
  scope: 'global';
  createdAt: string;
  updatedAt: string;
}

interface HQMedia {
  id: string;
  name: string;
  description: string | null;
  mediaType: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  fileSize: number | null;
  status: 'active' | 'inactive' | 'processing';
  source: 'hq';
  scope: 'global';
  createdAt: string;
}

interface ContentStats {
  totalPlaylists: number;
  totalMedia: number;
  totalDownloads: number;
  totalLikes: number;
  activeStores: number;
}

// Mock API functions
const fetchHQPlaylists = async (serviceKey: string) => {
  const response = await fetch(`/api/signage/${serviceKey}/global/playlists/hq`);
  if (!response.ok) throw new Error('Failed to fetch playlists');
  return response.json();
};

const fetchHQMedia = async (serviceKey: string) => {
  const response = await fetch(`/api/signage/${serviceKey}/global/media/hq`);
  if (!response.ok) throw new Error('Failed to fetch media');
  return response.json();
};

const createHQPlaylist = async (
  serviceKey: string,
  data: { name: string; description?: string; status?: string },
) => {
  const response = await fetch(`/api/signage/${serviceKey}/hq/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create playlist');
  return response.json();
};

const createHQMedia = async (
  serviceKey: string,
  data: {
    name: string;
    description?: string;
    mediaType: string;
    sourceType: string;
    sourceUrl: string;
  },
) => {
  const response = await fetch(`/api/signage/${serviceKey}/hq/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create media');
  return response.json();
};

const deleteHQPlaylist = async (serviceKey: string, playlistId: string) => {
  const response = await fetch(`/api/signage/${serviceKey}/playlists/${playlistId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete playlist');
};

// Format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format date
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Stats Card
const StatsCard = ({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

// Create Playlist Dialog
const CreatePlaylistDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; status: string }) => Promise<void>;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ name, description, status });
      setName('');
      setDescription('');
      setStatus('draft');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Global Playlist</DialogTitle>
          <DialogDescription>
            Create a new playlist that will be available to all stores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Playlist Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter playlist name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Playlist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Create Media Dialog
const CreateMediaDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    mediaType: string;
    sourceType: string;
    sourceUrl: string;
  }) => Promise<void>;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<string>('image');
  const [sourceType, setSourceType] = useState<string>('url');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !sourceUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ name, description, mediaType, sourceType, sourceUrl });
      setName('');
      setDescription('');
      setMediaType('image');
      setSourceType('url');
      setSourceUrl('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Global Media</DialogTitle>
          <DialogDescription>
            Add media that will be available to all stores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mediaName">Media Name</Label>
            <Input
              id="mediaName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter media name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mediaDescription">Description</Label>
            <Textarea
              id="mediaDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder={sourceType === 'youtube' ? 'YouTube URL or Video ID' : 'Enter media URL'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !sourceUrl.trim()}
          >
            {isSubmitting ? 'Adding...' : 'Add Media'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Playlist Table
const PlaylistTable = ({
  playlists,
  onEdit,
  onDelete,
  loading,
}: {
  playlists: HQPlaylist[];
  onEdit: (playlist: HQPlaylist) => void;
  onDelete: (playlist: HQPlaylist) => void;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No playlists created yet. Click &quot;Create Playlist&quot; to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-center">Items</TableHead>
          <TableHead className="text-center">Duration</TableHead>
          <TableHead className="text-center">Downloads</TableHead>
          <TableHead className="text-center">Likes</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {playlists.map((playlist) => (
          <TableRow key={playlist.id}>
            <TableCell>
              <div>
                <div className="font-medium">{playlist.name}</div>
                {playlist.description && (
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {playlist.description}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  playlist.status === 'active'
                    ? 'default'
                    : playlist.status === 'draft'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {playlist.status}
              </Badge>
            </TableCell>
            <TableCell className="text-center">{playlist.itemCount}</TableCell>
            <TableCell className="text-center">
              {formatDuration(playlist.totalDuration)}
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Download className="h-3 w-3" />
                {playlist.downloadCount}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Heart className="h-3 w-3" />
                {playlist.likeCount}
              </div>
            </TableCell>
            <TableCell>{formatDate(playlist.createdAt)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(playlist)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(playlist)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Media Grid
const MediaGrid = ({
  media,
  onDelete,
  loading,
}: {
  media: HQMedia[];
  onDelete: (media: HQMedia) => void;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-video" />
        ))}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No media uploaded yet. Click &quot;Add Media&quot; to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {media.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <div className="relative aspect-video bg-muted">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <Badge className="absolute top-2 right-2" variant="secondary">
              {item.mediaType}
            </Badge>
          </div>
          <CardContent className="p-3">
            <div className="font-medium text-sm line-clamp-1">{item.name}</div>
            <div className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Main Component
export default function HQContentManager() {
  const { serviceKey } = useParams<{ serviceKey: string }>();
  const { toast } = useToast();

  const [playlists, setPlaylists] = useState<HQPlaylist[]>([]);
  const [media, setMedia] = useState<HQMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [createMediaOpen, setCreateMediaOpen] = useState(false);

  // Stats (mock data for now)
  const stats: ContentStats = {
    totalPlaylists: playlists.length,
    totalMedia: media.length,
    totalDownloads: playlists.reduce((sum, p) => sum + p.downloadCount, 0),
    totalLikes: playlists.reduce((sum, p) => sum + p.likeCount, 0),
    activeStores: 15,
  };

  useEffect(() => {
    const loadContent = async () => {
      if (!serviceKey) return;
      setLoading(true);
      try {
        const [playlistsRes, mediaRes] = await Promise.all([
          fetchHQPlaylists(serviceKey),
          fetchHQMedia(serviceKey),
        ]);
        setPlaylists(playlistsRes.data || []);
        setMedia(mediaRes.data || []);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load content',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [serviceKey, toast]);

  const handleCreatePlaylist = async (data: {
    name: string;
    description: string;
    status: string;
  }) => {
    if (!serviceKey) return;
    const result = await createHQPlaylist(serviceKey, data);
    setPlaylists((prev) => [result.data, ...prev]);
    toast({
      title: 'Success',
      description: 'Playlist created successfully',
    });
  };

  const handleCreateMedia = async (data: {
    name: string;
    description: string;
    mediaType: string;
    sourceType: string;
    sourceUrl: string;
  }) => {
    if (!serviceKey) return;
    const result = await createHQMedia(serviceKey, data);
    setMedia((prev) => [result.data, ...prev]);
    toast({
      title: 'Success',
      description: 'Media added successfully',
    });
  };

  const handleDeletePlaylist = async (playlist: HQPlaylist) => {
    if (!serviceKey) return;
    if (!confirm(`Delete playlist "${playlist.name}"?`)) return;

    try {
      await deleteHQPlaylist(serviceKey, playlist.id);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
      toast({
        title: 'Success',
        description: 'Playlist deleted',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete playlist',
        variant: 'destructive',
      });
    }
  };

  if (!serviceKey) {
    return <div>Error: Service key not found</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HQ Content Manager</h1>
          <p className="text-muted-foreground">
            Create and manage global content for all stores
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Playlists"
          value={stats.totalPlaylists}
          icon={ListMusic}
          description="Global playlists"
        />
        <StatsCard
          title="Media Files"
          value={stats.totalMedia}
          icon={ImageIcon}
          description="Images & videos"
        />
        <StatsCard
          title="Downloads"
          value={stats.totalDownloads}
          icon={Download}
          description="Total downloads"
        />
        <StatsCard
          title="Likes"
          value={stats.totalLikes}
          icon={Heart}
          description="From stores"
        />
        <StatsCard
          title="Active Stores"
          value={stats.activeStores}
          icon={BarChart3}
          description="Using HQ content"
        />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="playlists">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
            <TabsTrigger value="media">Media Library</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-[200px]"
              />
            </div>
          </div>
        </div>

        <TabsContent value="playlists" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCreatePlaylistOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          </div>
          <PlaylistTable
            playlists={playlists.filter((p) =>
              p.name.toLowerCase().includes(search.toLowerCase())
            )}
            onEdit={(p) => {
              /* Navigate to editor */
            }}
            onDelete={handleDeletePlaylist}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="media" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCreateMediaOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Add Media
            </Button>
          </div>
          <MediaGrid
            media={media.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))}
            onDelete={() => {}}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreatePlaylistDialog
        open={createPlaylistOpen}
        onOpenChange={setCreatePlaylistOpen}
        onSubmit={handleCreatePlaylist}
      />
      <CreateMediaDialog
        open={createMediaOpen}
        onOpenChange={setCreateMediaOpen}
        onSubmit={handleCreateMedia}
      />
    </div>
  );
}
