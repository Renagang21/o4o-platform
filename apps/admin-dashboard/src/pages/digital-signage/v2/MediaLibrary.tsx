/**
 * MediaLibrary
 *
 * Sprint 2-5: Media library with upload
 * - Grid/List view toggle
 * - Filter by type/owner
 * - Presigned URL upload
 * - Media detail panel
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Upload,
  Grid,
  List,
  Search,
  Filter,
  Image,
  Film,
  FileText,
  Globe,
  Trash2,
  MoreVertical,
  Eye,
  Download,
  Copy,
  Clock,
  HardDrive,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  signageMediaApi,
  type SignageMedia,
  type SignageMediaType,
  type MediaOwnerType,
  type CreateMediaDto,
} from '@/lib/api/signageV2';

const MEDIA_TYPE_OPTIONS: { value: SignageMediaType | 'all'; label: string; icon: typeof Image }[] = [
  { value: 'all', label: 'All Types', icon: Grid },
  { value: 'image', label: 'Images', icon: Image },
  { value: 'video', label: 'Videos', icon: Film },
  { value: 'html', label: 'HTML', icon: Globe },
  { value: 'text', label: 'Text', icon: FileText },
];

const OWNER_TYPE_OPTIONS: { value: MediaOwnerType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'platform', label: 'Platform' },
  { value: 'organization', label: 'Organization' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'user', label: 'User' },
];

const MEDIA_TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  video: Film,
  html: Globe,
  text: FileText,
  youtube: Film,
  vimeo: Film,
  external: Globe,
};

type ViewMode = 'grid' | 'list';

export default function MediaLibrary() {
  const [media, setMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SignageMediaType | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<MediaOwnerType | 'all'>('all');

  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail panel
  const [selectedMedia, setSelectedMedia] = useState<SignageMedia | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<SignageMedia | null>(null);

  // Load media
  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: { mediaType?: SignageMediaType; ownerType?: MediaOwnerType } = {};
      if (typeFilter !== 'all') params.mediaType = typeFilter;
      if (ownerFilter !== 'all') params.ownerType = ownerFilter;

      const response = await signageMediaApi.list(undefined, { ...params, limit: 100 });

      if (response.success && response.data) {
        setMedia(response.data.items || []);
      } else {
        setError(response.error || 'Failed to load media');
      }
    } catch (err) {
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, ownerFilter]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // Filter media by search
  const filteredMedia = media.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadFile(file);
  };

  // Upload file
  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Get presigned URL
      const presignedRes = await signageMediaApi.getPresignedUrl({
        fileName: file.name,
        contentType: file.type,
        folder: 'media',
      });

      if (!presignedRes.success || !presignedRes.data) {
        throw new Error(presignedRes.error || 'Failed to get upload URL');
      }

      const { uploadUrl, fileUrl } = presignedRes.data;

      // Upload to presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      setUploadProgress(80);

      // Determine media type
      let mediaType: SignageMediaType = 'external';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type === 'text/html') mediaType = 'html';
      else if (file.type.startsWith('text/')) mediaType = 'text';

      // Create media record
      const createRes = await signageMediaApi.create({
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        mediaType,
        mimeType: file.type,
        url: fileUrl,
        fileSize: file.size,
        ownerType: 'platform',
      });

      if (!createRes.success) {
        throw new Error(createRes.error || 'Failed to create media record');
      }

      setUploadProgress(100);
      setUploadDialogOpen(false);
      loadMedia();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete media
  const handleDelete = async () => {
    if (!mediaToDelete) return;

    try {
      const response = await signageMediaApi.delete(mediaToDelete.id);
      if (response.success) {
        setMedia(prev => prev.filter(m => m.id !== mediaToDelete.id));
        setDeleteDialogOpen(false);
        setMediaToDelete(null);
        if (selectedMedia?.id === mediaToDelete.id) {
          setDetailOpen(false);
          setSelectedMedia(null);
        }
      } else {
        setError(response.error || 'Failed to delete media');
      }
    } catch (err) {
      setError('Failed to delete media');
    }
  };

  // Copy URL to clipboard
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">Manage your signage media assets</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Media
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEDIA_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ownerFilter} onValueChange={(v: any) => setOwnerFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OWNER_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Media Grid/List */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'aspect-square' : 'h-16 w-full'} />
          ))}
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12">
          <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No media found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try adjusting your search or filters' : 'Upload some media to get started'}
          </p>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMedia.map(item => {
            const MediaIcon = MEDIA_TYPE_ICONS[item.mediaType] || Image;

            return (
              <div
                key={item.id}
                className="group border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedMedia(item);
                  setDetailOpen(true);
                }}
              >
                <div className="aspect-square bg-muted flex items-center justify-center relative">
                  {item.thumbnailUrl || (item.mediaType === 'image' && item.url) ? (
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MediaIcon className="w-12 h-12 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" onClick={(e) => { e.stopPropagation(); setSelectedMedia(item); setDetailOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMediaToDelete(item);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.mediaType}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredMedia.map(item => {
            const MediaIcon = MEDIA_TYPE_ICONS[item.mediaType] || Image;

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedMedia(item);
                  setDetailOpen(true);
                }}
              >
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
                  {item.thumbnailUrl || (item.mediaType === 'image' && item.url) ? (
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MediaIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="capitalize">{item.mediaType}</span>
                    <span>{formatFileSize(item.fileSize)}</span>
                    {item.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{item.ownerType}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedMedia(item); setDetailOpen(true); }}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {item.url && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyUrl(item.url!); }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy URL
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); setMediaToDelete(item); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">
                Images, videos, and documents up to 100MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,text/html,.html"
              className="hidden"
              onChange={handleFileSelect}
            />

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {uploadError && (
              <Alert variant="destructive">
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Media Details</DialogTitle>
          </DialogHeader>

          {selectedMedia && (
            <div className="grid grid-cols-2 gap-6">
              <div className="aspect-video bg-muted rounded flex items-center justify-center overflow-hidden">
                {selectedMedia.thumbnailUrl || (selectedMedia.mediaType === 'image' && selectedMedia.url) ? (
                  <img
                    src={selectedMedia.thumbnailUrl || selectedMedia.url}
                    alt={selectedMedia.name}
                    className="w-full h-full object-contain"
                  />
                ) : selectedMedia.mediaType === 'video' && selectedMedia.url ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    className="w-full h-full"
                  />
                ) : (
                  <Image className="w-16 h-16 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedMedia.name}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="capitalize">{selectedMedia.mediaType}</p>
                </div>

                {selectedMedia.mimeType && (
                  <div>
                    <Label className="text-muted-foreground">MIME Type</Label>
                    <p>{selectedMedia.mimeType}</p>
                  </div>
                )}

                {selectedMedia.fileSize && (
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span>{formatFileSize(selectedMedia.fileSize)}</span>
                  </div>
                )}

                {selectedMedia.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDuration(selectedMedia.duration)}</span>
                  </div>
                )}

                {selectedMedia.width && selectedMedia.height && (
                  <div>
                    <Label className="text-muted-foreground">Dimensions</Label>
                    <p>{selectedMedia.width} × {selectedMedia.height}</p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Owner</Label>
                  <Badge variant="secondary" className="capitalize">{selectedMedia.ownerType}</Badge>
                </div>

                {selectedMedia.tags && selectedMedia.tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedMedia.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedMedia?.url && (
              <Button variant="outline" onClick={() => copyUrl(selectedMedia.url!)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy URL
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                setMediaToDelete(selectedMedia);
                setDeleteDialogOpen(true);
                setDetailOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete "{mediaToDelete?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
