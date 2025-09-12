import { useState, useCallback, FC, createElement } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Grid,
  List,
  Search,
  X,
  Trash2,
  Edit2,
  Eye,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  File,
  Folder,
  FolderOpen,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Media types
export interface MediaItem {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  uploadedAt: Date;
  uploadedBy: string;
  folderId?: string;
  tags?: string[];
  alt?: string;
  caption?: string;
  description?: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  itemCount: number;
}

interface MediaLibraryProps {
  mode?: 'library' | 'picker';
  onSelect?: (media: MediaItem[]) => void;
  multiple?: boolean;
  accept?: string;
  onClose?: () => void;
}

const MediaLibrary: FC<MediaLibraryProps> = ({
  mode = 'library',
  onSelect,
  multiple = false,
  accept,
  onClose
}) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Mock data
  const [mediaItems, setMediaItems] = useState([
    {
      id: '1',
      name: 'product-image-1.jpg',
      url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
      type: 'image' as const,
      mimeType: 'image/jpeg',
      size: 1024000,
      dimensions: { width: 1920, height: 1080 },
      uploadedAt: new Date('2024-01-15'),
      uploadedBy: 'Admin User',
      tags: ['product', 'headphones'],
      alt: 'Black headphones on yellow background'
    },
    {
      id: '2',
      name: 'banner-hero.png',
      url: 'https://images.unsplash.com/photo-1524634126442-357e0eac3c14?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1524634126442-357e0eac3c14?w=200',
      type: 'image',
      mimeType: 'image/png',
      size: 2048000,
      dimensions: { width: 2560, height: 1440 },
      uploadedAt: new Date('2024-01-10'),
      uploadedBy: 'Admin User',
      tags: ['banner', 'hero'],
      alt: 'Store banner image'
    },
  ]);

  const [folders] = useState([
    {
      id: 'folder-1',
      name: 'Products',
      createdAt: new Date('2024-01-01'),
      itemCount: 45
    },
    {
      id: 'folder-2',
      name: 'Banners',
      createdAt: new Date('2024-01-05'),
      itemCount: 12
    },
  ]);

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle file upload
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev: any) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Add new files to media items
          const newItems: MediaItem[] = acceptedFiles.map((file, index) => ({
            id: `new-${Date.now()}-${index}`,
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('video/') ? 'video' :
                  file.type.startsWith('audio/') ? 'audio' : 'document',
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date(),
            uploadedBy: 'Current User',
            folderId: currentFolder || undefined
          }));
          
          setMediaItems((prev: any) => [...newItems, ...prev]);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  }, [currentFolder]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple
  });

  // Filter items based on search and filters
  const filteredItems = mediaItems.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.alt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags?.some((tag: any) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesFolder = !currentFolder || item.folderId === currentFolder;
    
    return matchesSearch && matchesType && matchesFolder;
  });

  // Handle item selection
  const handleItemClick = (itemId: string) => {
    if (mode === 'picker') {
      if (multiple) {
        setSelectedItems((prev: any) => 
          prev.includes(itemId) 
            ? prev.filter((id: any) => id !== itemId)
            : [...prev, itemId]
        );
      } else {
        setSelectedItems([itemId]);
      }
    }
  };

  // Handle selection confirmation
  const handleSelectConfirm = () => {
    const selected = mediaItems.filter((item: any) => selectedItems.includes(item.id)) as MediaItem[];
    onSelect?.(selected);
    onClose?.();
  };

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Film;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return File;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Media Library</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          {mode === 'picker' && (
            <Button
              size={"sm" as const}
              onClick={handleSelectConfirm}
              disabled={selectedItems.length === 0}
            >
              Select {selectedItems.length > 0 && `(${selectedItems.length})`}
            </Button>
          )}
          {onClose && (
            <Button
              variant={"ghost" as const}
              size={"icon" as const}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size={"icon" as const}
            onClick={() => setView('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size={"icon" as const}
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Folders */}
        <div className="w-64 border-r p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">Folders</h3>
            <Button size={"icon" as const} variant={"ghost" as const} className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <button
              onClick={() => setCurrentFolder(null)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100',
                !currentFolder && 'bg-gray-100'
              )}
            >
              <Folder className="h-4 w-4" />
              <span>All Media</span>
              <span className="ml-auto text-xs text-gray-500">{mediaItems.length}</span>
            </button>
            
            {folders.map((folder: any) => (
              <button
                key={folder.id}
                onClick={() => setCurrentFolder(folder.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100',
                  currentFolder === folder.id && 'bg-gray-100'
                )}
              >
                {currentFolder === folder.id ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
                <span>{folder.name}</span>
                <span className="ml-auto text-xs text-gray-500">{folder.itemCount}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t">
            <h3 className="font-medium text-sm mb-4">Storage</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">2.5 GB</span>
              </div>
              <Progress value={25} className="h-2" />
              <p className="text-xs text-gray-500">2.5 GB of 10 GB used</p>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 p-4">
          {isUploading && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Uploading files...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <ScrollArea className="h-full">
            {view === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredItems.map((item: any) => {
                  const Icon = getFileIcon(item.type);
                  const isSelected = selectedItems.includes(item.id);
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={cn(
                        'group relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all',
                        isSelected 
                          ? 'border-blue-500 shadow-lg' 
                          : 'border-transparent hover:border-gray-300'
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square bg-gray-100 relative">
                        {item.type === 'image' && item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.alt || item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Selection checkbox */}
                        {mode === 'picker' && (
                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={isSelected}
                              className="bg-white"
                            />
                          </div>
                        )}
                        
                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size={"icon" as const}
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              // Preview
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size={"icon" as const}
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Info */}
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item: any) => {
                  const Icon = getFileIcon(item.type);
                  const isSelected = selectedItems.includes(item.id);
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all',
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      {mode === 'picker' && (
                        <Checkbox checked={isSelected} />
                      )}
                      
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        {item.type === 'image' && item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.alt || item.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Icon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatFileSize(item.size)}</span>
                          {item.dimensions && (
                            <span>{item.dimensions.width} × {item.dimensions.height}</span>
                          )}
                          <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size={"icon" as const}
                          variant={"ghost" as const}
                          className="h-8 w-8"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            setEditingItem(item);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size={"icon" as const}
                          variant={"ghost" as const}
                          className="h-8 w-8"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            // Delete
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Drag and drop files here or click to browse
            </DialogDescription>
          </DialogHeader>
          
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <Button variant={"outline" as const}>Select Files</Button>
          </div>
          
          <DialogFooter>
            <Button variant={"outline" as const} onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Media Details</DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                {editingItem.type === 'image' ? (
                  <img
                    src={editingItem.url}
                    alt={editingItem.alt || editingItem.name}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    {createElement(getFileIcon(editingItem.type), { className: 'h-24 w-24 text-gray-400' })}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>File name</Label>
                  <Input value={editingItem.name} className="mt-1" />
                </div>
                
                <div>
                  <Label>Alt text</Label>
                  <Input
                    value={editingItem.alt || ''}
                    placeholder="Describe this media"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Caption</Label>
                  <Input
                    value={editingItem.caption || ''}
                    placeholder="Add a caption"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <textarea
                    value={editingItem.description || ''}
                    placeholder="Add a description"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                    rows={3}
                  />
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">File info</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Type: {editingItem.mimeType}</p>
                    <p>Size: {formatFileSize(editingItem.size)}</p>
                    {editingItem.dimensions && (
                      <p>Dimensions: {editingItem.dimensions.width} × {editingItem.dimensions.height}</p>
                    )}
                    <p>Uploaded: {new Date(editingItem.uploadedAt).toLocaleString()}</p>
                    <p>Uploaded by: {editingItem.uploadedBy}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant={"outline" as const} onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowEditDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaLibrary;