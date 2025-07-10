import { jsx as _jsx } from "react/jsx-runtime";
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,
            staleTime: 0,
        },
        mutations: {
            retry: false,
        },
    },
});
const AllProviders = ({ children }) => {
    const queryClient = createTestQueryClient();
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: children }) }));
};
const customRender = (ui, options) => {
    return render(ui, { wrapper: AllProviders, ...options });
};
export * from '@testing-library/react';
export { customRender as render };
export const waitForLoadingToFinish = () => {
    return new Promise((resolve) => setTimeout(resolve, 0));
};
export const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
};
export const setupToastMocks = () => {
    return mockToast;
};
export const clearToastMocks = () => {
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockToast.loading.mockClear();
    mockToast.dismiss.mockClear();
};
//# sourceMappingURL=render.js.map