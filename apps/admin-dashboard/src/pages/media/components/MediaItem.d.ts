import React from 'react';
import { MediaFile } from '@/types/content';
interface MediaItemProps {
    item: MediaFile;
    view: 'grid' | 'list';
    isSelected: boolean;
    onSelect: () => void;
}
declare const MediaItem: React.FC<MediaItemProps>;
export default MediaItem;
//# sourceMappingURL=MediaItem.d.ts.map