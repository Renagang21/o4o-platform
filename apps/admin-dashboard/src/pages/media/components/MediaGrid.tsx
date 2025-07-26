import { useState, useEffect, useCallback, useMemo, useRef, Fragment, FC } from 'react'
import { MediaFile } from '@/types/content'
import MediaItem from './MediaItem'

interface MediaGridProps {
  files: MediaFile[]
  selectedFiles: string[]
  onFileSelect: (fileId: string) => void
  onSelectAll: () => void
}

const MediaGrid: FC<MediaGridProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll
}) => {
  const allSelected = files.length > 0 && files.every(file => selectedFiles.includes(file.id))

  return (
    <div className="p-6">
      {/* Select All Checkbox */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
          />
          {allSelected ? '모두 선택 해제' : '모두 선택'}
        </label>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => (
          <MediaItem
            key={file.id}
            item={file}
            view="grid"
            isSelected={selectedFiles.includes(file.id)}
            onSelect={() => onFileSelect(file.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {files.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          <p>선택된 조건에 맞는 파일이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

export default MediaGrid