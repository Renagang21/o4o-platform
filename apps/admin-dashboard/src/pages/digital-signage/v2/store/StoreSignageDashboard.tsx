/**
 * Store Signage Dashboard
 *
 * Sprint 2-6: Global Content
 * Main dashboard for store operators to browse and clone global content
 *
 * Features:
 * - 3-tab UI: HQ Content, Community, Supplier
 * - Clone playlists and media to store
 * - Preview global content before cloning
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
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import {
  Building2,
  Users,
  Truck,
  Search,
  Download,
  Heart,
  Play,
  Copy,
  Eye,
  Clock,
  ListMusic,
  Image as ImageIcon,
} from 'lucide-react';

// Types
interface GlobalPlaylist {
  id: string;
  name: string;
  description: string | null;
  source: 'hq' | 'supplier' | 'community';
  scope: 'global' | 'store';
  status: string;
  itemCount: number;
  totalDuration: number;
  likeCount: number;
  downloadCount: number;
  thumbnailUrl?: string;
  createdAt: string;
}

interface GlobalMedia {
  id: string;
  name: string;
  description: string | null;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  source: 'hq' | 'supplier' | 'community';
  scope: 'global' | 'store';
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Mock API functions - will be replaced with actual API calls
const fetchGlobalPlaylists = async (
  serviceKey: string,
  source?: string,
  page = 1,
  search?: string,
): Promise<PaginatedResponse<GlobalPlaylist>> => {
  // In production, this will call the actual API
  const baseUrl = `/api/signage/${serviceKey}/global/playlists`;
  const params = new URLSearchParams();
  if (source) params.append('source', source);
  params.append('page', page.toString());
  if (search) params.append('search', search);

  const response = await fetch(`${baseUrl}?${params}`);
  if (!response.ok) throw new Error('Failed to fetch playlists');
  return response.json();
};

const fetchGlobalMedia = async (
  serviceKey: string,
  source?: string,
  page = 1,
  search?: string,
): Promise<PaginatedResponse<GlobalMedia>> => {
  const baseUrl = `/api/signage/${serviceKey}/global/media`;
  const params = new URLSearchParams();
  if (source) params.append('source', source);
  params.append('page', page.toString());
  if (search) params.append('search', search);

  const response = await fetch(`${baseUrl}?${params}`);
  if (!response.ok) throw new Error('Failed to fetch media');
  return response.json();
};

const clonePlaylist = async (
  serviceKey: string,
  playlistId: string,
  options: { includeItems?: boolean; cloneMedia?: boolean },
) => {
  const response = await fetch(`/api/signage/${serviceKey}/playlists/${playlistId}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error('Failed to clone playlist');
  return response.json();
};

const cloneMedia = async (serviceKey: string, mediaId: string) => {
  const response = await fetch(`/api/signage/${serviceKey}/media/${mediaId}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error('Failed to clone media');
  return response.json();
};

// Format duration in minutes:seconds
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Playlist Card Component
const PlaylistCard = ({
  playlist,
  onClone,
  onPreview,
}: {
  playlist: GlobalPlaylist;
  onClone: (playlist: GlobalPlaylist) => void;
  onPreview: (playlist: GlobalPlaylist) => void;
}) => {
  const sourceIcon = {
    hq: <Building2 className="h-4 w-4" />,
    community: <Users className="h-4 w-4" />,
    supplier: <Truck className="h-4 w-4" />,
  };

  const sourceLabel = {
    hq: 'HQ',
    community: 'Community',
    supplier: 'Supplier',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{playlist.name}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {playlist.description || 'No description'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-2 shrink-0">
            {sourceIcon[playlist.source]}
            <span className="ml-1">{sourceLabel[playlist.source]}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ListMusic className="h-4 w-4" />
            <span>{playlist.itemCount} items</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(playlist.totalDuration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span>{playlist.likeCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>{playlist.downloadCount}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPreview(playlist)}>
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
        <Button size="sm" onClick={() => onClone(playlist)}>
          <Copy className="h-4 w-4 mr-1" />
          Clone to Store
        </Button>
      </CardFooter>
    </Card>
  );
};

// Media Card Component
const MediaCard = ({
  media,
  onClone,
  onPreview,
}: {
  media: GlobalMedia;
  onClone: (media: GlobalMedia) => void;
  onPreview: (media: GlobalMedia) => void;
}) => {
  const sourceIcon = {
    hq: <Building2 className="h-4 w-4" />,
    community: <Users className="h-4 w-4" />,
    supplier: <Truck className="h-4 w-4" />,
  };

  const mediaTypeIcon = {
    video: <Play className="h-4 w-4" />,
    image: <ImageIcon className="h-4 w-4" />,
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
        {media.thumbnailUrl ? (
          <img
            src={media.thumbnailUrl}
            alt={media.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {mediaTypeIcon[media.mediaType as keyof typeof mediaTypeIcon] || <ImageIcon className="h-8 w-8 text-muted-foreground" />}
          </div>
        )}
        <Badge className="absolute top-2 right-2" variant="secondary">
          {media.mediaType}
        </Badge>
        {media.duration && (
          <Badge className="absolute bottom-2 right-2" variant="secondary">
            {formatDuration(media.duration)}
          </Badge>
        )}
      </div>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm line-clamp-1">{media.name}</CardTitle>
      </CardHeader>
      <CardFooter className="pt-0 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onPreview(media)}>
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
        <Button size="sm" className="flex-1" onClick={() => onClone(media)}>
          <Copy className="h-4 w-4 mr-1" />
          Clone
        </Button>
      </CardFooter>
    </Card>
  );
};

// Clone Playlist Dialog
const ClonePlaylistDialog = ({
  playlist,
  open,
  onOpenChange,
  onClone,
}: {
  playlist: GlobalPlaylist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClone: (options: { includeItems: boolean; cloneMedia: boolean }) => void;
}) => {
  const [includeItems, setIncludeItems] = useState(true);
  const [cloneMediaOption, setCloneMediaOption] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const handleClone = async () => {
    setIsCloning(true);
    try {
      await onClone({ includeItems, cloneMedia: cloneMediaOption });
    } finally {
      setIsCloning(false);
    }
  };

  if (!playlist) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Playlist</DialogTitle>
          <DialogDescription>
            Clone &quot;{playlist.name}&quot; to your store. Choose what to include.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeItems"
              checked={includeItems}
              onCheckedChange={(checked) => setIncludeItems(checked as boolean)}
            />
            <Label htmlFor="includeItems">Include playlist items ({playlist.itemCount} items)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cloneMedia"
              checked={cloneMediaOption}
              onCheckedChange={(checked) => setCloneMediaOption(checked as boolean)}
              disabled={!includeItems}
            />
            <Label htmlFor="cloneMedia" className={!includeItems ? 'text-muted-foreground' : ''}>
              Clone media files (creates copies, not references)
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            {cloneMediaOption
              ? 'Media files will be copied to your store. You can edit them independently.'
              : 'Media files will be referenced. Changes to original will reflect in your playlist.'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={isCloning}>
            {isCloning ? 'Cloning...' : 'Clone to Store'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Content Tab Component
const ContentTab = ({
  source,
  serviceKey,
  contentType,
}: {
  source: 'hq' | 'supplier' | 'community';
  serviceKey: string;
  contentType: 'playlists' | 'media';
}) => {
  const [playlists, setPlaylists] = useState<GlobalPlaylist[]>([]);
  const [media, setMedia] = useState<GlobalMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPlaylist, setSelectedPlaylist] = useState<GlobalPlaylist | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        if (contentType === 'playlists') {
          const result = await fetchGlobalPlaylists(serviceKey, source, page, search);
          setPlaylists(result.data);
          setTotalPages(result.meta.totalPages);
        } else {
          const result = await fetchGlobalMedia(serviceKey, source, page, search);
          setMedia(result.data);
          setTotalPages(result.meta.totalPages);
        }
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
  }, [serviceKey, source, page, search, contentType, toast]);

  const handleClonePlaylist = async (options: { includeItems: boolean; cloneMedia: boolean }) => {
    if (!selectedPlaylist) return;

    try {
      await clonePlaylist(serviceKey, selectedPlaylist.id, options);
      toast({
        title: 'Success',
        description: `Playlist "${selectedPlaylist.name}" cloned to your store`,
      });
      setCloneDialogOpen(false);
      setSelectedPlaylist(null);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to clone playlist',
        variant: 'destructive',
      });
    }
  };

  const handleCloneMedia = async (mediaItem: GlobalMedia) => {
    try {
      await cloneMedia(serviceKey, mediaItem.id);
      toast({
        title: 'Success',
        description: `Media "${mediaItem.name}" cloned to your store`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to clone media',
        variant: 'destructive',
      });
    }
  };

  const handlePreviewPlaylist = (playlist: GlobalPlaylist) => {
    // Open preview modal or navigate to preview page
    toast({
      title: 'Preview',
      description: `Previewing "${playlist.name}"`,
    });
  };

  const handlePreviewMedia = (mediaItem: GlobalMedia) => {
    // Open media preview
    window.open(mediaItem.sourceUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content Grid */}
      {contentType === 'playlists' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No playlists available from this source
            </div>
          ) : (
            playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onClone={(p) => {
                  setSelectedPlaylist(p);
                  setCloneDialogOpen(true);
                }}
                onPreview={handlePreviewPlaylist}
              />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No media available from this source
            </div>
          ) : (
            media.map((m) => (
              <MediaCard
                key={m.id}
                media={m}
                onClone={handleCloneMedia}
                onPreview={handlePreviewMedia}
              />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Clone Dialog */}
      <ClonePlaylistDialog
        playlist={selectedPlaylist}
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        onClone={handleClonePlaylist}
      />
    </div>
  );
};

// Main Component
export default function StoreSignageDashboard() {
  const { serviceKey } = useParams<{ serviceKey: string }>();
  const [activeSource, setActiveSource] = useState<'hq' | 'community' | 'supplier'>('hq');
  const [contentType, setContentType] = useState<'playlists' | 'media'>('playlists');

  if (!serviceKey) {
    return <div>Error: Service key not found</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Signage Content Library</h1>
          <p className="text-muted-foreground">
            Browse and clone content from HQ, community, and suppliers
          </p>
        </div>
        <Select value={contentType} onValueChange={(v) => setContentType(v as 'playlists' | 'media')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="playlists">Playlists</SelectItem>
            <SelectItem value="media">Media</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeSource} onValueChange={(v) => setActiveSource(v as typeof activeSource)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="hq" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            HQ Content
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Community
          </TabsTrigger>
          <TabsTrigger value="supplier" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Supplier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hq" className="mt-6">
          <ContentTab source="hq" serviceKey={serviceKey} contentType={contentType} />
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <ContentTab source="community" serviceKey={serviceKey} contentType={contentType} />
        </TabsContent>

        <TabsContent value="supplier" className="mt-6">
          <ContentTab source="supplier" serviceKey={serviceKey} contentType={contentType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
