import { __ } from '@wordpress/i18n';
import { FormEvent } from 'react';
/**
 * Search Box Component
 * 
 * Frontend search functionality with real-time filtering
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { TextControl, ToggleControl } from '@wordpress/components';
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
  placeholder = 'Search posts...',
  showAdvancedOptions = false,
  searchFields = ['title', 'content', 'excerpt'],
  debounceTime = 500,
  showSearchIn = true,
}: SearchBoxProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIn, setSearchIn] = useState(searchFields);
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
      : searchIn.filter((f: any) => f !== field);
    
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
            label={'Search'}
            hideLabelFromVision={true}
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="o4o-cpt-acf-loop__search-input"
            help=""
            __nextHasNoMarginBottom={false}
          />
          
          {!isRealTime && (
            <button
              type="submit"
              className="o4o-cpt-acf-loop__search-button"
              aria-label={'Search'}
            >
              <span className="dashicons dashicons-search" />
            </button>
          )}
        </div>

        {showAdvancedOptions && (
          <div className="o4o-cpt-acf-loop__search-options">
            <ToggleControl
              label={'Real-time search'}
              checked={isRealTime}
              onChange={setIsRealTime}
              help={'Search as you type'}
              disabled={false}
            />

            {showSearchIn && (
              <div className="o4o-cpt-acf-loop__search-fields">
                <p className="o4o-cpt-acf-loop__search-fields-label">
                  {'Search in:'}
                </p>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('title')}
                    onChange={(e: any) => handleSearchFieldToggle('title', e.target.checked)}
                  />
                  <span>{'Title'}</span>
                </label>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('content')}
                    onChange={(e: any) => handleSearchFieldToggle('content', e.target.checked)}
                  />
                  <span>{'Content'}</span>
                </label>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('excerpt')}
                    onChange={(e: any) => handleSearchFieldToggle('excerpt', e.target.checked)}
                  />
                  <span>{'Excerpt'}</span>
                </label>
                
                <label className="o4o-cpt-acf-loop__search-field">
                  <input
                    type="checkbox"
                    checked={searchIn.includes('acf')}
                    onChange={(e: any) => handleSearchFieldToggle('acf', e.target.checked)}
                  />
                  <span>{'Custom Fields'}</span>
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
      onSearchInChange(searchIn.filter((f: any) => f !== field));
    }
  };

  return (
    <>
      <ToggleControl
        label={'Enable Search'}
        checked={enableSearch}
        onChange={onEnableChange}
        help={'Add a search box to filter posts'}
        disabled={false}
      />

      {enableSearch && (
        <>
          <TextControl
            label={'Search Placeholder'}
            value={searchPlaceholder}
            onChange={onPlaceholderChange}
            placeholder={'Search posts...'}
            className=""
            help=""
            __nextHasNoMarginBottom={false}
            hideLabelFromVision={false}
          />

          <ToggleControl
            label={'Real-time Search'}
            checked={realTimeSearch}
            onChange={onRealTimeChange}
            help={'Search as users type (may impact performance)'}
            disabled={false}
          />

          <div style={{ marginTop: '16px' }}>
            <p style={{ marginBottom: '8px', fontWeight: '600' }}>
              {'Search Fields'}
            </p>
            
            <ToggleControl
              label={'Title'}
              checked={searchIn.includes('title')}
              onChange={(checked: any) => handleSearchFieldToggle('title', checked)}
              disabled={false}
            />
            
            <ToggleControl
              label={'Content'}
              checked={searchIn.includes('content')}
              onChange={(checked: any) => handleSearchFieldToggle('content', checked)}
              disabled={false}
            />
            
            <ToggleControl
              label={'Excerpt'}
              checked={searchIn.includes('excerpt')}
              onChange={(checked: any) => handleSearchFieldToggle('excerpt', checked)}
              disabled={false}
            />
            
            <ToggleControl
              label={'ACF Fields'}
              checked={searchIn.includes('acf')}
              onChange={(checked: any) => handleSearchFieldToggle('acf', checked)}
              help={'Search in custom field values'}
              disabled={false}
            />
          </div>
        </>
      )}
    </>
  );
};