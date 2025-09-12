import { useState, FC } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { ColumnOption } from '@/hooks/useScreenOptions';

export interface ScreenOptionsEnhancedProps {
  title?: string;
  // Column visibility options
  columns?: ColumnOption[];
  onColumnToggle?: (columnId: string, visible: boolean) => void;
  // Items per page
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
  itemsPerPageOptions?: number[];
  // Dashboard widgets or custom options
  customOptions?: {
    id: string;
    label: string;
    checked: boolean;
    description?: string;
  }[];
  onCustomOptionChange?: (optionId: string, checked: boolean) => void;
  // Layout columns (for dashboard)
  layoutColumns?: number;
  onLayoutColumnsChange?: (columns: number) => void;
  showLayoutOptions?: boolean;
}

/**
 * Enhanced WordPress-style Screen Options Component
 * Supports column visibility, items per page, and custom options
 */
const ScreenOptionsEnhanced: FC<ScreenOptionsEnhancedProps> = ({
  title = 'Screen Options',
  columns = [],
  onColumnToggle,
  itemsPerPage = 20,
  onItemsPerPageChange,
  // itemsPerPageOptions = [10, 20, 50, 100], // Not used in current implementation
  customOptions = [],
  onCustomOptionChange,
  layoutColumns,
  onLayoutColumnsChange,
  showLayoutOptions = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempItemsPerPage, setTempItemsPerPage] = useState(itemsPerPage);

  const handleApply = () => {
    if (onItemsPerPageChange && tempItemsPerPage !== itemsPerPage) {
      onItemsPerPageChange(tempItemsPerPage);
    }
    setIsOpen(false);
  };

  const hasColumns = columns.length > 0;
  const hasCustomOptions = customOptions.length > 0;
  const hasItemsPerPage = !!onItemsPerPageChange;
  const hasAnyOptions = hasColumns || hasCustomOptions || hasItemsPerPage || showLayoutOptions;

  if (!hasAnyOptions) return null;

  return (
    <div id="screen-options-wrap" className="hidden">
      {/* Screen Options Tab */}
      <div id="screen-options-link-wrap" className="hide-if-no-js screen-meta-toggle">
        <button
          type="button"
          id="show-settings-link"
          className={clsx(
            'show-settings button',
            isOpen && 'screen-meta-active'
          )}
          aria-controls="screen-options-wrap"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          {title}
        </button>
      </div>

      {/* Screen Options Panel */}
      <div 
        id="screen-options" 
        className={clsx(
          'metabox-prefs',
          !isOpen && 'hidden'
        )}
      >
        <div className="screen-options-content">
          {/* Columns Section */}
          {hasColumns && (
            <fieldset className="metabox-prefs columns-prefs">
              <legend>Columns</legend>
              <div className="columns-prefs-wrap">
                {columns.map((column: any) => (
                  <label key={column.id} htmlFor={`${column.id}-hide`}>
                    <input
                      className="hide-column-tog"
                      name={`${column.id}-hide`}
                      type="checkbox"
                      id={`${column.id}-hide`}
                      checked={column.visible}
                      disabled={column.required}
                      onChange={(e: any) => onColumnToggle?.(column.id, e.target.checked)}
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Custom Options (Boxes) Section */}
          {hasCustomOptions && (
            <fieldset className="metabox-prefs">
              <legend>Boxes</legend>
              <div className="metabox-prefs-wrap">
                {customOptions.map((option: any) => (
                  <label key={option.id} htmlFor={`${option.id}-hide`}>
                    <input
                      className="hide-postbox-tog"
                      name={`${option.id}-hide`}
                      type="checkbox"
                      id={`${option.id}-hide`}
                      checked={option.checked}
                      onChange={(e: any) => onCustomOptionChange?.(option.id, e.target.checked)}
                    />
                    {option.label}
                    {option.description && (
                      <span className="description"> — {option.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Layout Section (Dashboard) */}
          {showLayoutOptions && layoutColumns !== undefined && onLayoutColumnsChange && (
            <fieldset className="columns-prefs">
              <legend className="screen-layout">Layout</legend>
              <div className="columns-prefs-wrap">
                <label className="columns-prefs-1">
                  <input
                    type="radio"
                    name="screen_columns"
                    value="1"
                    checked={layoutColumns === 1}
                    onChange={() => onLayoutColumnsChange(1)}
                  />
                  1
                </label>
                <label className="columns-prefs-2">
                  <input
                    type="radio"
                    name="screen_columns"
                    value="2"
                    checked={layoutColumns === 2}
                    onChange={() => onLayoutColumnsChange(2)}
                  />
                  2
                </label>
                <label className="columns-prefs-3">
                  <input
                    type="radio"
                    name="screen_columns"
                    value="3"
                    checked={layoutColumns === 3}
                    onChange={() => onLayoutColumnsChange(3)}
                  />
                  3
                </label>
                <label className="columns-prefs-4">
                  <input
                    type="radio"
                    name="screen_columns"
                    value="4"
                    checked={layoutColumns === 4}
                    onChange={() => onLayoutColumnsChange(4)}
                  />
                  4
                </label>
              </div>
            </fieldset>
          )}

          {/* Pagination Section */}
          {hasItemsPerPage && (
            <fieldset className="screen-options-pagination">
              <legend>Pagination</legend>
              <label htmlFor="items_per_page">
                Number of items per page:
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="999"
                className="screen-per-page"
                name="items_per_page"
                id="items_per_page"
                value={tempItemsPerPage}
                onChange={(e: any) => {
                  const value = parseInt(e.target.value);
                  if (value > 0 && value < 1000) {
                    setTempItemsPerPage(value);
                  }
                }}
              />
            </fieldset>
          )}

          {/* Apply Button */}
          <p className="submit">
            <input
              type="submit"
              name="screen-options-apply"
              id="screen-options-apply"
              className="button button-primary"
              value="Apply"
              onClick={handleApply}
            />
          </p>
        </div>
      </div>
    </div>
  );
};

// Simpler React-friendly version that matches current styling
export const ScreenOptionsReact: FC<ScreenOptionsEnhancedProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempItemsPerPage, setTempItemsPerPage] = useState(props.itemsPerPage || 20);

  const handleApply = () => {
    if (props.onItemsPerPageChange && tempItemsPerPage !== props.itemsPerPage) {
      props.onItemsPerPageChange(tempItemsPerPage);
    }
    setIsOpen(false);
  };

  const hasColumns = (props.columns?.length || 0) > 0;
  const hasOptions = hasColumns || props.customOptions?.length || props.onItemsPerPageChange;

  if (!hasOptions) return null;

  return (
    <div className="relative">
      {/* Screen Options Tab */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'absolute -top-1 right-0 px-3 py-1 text-sm',
          'bg-white border border-gray-300 rounded-t',
          'hover:bg-gray-50 transition-colors',
          'flex items-center gap-1',
          isOpen && 'bg-gray-50'
        )}
      >
        <Settings className="w-4 h-4" />
        <span>{props.title || 'Screen Options'}</span>
        <ChevronDown className={clsx(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Screen Options Panel */}
      {isOpen && (
        <div className="absolute top-8 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-4 min-w-[300px]">
            {/* Columns Section */}
            {hasColumns && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Columns</h3>
                <div className="space-y-1">
                  {props.columns?.map((column: any) => (
                    <label 
                      key={column.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={column.visible}
                        disabled={column.required}
                        onChange={(e: any) => props.onColumnToggle?.(column.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className={column.required ? 'text-gray-500' : ''}>
                        {column.label}
                        {column.required && ' (required)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Options */}
            {props.customOptions && props.customOptions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Show on screen</h3>
                <div className="space-y-1">
                  {props.customOptions.map((option: any) => (
                    <label 
                      key={option.id}
                      className="flex items-start gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={option.checked}
                        onChange={(e: any) => props.onCustomOptionChange?.(option.id, e.target.checked)}
                        className="rounded border-gray-300 mt-0.5"
                      />
                      <div>
                        <span>{option.label}</span>
                        {option.description && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Layout Options */}
            {props.showLayoutOptions && props.layoutColumns !== undefined && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Layout</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Number of Columns:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((num: any) => (
                      <button
                        key={num}
                        onClick={() => props.onLayoutColumnsChange?.(num)}
                        className={clsx(
                          'w-8 h-8 text-sm rounded border transition-colors',
                          props.layoutColumns === num
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Items per page */}
            {props.onItemsPerPageChange && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Pagination</h3>
                <div className="flex items-center gap-2">
                  <label htmlFor="items-per-page" className="text-sm">
                    Number of items per page:
                  </label>
                  <input
                    id="items-per-page"
                    type="number"
                    min="1"
                    max="999"
                    value={tempItemsPerPage}
                    onChange={(e: any) => {
                      const value = parseInt(e.target.value);
                      if (value > 0) setTempItemsPerPage(value);
                    }}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={handleApply}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
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

export default ScreenOptionsEnhanced;