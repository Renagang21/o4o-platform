import React from 'react';
import { MediaFile } from '@/types/content';
interface MediaListProps {
    files: MediaFile[];
    selectedFiles: string[];
    onFileSelect: (fileId: string) => void;
    onSelectAll: () => void;
}
declare const MediaList: React.FC<MediaListProps>;
export default MediaList;
//# sourceMappingURL=MediaList.d.ts.map