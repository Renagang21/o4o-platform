import { User } from './User';
import { MediaFolder } from './MediaFolder';
export interface MediaSize {
    name: string;
    width: number;
    height: number;
    url: string;
    fileSize: number;
    mimeType: string;
}
export interface ImageFormats {
    webp: Record<string, MediaSize>;
    avif?: Record<string, MediaSize>;
    jpg: Record<string, MediaSize>;
}
export declare class MediaFile {
    id: string;
    filename: string;
    originalName: string;
    url: string;
    path: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
    sizes: Record<string, MediaSize>;
    formats: ImageFormats;
    altText: string;
    caption: string;
    description: string;
    folderId: string;
    folder: Promise<MediaFolder>;
    uploadedBy: string;
    uploader: User;
    metadata: Record<string, unknown>;
    downloads: number;
    lastAccessed: Date;
    uploadedAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=MediaFile.d.ts.map