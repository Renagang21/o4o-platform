/**
 * Input Analyzer
 * Analyzes URL, command, or natural language input to determine intent
 */

import { AnalyzedIntent } from './types';

/**
 * Analyzes input and determines the intent
 * Supports:
 * - URL paths: /product-list, /dashboard/seller
 * - Commands: generate view product list
 * - Natural language: "상품 목록 페이지 만들어줘"
 */
export function analyzeInput(input: string): AnalyzedIntent {
  const normalized = input.toLowerCase().trim();

  // Remove common prefixes
  const cleanInput = normalized
    .replace(/^(generate view|create|make)\s+/i, '')
    .replace(/^\//, '');

  // Product/Commerce patterns
  if (
    cleanInput.includes('product') ||
    cleanInput.includes('상품') ||
    cleanInput.includes('shop')
  ) {
    if (cleanInput.includes('list') || cleanInput.includes('목록')) {
      return {
        viewId: 'product-list',
        category: 'commerce',
        action: 'list',
      };
    }
    if (cleanInput.includes('detail') || cleanInput.includes('상세')) {
      return {
        viewId: 'product-detail',
        category: 'commerce',
        action: 'detail',
      };
    }
  }

  // Cart patterns
  if (cleanInput.includes('cart') || cleanInput.includes('장바구니')) {
    return {
      viewId: 'cart',
      category: 'commerce',
      action: 'view',
    };
  }

  // Order patterns
  if (cleanInput.includes('order') || cleanInput.includes('주문')) {
    if (cleanInput.includes('list') || cleanInput.includes('목록')) {
      return {
        viewId: 'order-list',
        category: 'commerce',
        action: 'list',
      };
    }
    if (cleanInput.includes('detail') || cleanInput.includes('상세')) {
      return {
        viewId: 'order-detail',
        category: 'commerce',
        action: 'detail',
      };
    }
  }

  // Dashboard/Seller patterns
  if (
    cleanInput.includes('dashboard') ||
    cleanInput.includes('seller') ||
    cleanInput.includes('판매자')
  ) {
    return {
      viewId: 'seller-dashboard',
      category: 'dashboard',
      action: 'view',
    };
  }

  // Auth patterns
  if (cleanInput.includes('login') || cleanInput.includes('로그인')) {
    return {
      viewId: 'login',
      category: 'auth',
      action: 'view',
    };
  }

  if (cleanInput.includes('signup') || cleanInput.includes('가입')) {
    return {
      viewId: 'signup',
      category: 'auth',
      action: 'create',
    };
  }

  if (cleanInput.includes('reset') || cleanInput.includes('비밀번호')) {
    return {
      viewId: 'reset-password',
      category: 'auth',
      action: 'edit',
    };
  }

  // Admin patterns
  if (cleanInput.includes('admin')) {
    if (cleanInput.includes('seller')) {
      return {
        viewId: 'admin-seller-list',
        category: 'admin',
        action: 'list',
      };
    }
    if (cleanInput.includes('product')) {
      return {
        viewId: 'admin-product-list',
        category: 'admin',
        action: 'list',
      };
    }
    if (cleanInput.includes('order')) {
      return {
        viewId: 'admin-order-list',
        category: 'admin',
        action: 'list',
      };
    }
  }

  // Fallback: create a view ID from the input
  const viewId = cleanInput
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return {
    viewId: viewId || 'custom-view',
    category: 'other',
    action: 'custom',
  };
}

/**
 * Extracts parameters from URL-like input
 * Example: /products/:id → { id: 'dynamic' }
 */
export function extractParams(input: string): Record<string, string> {
  const params: Record<string, string> = {};
  const matches = input.matchAll(/:(\w+)/g);

  for (const match of matches) {
    params[match[1]] = 'dynamic';
  }

  return params;
}
