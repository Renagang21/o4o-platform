import { ReactElement } from 'react';
import { RenderOptions } from '@testing-library/react';
declare const customRender: (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => import("@testing-library/react").RenderResult<typeof import("@testing-library/dom/types/queries"), HTMLElement, HTMLElement>;
export * from '@testing-library/react';
export { customRender as render };
export declare const waitForLoadingToFinish: () => Promise<unknown>;
export declare const mockToast: {
    success: import("vitest").Mock<(...args: any[]) => any>;
    error: import("vitest").Mock<(...args: any[]) => any>;
    loading: import("vitest").Mock<(...args: any[]) => any>;
    dismiss: import("vitest").Mock<(...args: any[]) => any>;
};
export declare const setupToastMocks: () => {
    success: import("vitest").Mock<(...args: any[]) => any>;
    error: import("vitest").Mock<(...args: any[]) => any>;
    loading: import("vitest").Mock<(...args: any[]) => any>;
    dismiss: import("vitest").Mock<(...args: any[]) => any>;
};
export declare const clearToastMocks: () => void;
//# sourceMappingURL=render.d.ts.map