import React from 'react';
interface MediaUploaderProps {
    onUpload: (files: File[]) => Promise<void>;
    onClose: () => void;
    currentFolder?: string;
    maxFiles?: number;
    maxFileSize?: number;
    allowedTypes?: string[];
}
declare const MediaUploader: React.FC<MediaUploaderProps>;
export default MediaUploader;
//# sourceMappingURL=MediaUploader.d.ts.map