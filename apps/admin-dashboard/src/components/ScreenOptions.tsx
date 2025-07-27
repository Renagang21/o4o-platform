import { FC } from 'react';
import { useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ScreenOption {
  id: string;
  label: string;
  checked: boolean;
}

interface ScreenOptionsProps {
  options: ScreenOption[];
  onOptionChange: (id: string, checked: boolean) => void;
  columns?: number;
  onColumnsChange?: (columns: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
  className?: string;
}

export const ScreenOptions: FC<ScreenOptionsProps> = ({
  options,
  onOptionChange,
  columns,
  onColumnsChange,
  itemsPerPage,
  onItemsPerPageChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2',
          'bg-white dark:bg-gray-800',
          'border border-gray-300 dark:border-gray-600',
          'rounded-md shadow-sm',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-primary-500'
        )}
      >
        <Settings className="w-4 h-4" />
        <span>Screen Options</span>
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute right-0 mt-2 w-80',
          'bg-white dark:bg-gray-800',
          'border border-gray-300 dark:border-gray-600',
          'rounded-md shadow-lg',
          'z-50'
        )}>
          <div className="p-4">
            {options.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Show on screen</h3>
                <div className="space-y-2">
                  {options.map((option: ScreenOption) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={option.checked}
                        onCheckedChange={(checked: boolean) => 
                          onOptionChange(option.id, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={option.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {columns !== undefined && onColumnsChange && (
              <div className="mb-4">
                <Label htmlFor="columns" className="text-sm font-medium">
                  Number of Columns
                </Label>
                <Input
                  id="columns"
                  type="number"
                  min="1"
                  max="6"
                  value={columns}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onColumnsChange(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full"
                />
              </div>
            )}

            {itemsPerPage !== undefined && onItemsPerPageChange && (
              <div>
                <Label htmlFor="itemsPerPage" className="text-sm font-medium">
                  Items per page
                </Label>
                <Input
                  id="itemsPerPage"
                  type="number"
                  min="1"
                  max="999"
                  value={itemsPerPage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onItemsPerPageChange(parseInt(e.target.value) || 20)}
                  className="mt-1 w-full"
                />
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsOpen(false)}
              className={cn(
                'px-3 py-1.5 text-sm',
                'bg-primary-600 text-white',
                'rounded hover:bg-primary-700',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenOptions;
