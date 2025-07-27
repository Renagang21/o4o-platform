import { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScreenOption {
  id: string;
  label: string;
  checked: boolean;
}

interface ScreenOptionsProps {
  options: ScreenOption[];
  onOptionChange: (id: string, checked: boolean) => void;
  columnsPerPage?: number;
  onColumnsChange?: (columns: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
}

const ScreenOptions: React.FC<ScreenOptionsProps> = ({
  options,
  onOptionChange,
  columnsPerPage = 2,
  onColumnsChange,
  itemsPerPage = 20,
  onItemsPerPageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-200",
          "border border-neutral-300 dark:border-neutral-700",
          "bg-white dark:bg-neutral-900",
          "text-neutral-700 dark:text-neutral-300",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800",
          isOpen && "bg-neutral-50 dark:bg-neutral-800"
        )}
      >
        <Settings className="w-4 h-4" />
        <span>Screen Options</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className={cn(
          "absolute top-full right-0 mt-2 w-80 z-50",
          "bg-white dark:bg-neutral-900",
          "rounded-lg shadow-xl",
          "border border-neutral-200 dark:border-neutral-800"
        )}>
          {/* Show/Hide Boxes */}
          {options.length > 0 && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-semibold mb-3 text-neutral-900 dark:text-neutral-100">
                Show on screen
              </h3>
              <div className="space-y-2">
                {options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={option.checked}
                        onChange={(e) => onOptionChange(option.id, e.target.checked)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-4 h-4 rounded border-2 transition-all duration-200",
                        option.checked 
                          ? "bg-primary-500 border-primary-500" 
                          : "bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 group-hover:border-primary-400"
                      )}>
                        {option.checked && (
                          <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Layout Options */}
          {onColumnsChange && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-semibold mb-3 text-neutral-900 dark:text-neutral-100">
                Screen Layout
              </h3>
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">
                  Number of Columns:
                </label>
                <select
                  value={columnsPerPage}
                  onChange={(e) => onColumnsChange(Number(e.target.value))}
                  className={cn(
                    "px-3 py-1 text-sm rounded border transition-colors",
                    "bg-white dark:bg-neutral-800",
                    "border-neutral-300 dark:border-neutral-600",
                    "text-neutral-700 dark:text-neutral-300",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  )}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
            </div>
          )}

          {/* Pagination Options */}
          {onItemsPerPageChange && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-semibold mb-3 text-neutral-900 dark:text-neutral-100">
                Pagination
              </h3>
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">
                  Items per page:
                </label>
                <input
                  type="number"
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  min={1}
                  max={999}
                  className={cn(
                    "w-20 px-3 py-1 text-sm rounded border transition-colors",
                    "bg-white dark:bg-neutral-800",
                    "border-neutral-300 dark:border-neutral-600",
                    "text-neutral-700 dark:text-neutral-300",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  )}
                />
              </div>
            </div>
          )}

          {/* Apply Button & Help Text */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-b-lg">
            <button
              onClick={() => setIsOpen(false)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded transition-all duration-200",
                "bg-primary-500 hover:bg-primary-600",
                "text-white shadow-sm hover:shadow"
              )}
            >
              Apply
            </button>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 italic">
              This screen layout setting only applies to you and will be saved for later visits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenOptions;