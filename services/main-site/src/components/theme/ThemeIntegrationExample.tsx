import React from 'react';
import { MultiThemeProvider } from '@o4o/ui/theme/MultiThemeContext';
import { ThemeSelector, ThemeSelectorCompact } from '@o4o/ui/theme/ThemeSelector';

// Example of how to integrate the new theme system into the existing app
export const ThemeIntegrationExample: React.FC = () => {
  return (
    <MultiThemeProvider defaultTheme="light">
      <div className="min-h-screen">
        {/* Example header with compact theme selector */}
        <header className="bg-secondary border-b border-theme p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">My App</h1>
            <ThemeSelectorCompact />
          </div>
        </header>

        {/* Example content */}
        <main className="p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Theme Selection</h2>
            <p className="text-secondary mb-8">
              Choose your preferred visual theme from the options below.
            </p>
            
            {/* Full theme selector */}
            <ThemeSelector className="mb-8" />
            
            {/* Example themed components */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="card p-6 rounded-lg shadow-theme">
                <h3 className="text-xl font-semibold mb-2">Primary Card</h3>
                <p className="text-secondary">
                  This card uses theme variables for consistent styling.
                </p>
                <button className="btn-theme-primary px-4 py-2 rounded mt-4">
                  Primary Action
                </button>
              </div>
              
              <div className="card p-6 rounded-lg shadow-theme">
                <h3 className="text-xl font-semibold mb-2">Secondary Card</h3>
                <p className="text-secondary">
                  All colors adapt to the selected theme automatically.
                </p>
                <button className="btn-theme-secondary px-4 py-2 rounded mt-4">
                  Secondary Action
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MultiThemeProvider>
  );
};

// Example of updating existing components to use theme variables
export const ThemedButton: React.FC<{ variant?: 'primary' | 'secondary' }> = ({ 
  variant = 'primary', 
  children 
}) => {
  const className = variant === 'primary' 
    ? 'btn-theme-primary' 
    : 'btn-theme-secondary';
    
  return (
    <button className={`${className} px-4 py-2 rounded transition-colors`}>
      {children}
    </button>
  );
};