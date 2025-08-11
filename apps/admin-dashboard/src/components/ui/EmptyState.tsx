import { FC, ReactNode } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }> | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  className?: string;
  children?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children
}) => {
  return (
    <div className={cn("empty-state", className)}>
      {Icon && (
        <div className="empty-state-icon">
          {typeof Icon === 'function' ? (
            <Icon className="w-full h-full" />
          ) : (
            Icon
          )}
        </div>
      )}
      
      <h2 className="empty-state-title">{title}</h2>
      
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      
      {children}
      
      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && (
            <Button
              onClick={action.onClick}
              className={cn(
                action.variant === 'secondary' 
                  ? "empty-state-action-secondary" 
                  : "empty-state-action-primary"
              )}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              className="empty-state-action-secondary"
              variant="outline"
            >
              {secondaryAction.icon && <span className="mr-2">{secondaryAction.icon}</span>}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Pre-configured empty states for common scenarios
export const NoDataEmptyState: FC<{
  title?: string;
  description?: string;
  onAdd?: () => void;
}> = ({ 
  title = "데이터가 없습니다", 
  description = "아직 등록된 항목이 없습니다. 새로운 항목을 추가해보세요.",
  onAdd 
}) => {
  return (
    <EmptyState
      icon={() => (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
          />
        </svg>
      )}
      title={title}
      description={description}
      action={onAdd ? {
        label: "새로 추가",
        onClick: onAdd,
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )
      } : undefined}
    />
  );
};

export const SearchEmptyState: FC<{
  searchTerm?: string;
  onClear?: () => void;
}> = ({ searchTerm, onClear }) => {
  return (
    <EmptyState
      icon={() => (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      )}
      title="검색 결과가 없습니다"
      description={searchTerm ? `"${searchTerm}"에 대한 검색 결과를 찾을 수 없습니다.` : "다른 검색어를 시도해보세요."}
      action={onClear ? {
        label: "검색 초기화",
        onClick: onClear,
        variant: 'secondary'
      } : undefined}
    />
  );
};

export const ErrorEmptyState: FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
}> = ({ 
  title = "오류가 발생했습니다",
  description = "데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  onRetry 
}) => {
  return (
    <EmptyState
      icon={() => (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      )}
      title={title}
      description={description}
      action={onRetry ? {
        label: "다시 시도",
        onClick: onRetry,
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        )
      } : undefined}
    />
  );
};

export const LoadingState: FC<{
  title?: string;
  description?: string;
}> = ({ 
  title = "데이터를 불러오는 중...",
  description = "잠시만 기다려주세요." 
}) => {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <h3 className="mt-4 text-lg font-medium text-gray-700">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
};