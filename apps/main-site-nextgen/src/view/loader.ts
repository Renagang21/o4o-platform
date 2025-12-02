import { ViewSchema } from './types';

// URL to viewId mapping
const URL_VIEW_MAP: Record<string, string> = {
  '/': 'home',
  '/dashboard/seller': 'seller-dashboard',
  '/dashboard/supplier': 'supplier-dashboard',
  '/dashboard/partner': 'partner-dashboard',
  '/products': 'product-list',
  '/login': 'login',
  '/signup': 'signup',
};

export async function loadView(url: string): Promise<ViewSchema> {
  const viewId = URL_VIEW_MAP[url] || 'not-found';

  try {
    // Dynamic import of JSON view files
    const json = await import(`../views/${viewId}.json`);
    return json.default as ViewSchema;
  } catch (error) {
    console.error(`Failed to load view: ${viewId}`, error);

    // Return fallback view
    return {
      viewId: 'error',
      layout: { type: 'MinimalLayout' },
      components: [
        {
          type: 'ErrorMessage',
          props: {
            message: `View not found: ${viewId}`,
          },
        },
      ],
    };
  }
}
