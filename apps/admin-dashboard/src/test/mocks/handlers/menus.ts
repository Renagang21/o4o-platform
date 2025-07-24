import { http, HttpResponse } from 'msw';
import type { Menu, MenuListResponse } from '@o4o/types';

// Mock data
const mockMenus: Menu[] = [
  {
    id: 'menu-1',
    name: '주 메뉴',
    location: 'primary',
    description: '사이트 상단에 표시되는 주 내비게이션',
    isActive: true,
    items: [
      {
        id: 'item-1',
        label: '홈',
        type: 'custom',
        url: '/',
        order: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'item-2',
        label: '회사 소개',
        type: 'page',
        pageId: 'page-1',
        url: '/about',
        order: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'item-3',
        label: '블로그',
        type: 'category',
        categoryId: '1',
        url: '/category/tech',
        order: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'item-4',
        label: '서비스',
        type: 'page',
        pageId: 'page-2',
        url: '/services',
        order: 3,
        children: [
          {
            id: 'item-4-1',
            label: '웹 개발',
            type: 'custom',
            url: '/services/web-development',
            parentId: 'item-4',
            order: 0,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          {
            id: 'item-4-2',
            label: '앱 개발',
            type: 'custom',
            url: '/services/app-development',
            parentId: 'item-4',
            order: 1,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'item-5',
        label: '문의하기',
        type: 'custom',
        url: '/contact',
        order: 4,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'menu-2',
    name: '푸터 메뉴',
    location: 'footer',
    description: '사이트 하단에 표시되는 메뉴',
    isActive: true,
    items: [
      {
        id: 'footer-1',
        label: '개인정보 처리방침',
        type: 'page',
        pageId: 'page-privacy',
        url: '/privacy',
        order: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'footer-2',
        label: '이용약관',
        type: 'page',
        pageId: 'page-terms',
        url: '/terms',
        order: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'footer-3',
        label: '사이트맵',
        type: 'custom',
        url: '/sitemap',
        order: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Store menus in memory for CRUD operations
let menus = [...mockMenus];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const menuHandlers = [
  // Get all menus
  http.get(`${API_BASE}/v1/menus`, () => {
    const response: MenuListResponse = {
      menus,
      total: menus.length,
    };
    return HttpResponse.json(response);
  }),

  // Get single menu
  http.get(`${API_BASE}/v1/menus/:id`, ({ params }: any) => {
    const menu = menus.find(m => m.id === params.id);
    if (!menu) {
      return HttpResponse.json({ error: 'Menu not found' }, { status: 404 });
    }
    return HttpResponse.json(menu);
  }),

  // Create menu
  http.post(`${API_BASE}/v1/menus`, async ({ request }: any) => {
    const data = await request.json() as any;
    const newMenu: Menu = {
      id: `menu-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    menus.push(newMenu);
    return HttpResponse.json(newMenu, { status: 201 });
  }),

  // Update menu
  http.put(`${API_BASE}/v1/menus/:id`, async ({ params, request }: any) => {
    const data = await request.json() as any;
    const index = menus.findIndex(m => m.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Menu not found' }, { status: 404 });
    }
    
    menus[index] = {
      ...menus[index],
      ...data,
      updatedAt: new Date(),
    };
    
    return HttpResponse.json(menus[index]);
  }),

  // Delete menu
  http.delete(`${API_BASE}/v1/menus/:id`, ({ params }: any) => {
    const index = menus.findIndex(m => m.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Menu not found' }, { status: 404 });
    }
    
    menus.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Toggle menu active status
  http.patch(`${API_BASE}/v1/menus/:id/active`, async ({ params, request }: any) => {
    const { isActive } = await request.json() as { isActive: boolean };
    const index = menus.findIndex(m => m.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Menu not found' }, { status: 404 });
    }
    
    // Deactivate other menus in the same location if activating
    if (isActive) {
      const location = menus[index].location;
      menus = menus.map(menu => 
        menu.location === location && menu.id !== params.id
          ? { ...menu, isActive: false }
          : menu
      );
    }
    
    menus[index] = {
      ...menus[index],
      isActive,
      updatedAt: new Date(),
    };
    
    return HttpResponse.json(menus[index]);
  }),
];