import { MediaFile } from './MediaFile';
export declare class MediaFolder {
    id: string;
    name: string;
    slug: string;
    parentId: string;
    parent: MediaFolder;
    children: MediaFolder[];
    files: MediaFile[];
    fileCount: number;
    totalSize: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=MediaFolder.d.ts.map