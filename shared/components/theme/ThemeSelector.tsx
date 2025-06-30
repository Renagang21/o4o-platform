import React from 'react';
import { useMultiTheme, ThemeName } from './MultiThemeContext';
import { Check, Palette } from 'lucide-react';

interface ThemeSelectorProps {
  className?: string;
  showDescription?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  className = '', 
  showDescription = true 
}) => {
  const { currentTheme, setTheme, availableThemes } = useMultiTheme();

  const getThemePreviewColors = (themeName: ThemeName) => {
    const colorMappings: Record<ThemeName, { bg: string; accent: string }> = {
      light: { bg: '#ffffff', accent: '#3b82f6' },
      dark: { bg: '#1a1a1a', accent: '#60a5fa' },
      evening: { bg: '#1a1625', accent: '#ff6b9d' },
      noon: { bg: '#fefefe', accent: '#ffd93d' },
      dusk: { bg: '#2b2d42', accent: '#ee6c4d' },
      afternoon: { bg: '#faf7f0', accent: '#dda15e' },
      twilight: { bg: '#0f0e17', accent: '#a685e2' }
    };
    return colorMappings[themeName];
  };

  return (
    <div className={`theme-selector ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {availableThemes.map((theme) => {
          const colors = getThemePreviewColors(theme.name);
          const isActive = currentTheme.name === theme.name;
          
          return (
            <button
              key={theme.name}
              onClick={() => setTheme(theme.name)}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isActive 
                  ? 'border-blue-500 shadow-lg scale-105' 
                  : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                }
              `}
              aria-label={`Select ${theme.displayName} theme`}
            >
              {/* Color Preview */}
              <div className="mb-3 flex items-center justify-center">
                <div 
                  className="w-16 h-16 rounded-full shadow-inner relative overflow-hidden"
                  style={{ backgroundColor: colors.bg }}
                >
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-8"
                    style={{ backgroundColor: colors.accent }}
                  />
                </div>
              </div>
              
              {/* Theme Name */}
              <h3 className="font-semibold text-sm mb-1">
                {theme.displayName}
              </h3>
              
              {/* Description */}
              {showDescription && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {theme.description}
                </p>
              )}
              
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className="bg-blue-500 text-white rounded-full p-1">
                    <Check size={12} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Compact version for header/toolbar
export const ThemeSelectorCompact: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useMultiTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Select theme"
      >
        <Palette size={20} />
        <span className="text-sm font-medium">{currentTheme.displayName}</span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-20">
            {availableThemes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => {
                  setTheme(theme.name);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                  ${currentTheme.name === theme.name ? 'bg-gray-50 dark:bg-gray-700/50' : ''}
                  ${theme.name === availableThemes[0].name ? 'rounded-t-lg' : ''}
                  ${theme.name === availableThemes[availableThemes.length - 1].name ? 'rounded-b-lg' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{theme.displayName}</span>
                  {currentTheme.name === theme.name && <Check size={16} />}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};