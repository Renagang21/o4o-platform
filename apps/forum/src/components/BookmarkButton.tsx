import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark, Check } from 'lucide-react';

interface BookmarkButtonProps {
  postId: string;
  userId: string;
  initialBookmarked?: boolean;
  onToggle?: (bookmarked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  postId,
  userId,
  initialBookmarked = false,
  onToggle,
  size = 'md',
  showCount = false
}) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookmarkCount = useCallback(async () => {
    try {
      const response = await fetch(`/api/forum/posts/${postId}/bookmarks/count`);
      const data = await response.json();
      setBookmarkCount(data.count || 0);
    } catch (error) {
      // Handle error silently
    }
  }, [postId]);

  const checkBookmarkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/forum/posts/${postId}/bookmarks/check`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setIsBookmarked(data.bookmarked || false);
    } catch (error) {
      // Handle error silently
    }
  }, [postId]);

  useEffect(() => {
    if (showCount) {
      fetchBookmarkCount();
    }
    if (userId) {
      checkBookmarkStatus();
    }
  }, [postId, userId, showCount, fetchBookmarkCount, checkBookmarkStatus]);

  const handleToggleBookmark = async () => {
    if (!userId) {
      alert('Please login to bookmark posts');
      return;
    }

    setIsLoading(true);
    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/forum/posts/${postId}/bookmarks`, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const newBookmarkedState = !isBookmarked;
        setIsBookmarked(newBookmarkedState);
        
        if (showCount) {
          setBookmarkCount(prev => newBookmarkedState ? prev + 1 : Math.max(0, prev - 1));
        }
        
        onToggle?.(newBookmarkedState);
      }
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        flex items-center gap-1
        transition-all duration-200
        rounded-lg
        ${isBookmarked 
          ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {isBookmarked ? (
        <div className="relative">
          <Bookmark size={iconSize[size]} className="fill-current" />
          <Check size={iconSize[size] / 2} className="absolute top-0 left-0 text-white" />
        </div>
      ) : (
        <Bookmark size={iconSize[size]} />
      )}
      {showCount && bookmarkCount > 0 && (
        <span className="text-sm font-medium">{bookmarkCount}</span>
      )}
    </button>
  );
};

export default BookmarkButton;