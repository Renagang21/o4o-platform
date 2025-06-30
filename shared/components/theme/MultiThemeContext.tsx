import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeName = 'light' | 'dark' | 'evening' | 'noon' | 'dusk' | 'afternoon' | 'twilight';

interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  cssClass: string;
  isDark: boolean;
}

export const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    displayName: 'Light',
    description: 'Clean and bright theme',
    cssClass: 'theme-light',
    isDark: false
  },
  dark: {
    name: 'dark',
    displayName: 'Dark',
    description: 'Easy on the eyes',
    cssClass: 'theme-dark',
    isDark: true
  },
  evening: {
    name: 'evening',
    displayName: 'Evening',
    description: 'Deep sunset and twilight colors',
    cssClass: 'theme-evening',
    isDark: true
  },
  noon: {
    name: 'noon',
    displayName: 'Noon',
    description: 'Bright midday sun',
    cssClass: 'theme-noon',
    isDark: false
  },
  dusk: {
    name: 'dusk',
    displayName: 'Dusk',
    description: 'Gentle twilight transition',
    cssClass: 'theme-dusk',
    isDark: true
  },
  afternoon: {
    name: 'afternoon',
    displayName: 'Afternoon',
    description: 'Warm, soft light',
    cssClass: 'theme-afternoon',
    isDark: false
  },
  twilight: {
    name: 'twilight',
    displayName: 'Twilight',
    description: 'Deep blue hour',
    cssClass: 'theme-twilight',
    isDark: true
  }
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeName: ThemeName) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
}

export const MultiThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const savedThemeName = localStorage.getItem('selectedTheme') as ThemeName | null;
    const themeName = savedThemeName && themes[savedThemeName] ? savedThemeName : defaultTheme;
    return themes[themeName];
  });

  useEffect(() => {
    // Remove all theme classes
    const root = document.documentElement;
    Object.values(themes).forEach(theme => {
      root.classList.remove(theme.cssClass);
    });
    
    // Add current theme class
    root.classList.add(currentTheme.cssClass);
    
    // Add dark/light class for Tailwind compatibility
    if (currentTheme.isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('selectedTheme', currentTheme.name);
  }, [currentTheme]);

  const setTheme = (themeName: ThemeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themes[themeName]);
    }
  };

  const availableThemes = Object.values(themes);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useMultiTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useMultiTheme must be used within a MultiThemeProvider');
  }
  return context;
};