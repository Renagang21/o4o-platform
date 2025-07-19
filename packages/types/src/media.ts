// Media Library types

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

export interface MediaItem {
  id: string;
  title: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  mediaType: MediaType;
  size: number; // bytes
  width?: number; // for images/videos
  height?: number; // for images/videos
  duration?: number; // for video/audio in seconds
  alt?: string;
  caption?: string;
  description?: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: {
    camera?: string;
    lens?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    focalLength?: string;
    orientation?: number;
    [key: string]: any;
  };
  tags?: string[];
  folderId?: string;
  attachedTo?: Array<{
    postType: string;
    postId: string;
    postTitle: string;
  }>;
  variations?: {
    thumbnail?: MediaVariation;
    medium?: MediaVariation;
    large?: MediaVariation;
    [key: string]: MediaVariation | undefined;
  };
  status: 'processing' | 'ready' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaVariation {
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface MediaFolder {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  color?: string;
  icon?: string;
  mediaCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaUploadOptions {
  folder?: string;
  generateThumbnails?: boolean;
  optimizeImages?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // bytes
  metadata?: Record<string, any>;
}

export interface MediaFilter {
  search?: string;
  mediaType?: MediaType | 'all';
  folderId?: string | 'uncategorized';
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minSize?: number;
  maxSize?: number;
  tags?: string[];
  attachedTo?: string;
  status?: 'processing' | 'ready' | 'failed' | 'all';
}

export interface MediaBulkAction {
  action: 'delete' | 'move' | 'download' | 'tag' | 'untag';
  mediaIds: string[];
  targetFolderId?: string; // for move
  tags?: string[]; // for tag/untag
}

export interface MediaSettings {
  defaultFolder?: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  thumbnailSizes: {
    thumbnail: { width: number; height: number; crop: boolean };
    medium: { width: number; height: number; crop: boolean };
    large: { width: number; height: number; crop: boolean };
    [key: string]: { width: number; height: number; crop: boolean };
  };
  acceptedImageTypes: string[];
  acceptedVideoTypes: string[];
  acceptedAudioTypes: string[];
  acceptedDocumentTypes: string[];
  maxUploadSize: number; // bytes
  enableFolders: boolean;
  enableTags: boolean;
  enableAltText: boolean;
}

// API Response types
export interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  folders: MediaFolder[];
}

export interface MediaUploadResponse {
  success: boolean;
  media: MediaItem;
  message?: string;
  errors?: string[];
}

export interface MediaEditDto {
  title?: string;
  alt?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  folderId?: string | null;
}

export interface CreateMediaFolderDto {
  name: string;
  parentId?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateMediaFolderDto extends Partial<CreateMediaFolderDto> {
  id: string;
}