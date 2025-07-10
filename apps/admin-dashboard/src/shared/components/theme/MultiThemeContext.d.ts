import React from 'react';
interface ThemeContextType {
    theme: string;
    setTheme: (theme: string) => void;
}
export declare const useTheme: () => ThemeContextType;
interface MultiThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: string;
}
export declare const MultiThemeProvider: React.FC<MultiThemeProviderProps>;
export {};
//# sourceMappingURL=MultiThemeContext.d.ts.map