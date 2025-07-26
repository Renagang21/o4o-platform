import { useState, useEffect, useCallback, useMemo, useRef, Fragment, FC } from 'react'
import { MediaFile } from '@/types/content'
import ResponsiveImage from './ResponsiveImage'
import { Image, Video, Music, FileText, File, Check } from 'lucide-react'

interface MediaItemProps {
  item: MediaFile
  view: 'grid' | 'list'
  isSelected: boolean
  onSelect: () => void
}

const MediaItem: FC<MediaItemProps> = ({
  item,
  view,
  isSelected,
  onSelect
}) => {
  const getFileIcon = () => {
    switch (item.type) {
      case 'image':
        return <Image className="w-8 h-8 text-blue-500" />
      case 'video':
        return <Video className="w-8 h-8 text-purple-500" />
      case 'audio':
        return <Music className="w-8 h-8 text-green-500" />
      case 'document':
        return <FileText className="w-8 h-8 text-orange-500" />
      default:
        return <File className="w-8 h-8 text-gray-500" />
    }
  }

  if (view === 'list') {
    return (
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
          {item.type === 'image' ? (
            <ResponsiveImage
              mediaId={item.id}
              alt={item.altText || item.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {getFileIcon()}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {item.name}
          </p>
          {item.altText && (
            <p className="text-xs text-gray-500 truncate">
              {item.altText}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Grid View
  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Selection Checkbox */}
      <div className={`absolute top-2 left-2 z-10 ${
        isSelected || 'group-hover:opacity-100 opacity-0'
      } transition-opacity`}>
        <div className={`w-6 h-6 rounded border-2 ${
          isSelected 
            ? 'bg-blue-500 border-blue-500' 
            : 'bg-white border-gray-300'
        } flex items-center justify-center`}>
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>

      {/* Media Preview */}
      <div className="aspect-square bg-gray-100">
        {item.type === 'image' ? (
          <ResponsiveImage
            mediaId={item.id}
            alt={item.altText || item.name}
            className="w-full h-full object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getFileIcon()}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="p-2 bg-white">
        <p className="text-xs font-medium text-gray-900 truncate">
          {item.name}
        </p>
        {item.altText && (
          <p className="text-xs text-gray-500 truncate mt-1">
            {item.altText}
          </p>
        )}
      </div>

      {/* Hover Overlay */}
      <div className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all pointer-events-none`} />
    </div>
  )
}

export default MediaItem