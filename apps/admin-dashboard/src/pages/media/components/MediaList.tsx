import { FC } from 'react';
import { MediaFile } from '@/types/content'
import MediaItem from './MediaItem'
import { formatFileSize } from '@/utils/format'

interface MediaListProps {
  files: MediaFile[]
  selectedFiles: string[]
  onFileSelect: (fileId: string) => void
  onSelectAll: () => void
}

const MediaList: FC<MediaListProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll
}) => {
  const allSelected = files.length > 0 && files.every(file => selectedFiles.includes(file.id))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              파일
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              유형
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              크기
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              크기(px)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              업로드
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              업로더
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file: any) => (
            <tr key={file.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.id)}
                  onChange={() => onFileSelect(file.id)}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
              </td>
              <td className="px-6 py-4">
                <MediaItem
                  item={file}
                  view="list"
                  isSelected={selectedFiles.includes(file.id)}
                  onSelect={() => onFileSelect(file.id)}
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {file.mimeType.split('/')[1]?.toUpperCase() || file.type}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {formatFileSize(file.size)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {file.dimensions ? (
                  <span>{file.dimensions.width} × {file.dimensions.height}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {formatDate(file.uploadedAt)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {file.uploadedBy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>선택된 조건에 맞는 파일이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

export default MediaList