import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, X, Tag, Clock, TrendingUp } from 'lucide-react';
import { SettingSection } from '../types/customizer-types';
import debounce from 'lodash/debounce';

/**
 * Enhanced Search Component for WordPress-style Customizer
 * Features: keyword search, tags, recent searches, popular settings
 */

export interface SearchableItem {
  id: SettingSection;
  title: string;
  description: string;
  keywords: string[];
  category: 'global' | 'layout' | 'header' | 'footer' | 'content';
  path: string[];
  popularity?: number;
}

// Search index with keywords and metadata
export const searchIndex: SearchableItem[] = [
  {
    id: 'siteIdentity',
    title: 'Site Identity',
    description: 'Logo, Site Title & Tagline',
    keywords: ['logo', 'title', 'tagline', 'brand', 'identity', 'site name', 'favicon', 'icon'],
    category: 'global',
    path: ['Site Identity'],
    popularity: 95,
  },
  {
    id: 'colors',
    title: 'Colors',
    description: 'Base colors, Link colors, Background',
    keywords: ['color', 'theme', 'palette', 'background', 'text', 'link', 'accent', 'primary', 'secondary'],
    category: 'global',
    path: ['Global', 'Colors'],
    popularity: 90,
  },
  {
    id: 'typography',
    title: 'Typography',
    description: 'Body, Headings, Buttons',
    keywords: ['font', 'text', 'heading', 'h1', 'h2', 'h3', 'paragraph', 'size', 'weight', 'family'],
    category: 'global',
    path: ['Global', 'Typography'],
    popularity: 85,
  },
  {
    id: 'container',
    title: 'Container',
    description: 'Layout width and spacing',
    keywords: ['width', 'container', 'layout', 'spacing', 'padding', 'margin', 'boxed', 'fullwidth'],
    category: 'layout',
    path: ['Global', 'Container'],
    popularity: 70,
  },
  {
    id: 'header',
    title: 'Header',
    description: 'Site header layout and styling',
    keywords: ['header', 'navigation', 'menu', 'top', 'sticky', 'transparent', 'navbar'],
    category: 'header',
    path: ['Header'],
    popularity: 88,
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'Site footer layout and styling',
    keywords: ['footer', 'bottom', 'widgets', 'copyright', 'credits', 'social'],
    category: 'footer',
    path: ['Footer'],
    popularity: 75,
  },
  {
    id: 'sidebar',
    title: 'Sidebar',
    description: 'Sidebar layout and position',
    keywords: ['sidebar', 'widget', 'aside', 'left', 'right', 'position'],
    category: 'layout',
    path: ['Sidebar'],
    popularity: 65,
  },
  {
    id: 'blog',
    title: 'Blog',
    description: 'Blog archive and single post settings',
    keywords: ['blog', 'post', 'article', 'archive', 'category', 'tag', 'excerpt', 'author'],
    category: 'content',
    path: ['Blog'],
    popularity: 80,
  },
];

interface EnhancedSearchProps {
  onSelect: (sectionId: SettingSection) => void;
  className?: string;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onSelect,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search to improve performance
  const debouncedSearch = useMemo(
    () => debounce((searchQuery: string) => {
      setQuery(searchQuery);
    }, 150),
    []
  );

  // Enhanced search algorithm with scoring
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      // Show popular items when no query
      return searchIndex
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 5);
    }

    const lowerQuery = query.toLowerCase();
    const terms = lowerQuery.split(' ').filter(t => t.length > 0);

    return searchIndex
      .map(item => {
        let score = 0;
        
        // Exact title match (highest priority)
        if (item.title.toLowerCase() === lowerQuery) score += 100;
        
        // Title contains query
        if (item.title.toLowerCase().includes(lowerQuery)) score += 50;
        
        // Description contains query
        if (item.description.toLowerCase().includes(lowerQuery)) score += 30;
        
        // Keywords match
        terms.forEach(term => {
          item.keywords.forEach(keyword => {
            if (keyword.toLowerCase().includes(term)) score += 20;
          });
        });
        
        // Boost by popularity
        score += (item.popularity || 0) / 10;
        
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExpanded) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelect(searchResults[selectedIndex].id);
          }
          break;
        case 'Escape':
          setIsExpanded(false);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, searchResults, selectedIndex]);

  const handleSelect = (sectionId: SettingSection) => {
    // Save to recent searches (in-memory only)
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    
    // Clear and close
    setQuery('');
    setIsExpanded(false);
    onSelect(sectionId);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {Array.isArray(parts) && parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="wp-customizer-search-highlight">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={`wp-customizer-enhanced-search ${className}`}>
      <div className="wp-customizer-search-input-wrapper">
        <Search className="wp-customizer-search-icon" size={16} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search settings... (Ctrl+F)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            debouncedSearch(e.target.value);
          }}
          onFocus={() => setIsExpanded(true)}
          className="wp-customizer-search-input"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="wp-customizer-search-clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="wp-customizer-search-dropdown">
          {!query && recentSearches.length > 0 && (
            <div className="wp-customizer-search-section">
              <h4>
                <Clock size={14} />
                Recent Searches
              </h4>
              <ul>
                {Array.isArray(recentSearches) && recentSearches.map((search, i) => (
                  <li
                    key={i}
                    onClick={() => {
                      setQuery(search);
                      debouncedSearch(search);
                    }}
                  >
                    {search}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!query && (
            <div className="wp-customizer-search-section">
              <h4>
                <TrendingUp size={14} />
                Popular Settings
              </h4>
            </div>
          )}

          {Array.isArray(searchResults) && searchResults.length > 0 ? (
            <ul className="wp-customizer-search-results">
              {searchResults.map((item, index) => (
                <li
                  key={item.id}
                  className={`wp-customizer-search-result ${
                    index === selectedIndex ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="wp-customizer-search-result-content">
                    <h5>{highlightMatch(item.title, query)}</h5>
                    <p>{highlightMatch(item.description, query)}</p>
                    <div className="wp-customizer-search-result-meta">
                      <span className="wp-customizer-search-path">
                        {item.path.join(' › ')}
                      </span>
                      {Array.isArray(item.keywords) && item.keywords.slice(0, 3).map(keyword => (
                        <span key={keyword} className="wp-customizer-search-tag">
                          <Tag size={10} />
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : query ? (
            <div className="wp-customizer-search-empty">
              <p>No settings found for "{query}"</p>
              <p className="wp-customizer-search-hint">
                Try searching for: colors, typography, header, footer
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};