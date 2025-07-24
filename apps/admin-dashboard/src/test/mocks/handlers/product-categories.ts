import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock category data
let mockCategories = [
  {
    id: 'cat-1',
    name: '건강기능식품',
    slug: 'health-supplements',
    description: '비타민, 미네랄, 오메가3 등 건강기능식품',
    parentId: null,
    level: 0,
    path: [],
    active: true,
    order: 1,
    image: null,
    attributes: [
      {
        key: 'certification',
        label: '인증 마크',
        type: 'select',
        required: true,
        options: ['건강기능식품', 'GMP', 'HACCP']
      }
    ],
    shippingPolicy: {
      freeShippingThreshold: 50000,
      baseShippingFee: 3000
    },
    seo: {
      title: '건강기능식품 - O4O Platform',
      description: '프리미엄 건강기능식품을 만나보세요',
      keywords: ['건강기능식품', '비타민', '영양제']
    },
    productCount: 45,
    children: [
      {
        id: 'cat-1-1',
        name: '비타민',
        slug: 'vitamins',
        description: '각종 비타민 제품',
        parentId: 'cat-1',
        level: 1,
        path: ['cat-1'],
        active: true,
        order: 1,
        productCount: 23,
        children: [
          {
            id: 'cat-1-1-1',
            name: '종합비타민',
            slug: 'multivitamins',
            parentId: 'cat-1-1',
            level: 2,
            path: ['cat-1', 'cat-1-1'],
            active: true,
            order: 1,
            productCount: 12,
            children: []
          },
          {
            id: 'cat-1-1-2',
            name: '비타민C',
            slug: 'vitamin-c',
            parentId: 'cat-1-1',
            level: 2,
            path: ['cat-1', 'cat-1-1'],
            active: true,
            order: 2,
            productCount: 8,
            children: []
          }
        ]
      },
      {
        id: 'cat-1-2',
        name: '오메가3',
        slug: 'omega-3',
        description: '프리미엄 오메가3 제품',
        parentId: 'cat-1',
        level: 1,
        path: ['cat-1'],
        active: true,
        order: 2,
        productCount: 15,
        children: []
      }
    ]
  },
  {
    id: 'cat-2',
    name: '뷰티/화장품',
    slug: 'beauty-cosmetics',
    description: '스킨케어, 메이크업 제품',
    parentId: null,
    level: 0,
    path: [],
    active: true,
    order: 2,
    image: null,
    attributes: [
      {
        key: 'skin_type',
        label: '피부 타입',
        type: 'select',
        required: false,
        options: ['건성', '지성', '복합성', '민감성', '모든 피부']
      }
    ],
    shippingPolicy: {
      freeShippingThreshold: 30000,
      baseShippingFee: 2500
    },
    productCount: 67,
    children: [
      {
        id: 'cat-2-1',
        name: '스킨케어',
        slug: 'skincare',
        parentId: 'cat-2',
        level: 1,
        path: ['cat-2'],
        active: true,
        order: 1,
        productCount: 45,
        children: []
      }
    ]
  },
  {
    id: 'cat-3',
    name: '식품',
    slug: 'food',
    description: '건강한 먹거리',
    parentId: null,
    level: 0,
    path: [],
    active: true,
    order: 3,
    productCount: 0,
    children: []
  }
];

// Helper function to flatten category tree
const flattenCategories = (categories: any[], result: any[] = []): any[] => {
  categories.forEach(category => {
    result.push(category);
    if (category.children && category.children.length > 0) {
      flattenCategories(category.children, result);
    }
  });
  return result;
};

// Helper function to rebuild tree
const buildCategoryTree = (categories: any[]): any[] => {
  const categoryMap = new Map();
  const roots: any[] = [];

  // First, create a map of all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Then build the tree
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id);
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(category);
      }
    } else {
      roots.push(category);
    }
  });

  return roots;
};

export const productCategoryHandlers = [
  // Get category tree
  http.get(`${API_BASE}/v1/ecommerce/categories/tree`, () => {
    return HttpResponse.json({
      success: true,
      data: mockCategories
    });
  }),

  // Get all categories (flat)
  http.get(`${API_BASE}/v1/ecommerce/categories`, () => {
    const flatCategories = flattenCategories(mockCategories);
    return HttpResponse.json({
      success: true,
      data: flatCategories
    });
  }),

  // Get single category
  http.get(`${API_BASE}/v1/ecommerce/categories/:id`, ({ params }: any) => {
    const flatCategories = flattenCategories(mockCategories);
    const category = flatCategories.find(c => c.id === params.id);
    
    if (!category) {
      return HttpResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      success: true,
      data: category
    });
  }),

  // Create category
  http.post(`${API_BASE}/v1/ecommerce/categories`, async ({ request }: any) => {
    const data = await request.json();
    const flatCategories = flattenCategories(mockCategories);
    
    // Determine level and path
    let level = 0;
    let path: string[] = [];
    
    if (data.parentId) {
      const parent = flatCategories.find(c => c.id === data.parentId);
      if (parent) {
        level = parent.level + 1;
        path = [...parent.path, parent.id];
      }
    }
    
    const newCategory = {
      id: `cat-${Date.now()}`,
      ...data,
      level,
      path,
      productCount: 0,
      children: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to flat list
    flatCategories.push(newCategory);
    
    // Rebuild tree
    mockCategories = buildCategoryTree(flatCategories);
    
    return HttpResponse.json({
      success: true,
      data: newCategory
    }, { status: 201 });
  }),

  // Update category
  http.put(`${API_BASE}/v1/ecommerce/categories/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();
    const flatCategories = flattenCategories(mockCategories);
    
    const index = flatCategories.findIndex(c => c.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Update category
    flatCategories[index] = {
      ...flatCategories[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Rebuild tree
    mockCategories = buildCategoryTree(flatCategories);
    
    return HttpResponse.json({
      success: true,
      data: flatCategories[index]
    });
  }),

  // Delete category
  http.delete(`${API_BASE}/v1/ecommerce/categories/:id`, ({ params }: any) => {
    const { id } = params;
    const flatCategories = flattenCategories(mockCategories);
    
    const category = flatCategories.find(c => c.id === id);
    if (!category) {
      return HttpResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Check if has products
    if (category.productCount > 0) {
      return HttpResponse.json(
        { success: false, error: 'Cannot delete category with products' },
        { status: 400 }
      );
    }
    
    // Check if has children
    const hasChildren = flatCategories.some(c => c.parentId === id);
    if (hasChildren) {
      return HttpResponse.json(
        { success: false, error: 'Cannot delete category with subcategories' },
        { status: 400 }
      );
    }
    
    // Remove category
    const filteredCategories = flatCategories.filter(c => c.id !== id);
    
    // Rebuild tree
    mockCategories = buildCategoryTree(filteredCategories);
    
    return HttpResponse.json({
      success: true,
      message: '카테고리가 삭제되었습니다'
    });
  }),

  // Reorder categories
  http.post(`${API_BASE}/v1/ecommerce/categories/reorder`, async ({ request }: any) => {
    const { orderedIds } = await request.json();
    
    // In a real implementation, this would update the order field
    // For now, just return success
    
    return HttpResponse.json({
      success: true,
      message: '카테고리 순서가 변경되었습니다'
    });
  })
];