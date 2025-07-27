import { FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type AlertType = 'success' | 'error' | 'warning' | 'info';
export type AlertVariant = 'filled' | 'outlined' | 'soft';

interface AlertProps {
  type?: AlertType;
  variant?: AlertVariant;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  onClose?: () => void;
  action?: ReactNode;
}

const Alert: FC<AlertProps> = ({
  type = 'info',
  variant = 'soft',
  title,
  children,
  className,
  icon,
  onClose,
  action,
}) => {
  const typeStyles = {
    success: {
      filled: 'bg-green-500 text-white',
      outlined: 'border-green-500 text-green-500',
      soft: 'bg-green-50 text-green-800',
    },
    error: {
      filled: 'bg-red-500 text-white',
      outlined: 'border-red-500 text-red-500',
      soft: 'bg-red-50 text-red-800',
    },
    warning: {
      filled: 'bg-yellow-500 text-white',
      outlined: 'border-yellow-500 text-yellow-500',
      soft: 'bg-yellow-50 text-yellow-800',
    },
    info: {
      filled: 'bg-blue-500 text-white',
      outlined: 'border-blue-500 text-blue-500',
      soft: 'bg-blue-50 text-blue-800',
    },
  };

  const defaultIcons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <div
      className={twMerge(
        'rounded-lg p-4',
        variant === 'outlined' ? 'border' : '',
        typeStyles[type][variant],
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {icon || defaultIcons[type]}
        </div>
        <div className="ml-3 w-full">
          {title && (
            <h5 className="text-sm font-medium mb-1">{title}</h5>
          )}
          <div className="text-sm">{children}</div>
        </div>
        {(onClose || action) && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              {action}
              {onClose && (
                <button
                  type="button"
                  className={twMerge(
                    'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    variant === 'filled'
                      ? 'text-white hover:bg-white/20 focus:ring-white'
                      : 'hover:bg-gray-100 focus:ring-gray-400'
                  )}
                  onClick={onClose}
                >
                  <span className="sr-only">닫기</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert; 