/**
 * UserSearch Component
 *
 * Search input for finding users by ID or name
 */

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSearchProps {
  onSearch: (query: string) => void;
  onSelect?: (userId: string) => void;
  placeholder?: string;
  className?: string;
  showButton?: boolean;
  autoSearch?: boolean;
  debounceMs?: number;
}

export function UserSearch({
  onSearch,
  onSelect,
  placeholder = '사용자 ID 또는 이름으로 검색...',
  className,
  showButton = true,
  autoSearch = false,
  debounceMs = 300,
}: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(() => {
    onSearch(query.trim());
  }, [query, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (autoSearch) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(() => {
        onSearch(value.trim());
      }, debounceMs);
      setDebounceTimer(timer);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showButton && (
        <Button onClick={handleSearch} variant="outline">
          <Search className="h-4 w-4 mr-2" />
          검색
        </Button>
      )}
    </div>
  );
}

export default UserSearch;
