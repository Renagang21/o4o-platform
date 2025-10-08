import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface SearchBlockProps {
  attributes: {
    label: string;
    placeholder: string;
    buttonText: string;
    buttonPosition: string;
    showLabel: boolean;
  };
  setAttributes: (attrs: Partial<SearchBlockProps['attributes']>) => void;
}

const Edit: React.FC<SearchBlockProps> = ({ attributes, setAttributes }) => {
  const { label, placeholder, buttonText, buttonPosition, showLabel } = attributes;
  
  return (
    <div className="wp-block-search">
      <div className="block-editor-block-toolbar" style={{ marginBottom: '10px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={showLabel} 
            onChange={(e) => setAttributes({ showLabel: e.target.checked })}
          />
          Show label
        </label>
        <select 
          value={buttonPosition || 'button-inside'} 
          onChange={(e) => setAttributes({ buttonPosition: e.target.value })}
          style={{ marginLeft: '10px' }}
        >
          <option value="button-inside">Button inside</option>
          <option value="button-outside">Button outside</option>
          <option value="no-button">No button</option>
        </select>
      </div>
      
      <form className={`wp-block-search__${buttonPosition || 'button-inside'}`}>
        {showLabel && (
          <label htmlFor="wp-block-search__input" className="wp-block-search__label">
            <input 
              type="text" 
              value={label || 'Search'} 
              onChange={(e) => setAttributes({ label: e.target.value })}
              style={{ border: 'none', background: 'transparent' }}
            />
          </label>
        )}
        <div className="wp-block-search__inside-wrapper">
          <input 
            type="search" 
            id="wp-block-search__input"
            className="wp-block-search__input"
            placeholder={placeholder || 'Search...'}
            onChange={(e) => setAttributes({ placeholder: e.target.value })}
          />
          {buttonPosition !== 'no-button' && (
            <button type="submit" className="wp-block-search__button">
              <input 
                type="text" 
                value={buttonText || 'Search'} 
                onChange={(e) => setAttributes({ buttonText: e.target.value })}
                style={{ 
                  border: 'none', 
                  background: 'transparent',
                  color: 'inherit' 
                }}
              />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

const Save: React.FC<Pick<SearchBlockProps, 'attributes'>> = ({ attributes }) => {
  const { label, placeholder, buttonText, buttonPosition, showLabel } = attributes;
  
  return (
    <form className={`wp-block-search wp-block-search__${buttonPosition || 'button-inside'}`}>
      {showLabel && (
        <label htmlFor="wp-block-search__input" className="wp-block-search__label">
          {label || 'Search'}
        </label>
      )}
      <div className="wp-block-search__inside-wrapper">
        <input 
          type="search" 
          id="wp-block-search__input"
          className="wp-block-search__input"
          placeholder={placeholder || 'Search...'}
          name="s"
        />
        {buttonPosition !== 'no-button' && (
          <button type="submit" className="wp-block-search__button">
            {buttonText || 'Search'}
          </button>
        )}
      </div>
    </form>
  );
};

const SearchBlock: BlockDefinition = {
  name: 'o4o/search',
  title: 'Search',
  category: 'interactive',
  icon: 'search',
  description: 'Add a search form.',
  keywords: ['search', 'find', 'query'],
  
  attributes: {
    label: {
      type: 'string',
      default: 'Search'
    },
    placeholder: {
      type: 'string',
      default: ''
    },
    buttonText: {
      type: 'string',
      default: 'Search'
    },
    buttonPosition: {
      type: 'string',
      default: 'button-inside'
    },
    showLabel: {
      type: 'boolean',
      default: true
    }
  },
  
  supports: {
    align: ['left', 'center', 'right'],
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default SearchBlock;