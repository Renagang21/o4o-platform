import React, { createContext, useContext, useState, useEffect } from 'react'

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
  children: React.ReactNode
  defaultTheme?: string
}

export const MultiThemeProvider: React.FC<MultiThemeProviderProps> = ({ 
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