import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver for tests
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;
window.IntersectionObserverEntry = vi.fn();

// Mock ResizeObserver for tests  
const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.ResizeObserver = mockResizeObserver;

// Mock UI components that might not exist
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: vi.fn(({ children }) => children),
  DropdownMenuContent: vi.fn(({ children }) => children),
  DropdownMenuItem: vi.fn(({ children }) => children),
  DropdownMenuLabel: vi.fn(({ children }) => children),
  DropdownMenuSeparator: vi.fn(() => null),
  DropdownMenuTrigger: vi.fn(({ children }) => children),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'test-id' }),
    useLocation: () => ({ pathname: '/test' }),
  };
});

// Mock API client
vi.mock('../api/base', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

// Setup MSW handlers if using mock mode
if (import.meta.env.VITE_USE_MOCK === 'true') {
  // Import all handlers
  import('./mocks/handlers/posts');
  import('./mocks/handlers/media');
  import('./mocks/handlers/templates');
  import('./mocks/handlers/widgets');
  import('./mocks/handlers/menus');
  import('./mocks/handlers/custom-post-types');
  import('./mocks/handlers/acf');
  import('./mocks/handlers/affiliate');
  import('./mocks/handlers/forum');
  import('./mocks/handlers/product-categories');
  import('./mocks/handlers/order-status');
  import('./mocks/handlers/inventory');
  import('./mocks/handlers/toss-payments');
  import('./mocks/handlers/settlements');
  import('./mocks/handlers/platform-apps');
}