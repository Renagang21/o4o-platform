import React from 'react';
import { MediaFile } from '@/types/content';
interface MediaSelectorProps {
    multiple?: boolean;
    allowedTypes?: string[];
    onSelect: (files: MediaFile[]) => void;
    onClose: () => void;
    maxFiles?: number;
    initialSelection?: string[];
}
declare const MediaSelector: React.FC<MediaSelectorProps>;
export default MediaSelector;
//# sourceMappingURL=MediaSelector.d.ts.map