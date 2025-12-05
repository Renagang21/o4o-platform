/**
 * CMS Block - SearchBar
 *
 * Search Bar - Site search input
 */

export interface SearchBarProps {
  placeholder?: string;
  buttonText?: string;
  style?: 'default' | 'minimal' | 'pill';
  showButton?: boolean;
  width?: 'full' | 'auto';
  buttonColor?: string;
}

export default function SearchBar({
  placeholder = 'Search...',
  buttonText = 'Search',
  style = 'default',
  showButton = true,
  width = 'auto',
  buttonColor = '#3b82f6',
}: SearchBarProps) {
  const widthClass = width === 'full' ? 'w-full' : 'max-w-2xl mx-auto';

  if (style === 'minimal') {
    return (
      <div className={`py-4 ${widthClass}`}>
        <div className="mb-2 p-2 bg-cyan-50 border border-cyan-200 rounded text-xs text-cyan-700">
          🔍 Search Bar: Site-wide search
        </div>
        <form className="relative">
          <input
            type="search"
            placeholder={placeholder}
            className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-blue-500 outline-none transition-colors bg-transparent"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            🔍
          </button>
        </form>
      </div>
    );
  }

  if (style === 'pill') {
    return (
      <div className={`py-4 ${widthClass}`}>
        <div className="mb-2 p-2 bg-cyan-50 border border-cyan-200 rounded text-xs text-cyan-700">
          🔍 Search Bar: Site-wide search
        </div>
        <form className="flex gap-2">
          <input
            type="search"
            placeholder={placeholder}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {showButton && (
            <button
              type="submit"
              className="px-8 py-3 text-white rounded-full font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: buttonColor }}
            >
              {buttonText}
            </button>
          )}
        </form>
      </div>
    );
  }

  // Default style
  return (
    <div className={`py-4 ${widthClass}`}>
      <div className="mb-2 p-2 bg-cyan-50 border border-cyan-200 rounded text-xs text-cyan-700">
        🔍 Search Bar: Site-wide search
      </div>
      <form className="flex gap-2">
        <input
          type="search"
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {showButton && (
          <button
            type="submit"
            className="px-6 py-2 text-white rounded-md font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: buttonColor }}
          >
            {buttonText}
          </button>
        )}
      </form>
    </div>
  );
}
