import { FormEvent } from 'react';
/**
 * Search Box Component
 * 
 * Frontend search functionality with real-time filtering
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
// import { search as searchIcon } from '@wordpress/icons';
import { debounce } from 'lodash';

interface SearchBoxProps {
  onSearch: (query: string, searchIn: string[]) => void;
  placeholder?: string;
  showAdvancedOptions?: boolean;
  searchFields?: string[];
  debounceTime?: number;
  showSearchIn?: boolean;
}

export const SearchBox = ({
  onSearch,
  placeholder = __('Search posts...', 'o4o'),
  showAdvancedOptions = false,
  searchFields = ['title', 'content', 'excerpt'],
  debounceTime = 500,
  showSearchIn = true,
}: SearchBoxProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIn, setSearchIn] = useState<string[]>(searchFields);
  const [isRealTime, setIsRealTime] = useState(true);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string, fields: string[]) => {
      onSearch(query, fields);
    }, debounceTime),
    [onSearch, debounceTime]
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (isRealTime) {
      debouncedSearch(value, searchIn);
    }
  };

  // Handle search submission
  const handleSearchSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    debouncedSearch.cancel();
    onSearch(searchQuery, searchIn);
  };

  // Handle search field toggle
  const handleSearchFieldToggle = (field: string, checked: boolean) => {
    const newSearchIn = checked
      ? [...searchIn, field]
      : searchIn.filter(f => f !== field);
    
    setSearchIn(newSearchIn);
    
    if (searchQuery && isRealTime) {
      debouncedSearch(searchQuery, newSearchIn);
    }
  };

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className="o4o-cpt-acf-loop__search">
      <form 
        onSubmit={handleSearchSubmit}
        className="o4o-cpt-acf-loop__search-form"
      >
        <div className="o4o-cpt-acf-loop__search-input-wrapper">
          <TextControl
            label={__('Search', 'o4o')}
            hideLabelFromVision
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="o4o-cpt-acf-loop__search-input"
          />
          
          {!isRealTime && (
            <button
              type="submit"
              className="o4o-cpt-acf-loop__search-button"
              aria-label={__('Search', 'o4o')}
            >
              <span className="dashicons dashicons-search" />
            </button>
          )}
        </div>

        {showAdvancedOptions && (
          <div className="o4o-cpt-acf-loop__search-options">
            <ToggleControl
              label={__('Real-time search', 'o4o')}
              checked={isRealTime}
              onChange={setIsRealTime}
              help={__('Search as you type', 'o4o')}
            />

            {showSearchIn && (
              <div className="o4o-cpt-acf-loop__search-fields">
                <p className="o4o-cpt-acf-loop__search-fields-label">
                  {__('Search in:', 'o4o')}
                </p>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('title')}
                    onChange={(e) => handleSearchFieldToggle('title', e.target.checked)}
                  />
                  <span>{__('Title', 'o4o')}</span>
                </label>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('content')}
                    onChange={(e) => handleSearchFieldToggle('content', e.target.checked)}
                  />
                  <span>{__('Content', 'o4o')}</span>
                </label>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('excerpt')}
                    onChange={(e) => handleSearchFieldToggle('excerpt', e.target.checked)}
                  />
                  <span>{__('Excerpt', 'o4o')}</span>
                </label>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('acf')}
                    onChange={(e) => handleSearchFieldToggle('acf', e.target.checked)}
                  />
                  <span>{__('Custom Fields', 'o4o')}</span>
                </label>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

// Search Settings Component for Inspector Controls
export const SearchSettings = ({
  enableSearch,
  searchPlaceholder,
  searchIn,
  realTimeSearch,
  onEnableChange,
  onPlaceholderChange,
  onSearchInChange,
  onRealTimeChange,
}: {
  enableSearch: boolean;
  searchPlaceholder: string;
  searchIn: string[];
  realTimeSearch: boolean;
  onEnableChange: (enabled: boolean) => void;
  onPlaceholderChange: (placeholder: string) => void;
  onSearchInChange: (fields: string[]) => void;
  onRealTimeChange: (realTime: boolean) => void;
}) => {
  const handleSearchFieldToggle = (field: string, checked: boolean) => {
    if (checked) {
      onSearchInChange([...searchIn, field]);
    } else {
      onSearchInChange(searchIn.filter(f => f !== field));
    }
  };

  return (
    <>
      <ToggleControl
        label={__('Enable Search', 'o4o')}
        checked={enableSearch}
        onChange={onEnableChange}
        help={__('Add a search box to filter posts', 'o4o')}
      />

      {enableSearch && (
        <>
          <TextControl
            label={__('Search Placeholder', 'o4o')}
            value={searchPlaceholder}
            onChange={onPlaceholderChange}
            placeholder={__('Search posts...', 'o4o')}
          />

          <ToggleControl
            label={__('Real-time Search', 'o4o')}
            checked={realTimeSearch}
            onChange={onRealTimeChange}
            help={__('Search as users type (may impact performance)', 'o4o')}
          />

          <div style={{ marginTop: '16px' }}>
            <p style={{ marginBottom: '8px', fontWeight: '600' }}>
              {__('Search Fields', 'o4o')}
            </p>
            
            <ToggleControl
              label={__('Title', 'o4o')}
              checked={searchIn.includes('title')}
              onChange={(checked) => handleSearchFieldToggle('title', checked)}
            />
            
            <ToggleControl
              label={__('Content', 'o4o')}
              checked={searchIn.includes('content')}
              onChange={(checked) => handleSearchFieldToggle('content', checked)}
            />
            
            <ToggleControl
              label={__('Excerpt', 'o4o')}
              checked={searchIn.includes('excerpt')}
              onChange={(checked) => handleSearchFieldToggle('excerpt', checked)}
            />
            
            <ToggleControl
              label={__('ACF Fields', 'o4o')}
              checked={searchIn.includes('acf')}
              onChange={(checked) => handleSearchFieldToggle('acf', checked)}
              help={__('Search in custom field values', 'o4o')}
            />
          </div>
        </>
      )}
    </>
  );
};