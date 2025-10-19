import React, { useRef } from 'react';
import { CPTPost } from '@/hooks/cpt/useCPTData';

interface CPTRowProps {
  post: CPTPost;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
  onEdit: () => void;
  onQuickEdit: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  onView: () => void;
  visibleColumns: Record<string, boolean>;
}

export const CPTRow: React.FC<CPTRowProps> = ({
  post,
  selected,
  hovered,
  onSelect,
  onHover,
  onEdit,
  onQuickEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onView,
  visibleColumns
}) => {
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50"
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
          onHover(post.id);
        }, 300);
      }}
      onMouseLeave={() => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        onHover(null);
      }}
    >
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
        />
      </td>
      <td className="px-3 py-3">
        <div>
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left"
          >
            {post.title}
            {post.status === 'draft' && <span className="ml-2 text-gray-500">— 임시글</span>}
            {post.status === 'private' && <span className="ml-2 text-gray-500">— 비공개</span>}
          </button>
          {hovered && (
            <div className="flex items-center gap-2 mt-1 text-xs">
              {post.status === 'trash' ? (
                <>
                  <button
                    onClick={onRestore}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    복원
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onPermanentDelete}
                    className="text-red-600 hover:text-red-800"
                  >
                    영구 삭제
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onEdit}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    편집
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onQuickEdit}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    빠른 편집
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onDelete}
                    className="text-red-600 hover:text-red-800"
                  >
                    휴지통
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onView}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    보기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </td>
      {visibleColumns.author && (
        <td className="px-3 py-3 text-sm text-gray-600">
          {post.author || 'Unknown'}
        </td>
      )}
      {visibleColumns.date && (
        <td className="px-3 py-3 text-sm text-gray-600">
          <div>발행됨</div>
          <div>{post.date}</div>
        </td>
      )}
      {visibleColumns.status && (
        <td className="px-3 py-3 text-sm">
          {post.status === 'publish' && (
            <span className="text-green-600">발행됨</span>
          )}
          {post.status === 'draft' && (
            <span className="text-orange-600">임시글</span>
          )}
          {post.status === 'private' && (
            <span className="text-purple-600">비공개</span>
          )}
          {post.status === 'trash' && (
            <span className="text-red-600">휴지통</span>
          )}
        </td>
      )}
    </tr>
  );
};
