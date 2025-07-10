import React from 'react';
import { MediaFile } from '@/types/content';
interface MediaGridProps {
    files: MediaFile[];
    selectedFiles: string[];
    onFileSelect: (fileId: string) => void;
    onSelectAll: () => void;
}
declare const MediaGrid: React.FC<MediaGridProps>;
export default MediaGrid;
//# sourceMappingURL=MediaGrid.d.ts.map