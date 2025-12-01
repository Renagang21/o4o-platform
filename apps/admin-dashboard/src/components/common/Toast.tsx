import { FC, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 3000,
  onClose
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          text: 'text-green-800'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          text: 'text-red-800'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          text: 'text-yellow-800'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: <Info className="w-5 h-5 text-blue-600" />,
          text: 'text-blue-800'
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border ${config.bg} ${config.border} animate-slide-in-right`}
      role="alert"
    >
      {config.icon}
      <p className={`flex-1 text-sm font-medium ${config.text}`}>{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
};

export default Toast;
