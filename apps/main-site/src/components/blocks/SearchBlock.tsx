import { FC, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchBlockProps {
  label?: string;
  showLabel?: boolean;
  placeholder?: string;
  buttonPosition?: 'button-inside' | 'button-outside' | 'no-button';
  className?: string;
}

const SearchBlock: FC<SearchBlockProps> = ({
  label = 'Search',
  showLabel = true,
  placeholder = 'Search...',
  buttonPosition = 'button-inside',
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
      
      <div className={`search-wrapper search-${buttonPosition}`}>
        <input
          id="search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="search-input"
          aria-label={!showLabel ? label : undefined}
        />
        
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
      `}</style>
    </form>
  );
};

export default SearchBlock;