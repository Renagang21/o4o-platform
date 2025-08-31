import React, { useState, useEffect, useCallback } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';

interface LikeButtonProps {
  targetType: 'post' | 'comment';
  targetId: string;
  userId: string;
  initialLiked?: boolean;
  initialCount?: number;
  onToggle?: (liked: boolean, count: number) => void;
  variant?: 'heart' | 'thumb';
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  targetType,
  targetId,
  userId,
  initialLiked = false,
  initialCount = 0,
  onToggle,
  variant = 'heart',
  size = 'md',
  showCount = true,
  className = ''
}) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (userId) {
      checkLikeStatus();
    }
    fetchLikeCount();
  }, [targetId, userId]);

  const checkLikeStatus = useCallback(async () => {
    try {
      const endpoint = targetType === 'post' 
        ? `/api/forum/posts/${targetId}/likes/check`
        : `/api/forum/comments/${targetId}/likes/check`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setIsLiked(data.liked || false);
    } catch (error) {
      // Handle error silently
    }
  }, [targetType, targetId]);

  const fetchLikeCount = useCallback(async () => {
    try {
      const endpoint = targetType === 'post'
        ? `/api/forum/posts/${targetId}/likes/count`
        : `/api/forum/comments/${targetId}/likes/count`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      setLikeCount(data.count || 0);
    } catch (error) {
      // Handle error silently
    }
  }, [targetType, targetId]);

  const handleToggleLike = async () => {
    if (!userId) {
      alert('Please login to like content');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = targetType === 'post'
        ? `/api/forum/posts/${targetId}/likes`
        : `/api/forum/comments/${targetId}/likes`;
      
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const newLikedState = !isLiked;
        const newCount = newLikedState ? likeCount + 1 : Math.max(0, likeCount - 1);
        
        setIsLiked(newLikedState);
        setLikeCount(newCount);
        
        // Trigger animation
        if (newLikedState) {
          setShowAnimation(true);
          setTimeout(() => setShowAnimation(false), 600);
        }
        
        onToggle?.(newLikedState, newCount);
      }
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-2 text-lg'
  };

  const iconSize = {
    sm: 14,
    md: 18,
    lg: 22
  };

  const Icon = variant === 'heart' ? Heart : ThumbsUp;

  return (
    <button
      onClick={handleToggleLike}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        ${className}
        relative flex items-center gap-2
        transition-all duration-200
        rounded-full
        ${isLiked 
          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        group
      `}
    >
      <div className="relative">
        <Icon 
          size={iconSize[size]} 
          className={`
            transition-transform duration-200
            ${isLiked ? 'fill-current scale-110' : ''}
            ${showAnimation ? 'animate-bounce' : ''}
          `}
        />
        
        {/* Like animation effect */}
        {showAnimation && (
          <div className="absolute inset-0 pointer-events-none">
            <Icon
              size={iconSize[size]}
              className="absolute inset-0 text-red-500 fill-current animate-ping"
            />
          </div>
        )}
      </div>
      
      {showCount && (
        <span className={`
          font-medium transition-all duration-200
          ${isLiked ? 'text-red-600' : ''}
        `}>
          {likeCount > 0 ? likeCount.toLocaleString() : ''}
        </span>
      )}
      
      {/* Hover tooltip */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {isLiked ? 'Unlike' : 'Like'}
        </div>
      </div>
    </button>
  );
};

export default LikeButton;