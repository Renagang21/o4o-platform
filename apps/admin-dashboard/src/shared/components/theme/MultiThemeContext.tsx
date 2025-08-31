import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';

// React Refresh를 위한 주석
/* @refresh reload */

interface ThemeContextType {
  theme: string
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a MultiThemeProvider')
  }
  return context
}

interface MultiThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
}

export const MultiThemeProvider: FC<MultiThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  const [theme, setTheme] = useState(defaultTheme)

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme')
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('admin-theme', newTheme)
    document.documentElement.className = newTheme
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}