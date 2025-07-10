/**
 * Action Button Component
 * 개별 빠른 액션 버튼
 */


import { ExternalLink, Clock } from 'lucide-react';

interface ActionButtonProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'indigo' | 'gray' | 'yellow';
  href: string;
  badge?: number | null;
  disabled?: boolean;
  highlight?: boolean;
  tooltip?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  id: _id,
  title,
  description,
  icon,
  color,
  href,
  badge,
  disabled = false,
  highlight = false,
  tooltip
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      hover: 'hover:bg-blue-100',
      icon: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      hover: 'hover:bg-green-100',
      icon: 'text-green-600'
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      hover: 'hover:bg-orange-100',
      icon: 'text-orange-600'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      hover: 'hover:bg-purple-100',
      icon: 'text-purple-600'
    },
    pink: {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      border: 'border-pink-200',
      hover: 'hover:bg-pink-100',
      icon: 'text-pink-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      hover: 'hover:bg-indigo-100',
      icon: 'text-indigo-600'
    },
    gray: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      hover: 'hover:bg-gray-100',
      icon: 'text-gray-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      hover: 'hover:bg-yellow-100',
      icon: 'text-yellow-600'
    }
  };

  const classes = colorClasses[color];

  const handleClick = () => {
    if (disabled) return;
    
    // 실제 구현에서는 React Router 또는 Next.js 라우터 사용
    console.log(`Navigating to: ${href}`);
    // window.location.href = href; // 임시 구현
  };

  const buttonElement = (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full p-4 rounded-lg border transition-all duration-200
        ${disabled 
          ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60' 
          : `${classes.bg} ${classes.text} ${classes.border} ${classes.hover} cursor-pointer hover:shadow-sm active:scale-95`
        }
        ${highlight ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}
        text-left
      `}
      title={tooltip}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center mr-3
            ${disabled ? 'bg-gray-200' : classes.bg}
          `}>
            <div className={disabled ? 'text-gray-400' : classes.icon}>
              {icon}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center">
              <h4 className="font-medium text-sm">{title}</h4>
              {highlight && (
                <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                  NEW
                </span>
              )}
              {disabled && (
                <div className="ml-2 flex items-center">
                  <Clock className="w-3 h-3 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-400">준비 중</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        </div>

        <div className="flex items-center ml-2">
          {badge && badge > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full mr-2">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          
          {!disabled && (
            <ExternalLink className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
    </button>
  );

  // 툴팁이 있는 경우 래핑
  if (tooltip && disabled) {
    return (
      <div className="relative group">
        {buttonElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  return buttonElement;
};

export default ActionButton;