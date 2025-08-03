import { http, HttpResponse } from 'msw';
import type { CustomPostType, CustomPostTypeListResponse } from '@o4o/types';

// Mock data
const mockCustomPostTypes: CustomPostType[] = [
  {
    id: 'cpt-1',
    name: '제품',
    singularName: '제품',
    pluralName: '제품들',
    slug: 'product',
    description: '판매 제품을 관리하는 게시물 유형',
    icon: '🛍️',
    menuPosition: 5,
    isPublic: true,
    showInMenu: true,
    showInAdminBar: true,
    hasArchive: true,
    supports: {
      title: true,
      editor: true,
      excerpt: true,
      thumbnail: true,
      customFields: true,
      comments: true,
      revisions: true,
      author: true,
      pageAttributes: false,
    },
    labels: {
      addNew: '새 제품',
      addNewItem: '새 제품 추가',
      editItem: '제품 편집',
      newItem: '새 제품',
      viewItem: '제품 보기',
      searchItems: '제품 검색',
      notFound: '제품을 찾을 수 없습니다',
      notFoundInTrash: '휴지통에 제품이 없습니다',
      allItems: '모든 제품',
      menuName: '제품',
    },
    taxonomies: ['category', 'tag'],
    fieldGroups: [
      {
        id: 'fg-1',
        name: '제품 정보',
        key: 'product_info',
        description: '제품의 기본 정보',
        fields: [
          {
            id: 'field-1',
            name: '가격',
            key: 'price',
            type: 'number',
            label: '제품 가격',
            description: '제품의 판매 가격을 입력하세요',
            required: true,
            min: 0,
          },
          {
            id: 'field-2',
            name: 'SKU',
            key: 'sku',
            type: 'text',
            label: '재고 관리 코드',
            placeholder: 'PRD-001',
            required: true,
          },
          {
            id: 'field-3',
            name: '재고 수량',
            key: 'stock_quantity',
            type: 'number',
            label: '재고 수량',
            defaultValue: 0,
            min: 0,
          },
        ],
        position: 'normal',
        order: 0,
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cpt-2',
    name: '포트폴리오',
    singularName: '포트폴리오',
    pluralName: '포트폴리오',
    slug: 'portfolio',
    description: '작업물과 프로젝트를 소개하는 게시물 유형',
    icon: '🎨',
    menuPosition: 6,
    isPublic: true,
    showInMenu: true,
    showInAdminBar: true,
    hasArchive: true,
    supports: {
      title: true,
      editor: true,
      excerpt: true,
      thumbnail: true,
      customFields: true,
      comments: false,
      revisions: true,
      author: true,
      pageAttributes: true,
    },
    labels: {
      addNew: '새 포트폴리오',
      addNewItem: '새 포트폴리오 추가',
      editItem: '포트폴리오 편집',
      menuName: '포트폴리오',
    },
    taxonomies: ['category'],
    fieldGroups: [
      {
        id: 'fg-2',
        name: '프로젝트 정보',
        key: 'project_info',
        description: '프로젝트의 상세 정보',
        fields: [
          {
            id: 'field-4',
            name: '클라이언트',
            key: 'client',
            type: 'text',
            label: '클라이언트 이름',
          },
          {
            id: 'field-5',
            name: '프로젝트 URL',
            key: 'project_url',
            type: 'url',
            label: '프로젝트 링크',
            placeholder: 'https://example.com',
          },
          {
            id: 'field-6',
            name: '완료일',
            key: 'completion_date',
            type: 'date',
            label: '프로젝트 완료일',
          },
        ],
        position: 'normal',
        order: 0,
      },
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Store CPTs in memory for CRUD operations
let customPostTypes = [...mockCustomPostTypes];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const customPostTypeHandlers = [
  // Get all custom post types
  http.get(`${API_BASE}/v1/custom-post-types`, () => {
    const response: CustomPostTypeListResponse = {
      postTypes: customPostTypes,
      total: customPostTypes.length,
    };
    return HttpResponse.json(response);
  }),

  // Get single custom post type
  http.get(`${API_BASE}/v1/custom-post-types/:id`, ({ params }: any) => {
    const cpt = customPostTypes.find((c: any) => c.id === params.id);
    if (!cpt) {
      return HttpResponse.json({ error: 'Custom post type not found' }, { status: 404 });
    }
    return HttpResponse.json(cpt);
  }),

  // Create custom post type
  http.post(`${API_BASE}/v1/custom-post-types`, async ({ request }: any) => {
    const data = await request.json() as any;
    const newCPT: CustomPostType = {
      id: `cpt-${Date.now()}`,
      ...data,
      fieldGroups: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    customPostTypes.push(newCPT);
    return HttpResponse.json(newCPT, { status: 201 });
  }),

  // Update custom post type
  http.put(`${API_BASE}/v1/custom-post-types/:id`, async ({ params, request }: any) => {
    const data = await request.json() as any;
    const index = customPostTypes.findIndex(c => c.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Custom post type not found' }, { status: 404 });
    }
    
    customPostTypes[index] = {
      ...customPostTypes[index],
      ...data,
      updatedAt: new Date(),
    };
    
    return HttpResponse.json(customPostTypes[index]);
  }),

  // Delete custom post type
  http.delete(`${API_BASE}/v1/custom-post-types/:id`, ({ params }: any) => {
    const index = customPostTypes.findIndex(c => c.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Custom post type not found' }, { status: 404 });
    }
    
    customPostTypes.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Update field groups for custom post type
  http.put(`${API_BASE}/v1/custom-post-types/:id/field-groups`, async ({ params, request }) => {
    await request.json() as { fieldGroupIds: string[] };
    const { id } = params as { id: string };
    const index = customPostTypes.findIndex(c => c.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Custom post type not found' }, { status: 404 });
    }
    
    // In a real implementation, this would look up field groups by ID
    // For now, we'll just keep the existing field groups
    customPostTypes[index] = {
      ...customPostTypes[index],
      updatedAt: new Date(),
    };
    
    return HttpResponse.json(customPostTypes[index]);
  }),

  // Get custom post type posts (dynamic endpoint)
  http.get(`${API_BASE}/v1/posts`, ({ request }: any) => {
    const url = new URL(request.url);
    const postType = url.searchParams.get('post_type');
    
    // If it's a custom post type request
    if (postType && postType !== 'post' && postType !== 'page') {
      const cpt = customPostTypes.find((c: any) => c.slug === postType);
      if (!cpt) {
        return HttpResponse.json({ error: 'Post type not found' }, { status: 404 });
      }

      // Return mock posts for this CPT
      const mockPosts = [
        {
          id: `${postType}-1`,
          postType: postType,
          title: `샘플 ${cpt.singularName} 1`,
          slug: `sample-${postType}-1`,
          content: '<p>샘플 콘텐츠입니다.</p>',
          status: 'published',
          author: {
            id: '1',
            name: '관리자',
            email: 'admin@example.com',
          },
          customFields: {
            price: 50000,
            sku: 'PRD-001',
            stock_quantity: 10,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return HttpResponse.json({
        posts: mockPosts,
        total: mockPosts.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    }

    // Default behavior for regular posts/pages
    return HttpResponse.json({ posts: [], total: 0 });
  }),
];