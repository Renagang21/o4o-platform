import React, { useRef } from 'react';
import { Post } from '@/hooks/posts/usePostsData';

interface PostRowProps {
  post: Post;
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

export const PostRow: React.FC<PostRowProps> = ({
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
          </button>
          {hovered && (
            <div className="flex items-center gap-2 mt-1 text-xs">
              {post.status === 'trash' ? (
                <>
                  <button
                    onClick={onRestore}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Restore
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onPermanentDelete}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete Permanently
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onEdit}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onQuickEdit}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Quick Edit
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onDelete}
                    className="text-red-600 hover:text-red-800"
                  >
                    Trash
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={onView}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
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
      {visibleColumns.categories && (
        <td className="px-3 py-3 text-sm">
          {post.categories.map((cat, idx) => (
            <span key={idx}>
              <a href="#" className="text-blue-600 hover:text-blue-800">{cat}</a>
              {idx < post.categories.length - 1 && ', '}
            </span>
          ))}
          {post.categories.length === 0 && '—'}
        </td>
      )}
      {visibleColumns.tags && (
        <td className="px-3 py-3 text-sm">
          {post.tags.map((tag, idx) => (
            <span key={idx}>
              <a href="#" className="text-blue-600 hover:text-blue-800">{tag}</a>
              {idx < post.tags.length - 1 && ', '}
            </span>
          ))}
          {post.tags.length === 0 && '—'}
        </td>
      )}
      {visibleColumns.comments && (
        <td className="px-3 py-3 text-sm text-center">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            {post.comments}
          </div>
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
          {post.status === 'published' && (
            <span className="text-green-600">발행됨</span>
          )}
          {post.status === 'draft' && (
            <span className="text-orange-600">임시글</span>
          )}
          {post.status === 'pending' && (
            <span className="text-yellow-600">대기중</span>
          )}
          {post.status === 'trash' && (
            <span className="text-red-600">휴지통</span>
          )}
        </td>
      )}
    </tr>
  );
};