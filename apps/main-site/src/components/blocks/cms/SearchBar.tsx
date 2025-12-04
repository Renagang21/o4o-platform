/**
 * SearchBar Block Renderer
 */

'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlockRendererProps } from '../BlockRenderer';

export const SearchBarBlock = ({ node }: BlockRendererProps) => {
  const {
    placeholder = 'Search...',
    style = 'default',
    showButton = true,
    buttonText = 'Search',
    redirectTo = '/search',
  } = node.props;

  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`${redirectTo}?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (style === 'pill') {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-6 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showButton && (
          <button
            type="submit"
            className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            {buttonText}
          </button>
        )}
      </form>
    );
  }

  if (style === 'minimal') {
    return (
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 bg-transparent"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-600"
        >
          🔍
        </button>
      </form>
    );
  }

  // Default style
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {showButton && (
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {buttonText}
        </button>
      )}
    </form>
  );
};
