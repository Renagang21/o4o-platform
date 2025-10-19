import { User } from './User';
export declare class Media {
    id: string;
    filename: string;
    originalFilename?: string;
    url: string;
    thumbnailUrl?: string;
    mimeType?: string;
    size?: number;
    width?: number;
    height?: number;
    altText?: string;
    caption?: string;
    description?: string;
    folderPath?: string;
    userId?: string;
    user?: User;
    variants?: {
        thumbnail?: string;
        small?: string;
        medium?: string;
        large?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Media.d.ts.map