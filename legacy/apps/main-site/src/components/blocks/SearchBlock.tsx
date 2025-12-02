import { FC, useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchSuggestion {
  id: string;
  type: 'product' | 'page' | 'category' | 'post';
  title: string;
  description?: string;
  url: string;
}

interface SearchBlockProps {
  label?: string;
  showLabel?: boolean;
  placeholder?: string;
  buttonPosition?: 'button-inside' | 'button-outside' | 'no-button';
  className?: string;
  autocomplete?: boolean;
  minQueryLength?: number;
}

const SearchBlock: FC<SearchBlockProps> = ({
  label = 'Search',
  showLabel = true,
  placeholder = 'Search...',
  buttonPosition = 'button-inside',
  className = '',
  autocomplete = true,
  minQueryLength = 2
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Fetch suggestions
  useEffect(() => {
    if (!autocomplete || debouncedQuery.length < minQueryLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}&limit=5`
        );
        const data = await response.json();

        if (data.success) {
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, autocomplete, minQueryLength]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selected = suggestions[selectedIndex];
          navigate(selected.url);
          setShowSuggestions(false);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setShowSuggestions(false);
    navigate(suggestion.url);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'product':
        return '🛍️';
      case 'page':
        return '📄';
      case 'category':
        return '📁';
      case 'post':
        return '📰';
      default:
        return '🔍';
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`search-block ${className}`}
      role="search"
    >
      {showLabel && (
        <label htmlFor="search-input" className="search-label">
          {label}
        </label>
      )}

      <div className="search-container">
        <div className={`search-wrapper search-${buttonPosition}`}>
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchQuery.length >= minQueryLength && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
            className="search-input"
            aria-label={!showLabel ? label : undefined}
            aria-autocomplete="list"
            aria-controls={showSuggestions ? 'search-suggestions' : undefined}
            aria-expanded={showSuggestions}
          />

          {loading && (
            <div className="search-loading-icon">
              <Loader2 size={16} className="search-spinner" />
            </div>
          )}

          {buttonPosition !== 'no-button' && (
            <button
              type="submit"
              className="search-button"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            id="search-suggestions"
            className="search-suggestions"
            role="listbox"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <span className="suggestion-icon">{getSuggestionIcon(suggestion.type)}</span>
                <div className="suggestion-content">
                  <div className="suggestion-title">{suggestion.title}</div>
                  {suggestion.description && (
                    <div className="suggestion-description">{suggestion.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {showSuggestions && suggestions.length === 0 && !loading && searchQuery.length >= minQueryLength && (
          <div ref={suggestionsRef} className="search-suggestions">
            <div className="no-results">검색 결과가 없습니다</div>
          </div>
        )}
      </div>
      
      <style>{`
        .search-block {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-label {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .search-container {
          position: relative;
          flex: 1;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          width: 100%;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-loading-icon {
          position: absolute;
          right: 2.5rem;
          display: flex;
          align-items: center;
          color: #6b7280;
        }

        .search-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .search-button-inside .search-input {
          padding-right: 2.5rem;
        }

        .search-button-inside .search-button {
          position: absolute;
          right: 0.25rem;
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          transition: color 0.2s;
        }

        .search-button-inside .search-button:hover {
          color: #3b82f6;
        }

        .search-button-outside {
          gap: 0.5rem;
        }

        .search-button-outside .search-button {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .search-button-outside .search-button:hover {
          background: #2563eb;
        }

        .search-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          cursor: pointer;
          background: none;
          border: none;
          border-bottom: 1px solid #f3f4f6;
          width: 100%;
          text-align: left;
          transition: background-color 0.2s;
        }

        .suggestion-item:last-child {
          border-bottom: none;
        }

        .suggestion-item:hover,
        .suggestion-item.selected {
          background: #f9fafb;
        }

        .suggestion-icon {
          margin-right: 0.75rem;
          font-size: 1.125rem;
        }

        .suggestion-content {
          flex: 1;
        }

        .suggestion-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
        }

        .suggestion-description {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.125rem;
        }

        .no-results {
          padding: 1rem;
          text-align: center;
          color: #9ca3af;
          font-size: 0.875rem;
        }
      `}</style>
    </form>
  );
};

export default SearchBlock;