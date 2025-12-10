/**
 * Loading Components
 *
 * 로딩 상태 표시 컴포넌트들
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white' | 'gray';
}

export function LoadingSpinner({
  size = 'md',
  color = 'blue',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    blue: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-600 border-t-transparent',
  };

  return (
    <div
      className={`
        inline-block rounded-full animate-spin
        ${sizeClasses[size]}
        ${colorClasses[color]}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

interface ButtonLoadingProps {
  className?: string;
}

export function ButtonLoading({ className = '' }: ButtonLoadingProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LoadingSpinner size="sm" color="white" />
    </div>
  );
}
