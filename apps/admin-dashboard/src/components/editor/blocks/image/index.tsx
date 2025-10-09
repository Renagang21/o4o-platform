/**
 * EnhancedImageBlock Component (Refactored)
 * 컴포넌트 분리를 통해 코드 관리성 향상
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import EnhancedBlockWrapper from '../EnhancedBlockWrapper';
import FileSelector, { FileItem } from '../shared/FileSelector';
import ImageUploader from './ImageUploader';
import ImageDisplay from './ImageDisplay';
import ImageToolbar from './ImageToolbar';
import ImageSidebar from './ImageSidebar';
import { useImageUpload } from './useImageUpload';

interface EnhancedImageBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    url?: string;
    alt?: string;
    caption?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    size?: 'thumbnail' | 'medium' | 'large' | 'full';
    linkTo?: 'none' | 'media' | 'custom';
    linkUrl?: string;
    width?: number;
    height?: number;
    mediaId?: string;
    dynamicSource?: {
      image?: string;
      caption?: string;
      alt?: string;
      link?: string;
    };
    useDynamicSource?: boolean;
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

const EnhancedImageBlock: React.FC<EnhancedImageBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const {
    url = '',
    alt = '',
    caption = '',
    align = 'left',
    size = 'large',
    linkTo = 'none',
    linkUrl = '',
    width,
    height,
    dynamicSource = {},
    useDynamicSource = false
  } = attributes;

  const [localCaption, setLocalCaption] = useState(caption);
  const [localAlt, setLocalAlt] = useState(alt);
  const [localLinkUrl, setLocalLinkUrl] = useState(linkUrl);
  const [showMediaSelector, setShowMediaSelector] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Sync with external changes
  useEffect(() => {
    setLocalCaption(caption);
    setLocalAlt(alt);
    setLocalLinkUrl(linkUrl);
  }, [caption, alt, linkUrl]);

  // Update attributes helper
  const updateAttribute = useCallback((key: string, value: any) => {
    const newContent = url || content;
    onChange(newContent, { ...attributes, [key]: value });
  }, [attributes, content, url, onChange]);

  // Handle upload complete
  const handleUploadComplete = useCallback((result: {
    url: string;
    id: string;
    width: number;
    height: number;
    alt: string;
  }) => {
    onChange(result.url, {
      ...attributes,
      url: result.url,
      alt: result.alt,
      mediaId: result.id,
      width: result.width,
      height: result.height
    });
  }, [attributes, onChange]);

  // Use image upload hook
  const {
    isUploading,
    uploadProgress,
    isDragOver,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  } = useImageUpload(handleUploadComplete);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle media library selection
  const handleMediaSelect = useCallback((file: FileItem | FileItem[]) => {
    const selectedFile = Array.isArray(file) ? file[0] : file;
    if (selectedFile) {
      onChange(selectedFile.url, {
        ...attributes,
        url: selectedFile.url,
        alt: selectedFile.alt || selectedFile.title,
        mediaId: selectedFile.id,
        width: selectedFile.width,
        height: selectedFile.height
      });
      setShowMediaSelector(false);
    }
  }, [attributes, onChange]);

  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    updateAttribute('align', newAlign);
  };

  // Handle caption change
  const handleCaptionChange = (newCaption: string) => {
    setLocalCaption(newCaption);
    updateAttribute('caption', newCaption);
  };

  // Handle alt text change
  const handleAltChange = (newAlt: string) => {
    setLocalAlt(newAlt);
    updateAttribute('alt', newAlt);
  };

  // Handle link change
  const handleLinkChange = (newLink: string) => {
    setLocalLinkUrl(newLink);
    updateAttribute('linkUrl', newLink);
    updateAttribute('linkTo', newLink ? 'custom' : 'none');
  };

  // Handle replace image
  const handleReplaceImage = () => {
    fileInputRef.current?.click();
  };

  // Handle image deletion
  const handleDeleteImage = () => {
    onChange('', {
      ...attributes,
      url: '',
      alt: '',
      caption: '',
      mediaId: undefined,
      width: undefined,
      height: undefined
    });
  };

  // Handle image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    if (!width || !height) {
      updateAttribute('width', img.naturalWidth);
      updateAttribute('height', img.naturalHeight);
    }
  };

  // Custom toolbar content
  const customToolbarContent = isSelected && url ? (
    <ImageToolbar
      linkTo={linkTo}
      onReplace={handleReplaceImage}
      onToggleLink={() => updateAttribute('linkTo', linkTo === 'media' ? 'none' : 'media')}
      onDelete={handleDeleteImage}
    />
  ) : null;

  // Custom sidebar content
  const customSidebarContent = isSelected ? (
    <ImageSidebar
      useDynamicSource={useDynamicSource}
      dynamicSource={dynamicSource}
      alt={localAlt}
      caption={localCaption}
      linkUrl={localLinkUrl}
      width={width}
      height={height}
      onToggleDynamicSource={() => updateAttribute('useDynamicSource', !useDynamicSource)}
      onDynamicSourceChange={(key, value) =>
        updateAttribute('dynamicSource', { ...dynamicSource, [key]: value })
      }
      onAltChange={handleAltChange}
      onCaptionChange={handleCaptionChange}
      onLinkChange={handleLinkChange}
      onDimensionChange={(dimension, value) => updateAttribute(dimension, value)}
    />
  ) : null;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="image"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onAlignChange={handleAlignChange}
      currentAlign={align}
      onChangeType={onChangeType}
      currentType="core/image"
      customToolbarContent={customToolbarContent}
      customSidebarContent={customSidebarContent}
    >
      {!url ? (
        <ImageUploader
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isDragOver={isDragOver}
          dropZoneRef={dropZoneRef}
          fileInputRef={fileInputRef}
          onDragEnter={handleDragEnter}
          onDragLeave={(e) => handleDragLeave(e, dropZoneRef)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          onMediaLibraryOpen={() => setShowMediaSelector(true)}
        />
      ) : (
        <ImageDisplay
          url={url}
          alt={localAlt}
          caption={localCaption}
          linkTo={linkTo}
          linkUrl={localLinkUrl}
          width={width}
          height={height}
          size={size}
          align={align}
          isSelected={isSelected}
          onImageLoad={handleImageLoad}
          onCaptionChange={handleCaptionChange}
          onAddBlock={onAddBlock}
        />
      )}

      {/* Media Library Selector */}
      {showMediaSelector && (
        <FileSelector
          isOpen={showMediaSelector}
          onClose={() => setShowMediaSelector(false)}
          onSelect={handleMediaSelect}
          multiple={false}
          acceptedTypes={['image']}
          acceptedMimeTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
          title="Select Image"
        />
      )}
    </EnhancedBlockWrapper>
  );
};

export default EnhancedImageBlock;
