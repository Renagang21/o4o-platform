import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MultiThemeProvider } from '@/shared/components/theme/MultiThemeContext';
import App from './App';
import './styles/globals.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsxs(MultiThemeProvider, { defaultTheme: "light", children: [_jsx(App, {}), _jsx("div", { id: "toaster" })] }) }) }) }));
//# sourceMappingURL=main.js.map