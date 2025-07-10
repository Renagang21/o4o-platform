import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
const ThemeContext = createContext(undefined);
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a MultiThemeProvider');
    }
    return context;
};
export const MultiThemeProvider = ({ children, defaultTheme = 'light' }) => {
    const [theme, setTheme] = useState(defaultTheme);
    useEffect(() => {
        const savedTheme = localStorage.getItem('admin-theme');
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);
    const handleSetTheme = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('admin-theme', newTheme);
        document.documentElement.className = newTheme;
    };
    return (_jsx(ThemeContext.Provider, { value: { theme, setTheme: handleSetTheme }, children: children }));
};
//# sourceMappingURL=MultiThemeContext.js.map