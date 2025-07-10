import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
export const mswTestUtils = {
    start: () => server.listen({ onUnhandledRequest: 'error' }),
    stop: () => server.close(),
    reset: () => server.resetHandlers(),
    use: (...handlers) => server.use(...handlers),
};
//# sourceMappingURL=server.js.map