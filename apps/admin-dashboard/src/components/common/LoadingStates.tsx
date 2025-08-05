/**
 * Enhanced Loading States Component
 * Provides better UX during loading with skeletons and progress indicators
 */

import { FC } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';

interface LoadingStateProps {
  isLoading?: boolean;
  error?: string | null;
  progress?: number;
  message?: string;
  type?: 'spinner' | 'skeleton' | 'progress' | 'dots';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: FC<LoadingStateProps> = ({
  isLoading = true,
  error,
  progress,
  message,
  type = 'spinner',
  size = 'md'
}) => {
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!isLoading) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  if (type === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>
    );
  }

  if (type === 'progress' && progress !== undefined) {
    return (
      <div className="w-full max-w-md mx-auto py-8">
        <Progress value={progress} className="mb-2" />
        <p className="text-center text-sm text-gray-600">
          {message || `Loading... ${Math.round(progress)}%`}
        </p>
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        {message && <p className="ml-3 text-sm text-gray-600">{message}</p>}
      </div>
    );
  }

  // Skeleton type
  return (
    <div className="space-y-3 py-4">
      {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

interface BlockSkeletonProps {
  count?: number;
}

export const BlockSkeleton: FC<BlockSkeletonProps> = ({ count = 1 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface EditorSkeletonProps {
  showSidebar?: boolean;
}

export const EditorSkeleton: FC<EditorSkeletonProps> = ({ showSidebar = true }) => {
  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex items-center gap-2 p-2 border rounded">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>

      {showSidebar && (
        <div className="w-80 border-l p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </div>
  );
};

interface SaveIndicatorProps {
  isSaving: boolean;
  lastSavedAt?: Date | null;
  hasError?: boolean;
}

export const SaveIndicator: FC<SaveIndicatorProps> = ({
  isSaving,
  lastSavedAt,
  hasError
}) => {
  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-3 w-3" />
        <span>Save failed</span>
      </div>
    );
  }

  if (lastSavedAt) {
    const timeAgo = getTimeAgo(lastSavedAt);
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-3 w-3" />
        <span>Saved {timeAgo}</span>
      </div>
    );
  }

  return null;
};

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default LoadingState;