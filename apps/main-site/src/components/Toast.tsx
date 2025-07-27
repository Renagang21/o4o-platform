import { FC } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import useToast from '../hooks/useToast';

const toastStyles = {
  success: 'bg-green-100 text-green-800 border-green-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const toastIcons = {
  success: <CheckCircle className="w-5 h-5 mr-2 text-green-500" />,
  error: <XCircle className="w-5 h-5 mr-2 text-red-500" />,
  info: <Info className="w-5 h-5 mr-2 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />,
};

const Toast: FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 max-w-xs w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center border-l-4 p-4 rounded shadow ${toastStyles[toast.type]}`}
            role="alert"
          >
            {toastIcons[toast.type]}
            <span className="flex-1 text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 rounded hover:bg-black/10 focus:outline-none"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast; 