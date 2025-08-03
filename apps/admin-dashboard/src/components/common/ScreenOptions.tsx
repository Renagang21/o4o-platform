import { useState, FC } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export interface ScreenOption {
  id: string;
  label: string;
  checked: boolean;
  type: 'checkbox' | 'number';
  value?: number;
  min?: number;
  max?: number;
  description?: string;
}

interface ScreenOptionsProps {
  title?: string;
  options: ScreenOption[];
  onOptionsChange: (options: ScreenOption[]) => void;
  columnsPerPage?: number;
  onColumnsChange?: (columns: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
}

const ScreenOptions: FC<ScreenOptionsProps> = ({
  title = 'Screen Options',
  options,
  onOptionsChange,
  columnsPerPage,
  onColumnsChange,
  itemsPerPage = 20,
  onItemsPerPageChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionChange = (optionId: string, checked: boolean) => {
    const updatedOptions = options.map(opt => 
      opt.id === optionId ? { ...opt, checked } : opt
    );
    onOptionsChange(updatedOptions);
  };

  return (
    <div className="relative">
      {/* Screen Options Tab */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'absolute -top-1 right-0 px-3 py-1 text-sm',
          'bg-modern-bg-card border border-modern-border-primary rounded-t',
          'hover:bg-modern-bg-hover transition-colors',
          'flex items-center gap-1',
          isOpen && 'bg-modern-bg-hover'
        )}
      >
        <Settings className="w-4 h-4" />
        <span>{title}</span>
        <ChevronDown className={clsx(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Screen Options Panel */}
      {isOpen && (
        <div className="absolute top-8 right-0 w-96 bg-modern-bg-card border border-modern-border-primary rounded-lg shadow-modern-shadow-lg z-50">
          <div className="p-4">
            {/* Boxes Section */}
            {options.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-modern-text-primary mb-2">Boxes</h3>
                <div className="space-y-2">
                  {options.map(option => (
                    <label 
                      key={option.id}
                      className="flex items-start gap-2 text-sm text-modern-text-secondary hover:text-modern-text-primary cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={option.checked}
                        onChange={(e: any) => handleOptionChange(option.id, e.target.checked)}
                        className="mt-0.5 rounded border-modern-border-primary text-modern-primary focus:ring-modern-primary"
                      />
                      <div>
                        <span>{option.label}</span>
                        {option.description && (
                          <p className="text-xs text-modern-text-tertiary mt-0.5">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Layout Section */}
            {columnsPerPage !== undefined && onColumnsChange && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-modern-text-primary mb-2">Layout</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-modern-text-secondary">Number of Columns:</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => onColumnsChange(num)}
                        className={clsx(
                          'w-8 h-8 text-sm rounded border transition-colors',
                          columnsPerPage === num
                            ? 'bg-modern-primary text-white border-modern-primary'
                            : 'bg-white border-modern-border-primary text-modern-text-primary hover:border-modern-primary'
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pagination Section */}
            {onItemsPerPageChange && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-modern-text-primary mb-2">Pagination</h3>
                <div className="flex items-center gap-2">
                  <label htmlFor="items-per-page" className="text-sm text-modern-text-secondary">
                    Number of items per page:
                  </label>
                  <input
                    id="items-per-page"
                    type="number"
                    min="1"
                    max="999"
                    value={itemsPerPage}
                    onChange={(e: any) => {
                      const value = parseInt(e.target.value);
                      if (value > 0) onItemsPerPageChange(value);
                    }}
                    className="w-16 px-2 py-1 text-sm border border-modern-border-primary rounded focus:outline-none focus:ring-2 focus:ring-modern-primary"
                  />
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="flex justify-end pt-2 border-t border-modern-border-primary">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-sm bg-modern-primary text-white rounded hover:bg-modern-primary-hover transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenOptions;