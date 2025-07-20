import { http, HttpResponse } from 'msw';
import type { Post, PostCategory, Tag, PostListResponse } from '@o4o/types';

// Mock data
const mockCategories: PostCategory[] = [
  {
    id: '1',
    name: '기술',
    slug: 'tech',
    description: '기술 관련 글',
    postCount: 15,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: '디자인',
    slug: 'design',
    description: '디자인 관련 글',
    postCount: 8,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: '마케팅',
    slug: 'marketing',
    description: '마케팅 관련 글',
    postCount: 12,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

const mockTags: Tag[] = [
  {
    id: '1',
    name: 'React',
    slug: 'react',
    postCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'TypeScript',
    slug: 'typescript',
    postCount: 8,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'Node.js',
    slug: 'nodejs',
    postCount: 6,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

const mockPosts: Post[] = [
  {
    id: '1',
    title: 'React 19의 새로운 기능들',
    slug: 'react-19-new-features',
    content: '<p>React 19에서 소개된 새로운 기능들을 살펴봅니다...</p>',
    excerpt: 'React 19의 혁신적인 기능들과 개선사항을 알아봅니다.',
    type: 'post',
    status: 'published',
    visibility: 'public',
    authorId: '1',
    author: {
      id: '1',
      name: '김철수',
      email: 'admin@example.com',
    },
    categoryIds: ['1'],
    categories: [mockCategories[0]],
    tagIds: ['1', '2'],
    tags: [mockTags[0], mockTags[1]],
    meta: {
      seoTitle: 'React 19 새로운 기능 완벽 가이드',
      seoDescription: 'React 19의 모든 새로운 기능과 변경사항을 상세히 설명합니다.',
      seoKeywords: ['React', 'React 19', 'JavaScript'],
    },
    publishedAt: new Date('2024-07-15'),
    createdAt: new Date('2024-07-10'),
    updatedAt: new Date('2024-07-15'),
    viewCount: 1250,
    commentCount: 23,
  },
  {
    id: '2',
    title: 'TypeScript 5.0 마이그레이션 가이드',
    slug: 'typescript-5-migration-guide',
    content: '<p>TypeScript 5.0으로 마이그레이션하는 방법을 단계별로 설명합니다...</p>',
    excerpt: 'TypeScript 5.0의 새로운 기능과 마이그레이션 전략',
    type: 'post',
    status: 'published',
    visibility: 'public',
    authorId: '1',
    author: {
      id: '1',
      name: '김철수',
      email: 'admin@example.com',
    },
    categoryIds: ['1'],
    categories: [mockCategories[0]],
    tagIds: ['2'],
    tags: [mockTags[1]],
    meta: {},
    publishedAt: new Date('2024-07-12'),
    createdAt: new Date('2024-07-08'),
    updatedAt: new Date('2024-07-12'),
    viewCount: 890,
    commentCount: 15,
  },
  {
    id: '3',
    title: '효과적인 UI/UX 디자인 원칙',
    slug: 'effective-ui-ux-design-principles',
    content: '<p>사용자 경험을 향상시키는 디자인 원칙들을 소개합니다...</p>',
    excerpt: '성공적인 제품을 만드는 UI/UX 디자인의 핵심 원칙',
    type: 'post',
    status: 'draft',
    visibility: 'public',
    authorId: '2',
    author: {
      id: '2',
      name: '이영희',
      email: 'designer@example.com',
    },
    categoryIds: ['2'],
    categories: [mockCategories[1]],
    tagIds: [],
    tags: [],
    meta: {},
    createdAt: new Date('2024-07-18'),
    updatedAt: new Date('2024-07-18'),
    viewCount: 0,
    commentCount: 0,
  },
];

const mockPages: Post[] = [
  {
    id: 'page-1',
    title: '회사 소개',
    slug: 'about',
    content: '<p>우리 회사는 혁신적인 기술로...</p>',
    type: 'page',
    status: 'published',
    visibility: 'public',
    authorId: '1',
    author: {
      id: '1',
      name: '김철수',
      email: 'admin@example.com',
    },
    meta: {},
    publishedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'page-2',
    title: '서비스',
    slug: 'services',
    content: '<p>다양한 서비스를 제공합니다...</p>',
    type: 'page',
    status: 'published',
    visibility: 'public',
    authorId: '1',
    author: {
      id: '1',
      name: '김철수',
      email: 'admin@example.com',
    },
    meta: {},
    publishedAt: new Date('2024-01-02'),
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

// Store posts in memory for CRUD operations
let posts = [...mockPosts, ...mockPages];

export const postHandlers = [
  // Get posts/pages list
  http.get('/api/v1/posts', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'post';
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filteredPosts = posts.filter(p => p.type === type);

    if (status && status !== 'all') {
      filteredPosts = filteredPosts.filter(p => p.status === status);
    }

    if (search) {
      filteredPosts = filteredPosts.filter(p => 
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    const response: PostListResponse = {
      posts: paginatedPosts,
      total: filteredPosts.length,
      page,
      limit,
      totalPages: Math.ceil(filteredPosts.length / limit),
    };

    return HttpResponse.json(response);
  }),

  // Get single post
  http.get('/api/v1/posts/:id', ({ params }) => {
    const post = posts.find(p => p.id === params.id);
    if (!post) {
      return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return HttpResponse.json(post);
  }),

  // Create post
  http.post('/api/v1/posts', async ({ request }) => {
    const data = await request.json() as any;
    const newPost: Post = {
      id: `post-${Date.now()}`,
      ...data,
      author: {
        id: '1',
        name: '김철수',
        email: 'admin@example.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
      commentCount: 0,
    };
    
    posts.unshift(newPost);
    return HttpResponse.json(newPost, { status: 201 });
  }),

  // Update post
  http.put('/api/v1/posts/:id', async ({ params, request }) => {
    const data = await request.json() as any;
    const index = posts.findIndex(p => p.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    posts[index] = {
      ...posts[index],
      ...data,
      updatedAt: new Date(),
    };
    
    return HttpResponse.json(posts[index]);
  }),

  // Delete post
  http.delete('/api/v1/posts/:id', ({ params }) => {
    const index = posts.findIndex(p => p.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    posts.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Duplicate post
  http.post('/api/v1/posts/:id/duplicate', ({ params }) => {
    const post = posts.find(p => p.id === params.id);
    
    if (!post) {
      return HttpResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const duplicatedPost: Post = {
      ...post,
      id: `post-${Date.now()}`,
      title: `${post.title} (복사본)`,
      slug: `${post.slug}-copy`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: undefined,
      viewCount: 0,
      commentCount: 0,
    };
    
    posts.unshift(duplicatedPost);
    return HttpResponse.json(duplicatedPost, { status: 201 });
  }),

  // Get categories
  http.get('/api/v1/categories', () => {
    return HttpResponse.json(mockCategories);
  }),

  // Get tags
  http.get('/api/v1/tags', () => {
    return HttpResponse.json(mockTags);
  }),

  // Create category
  http.post('/api/v1/categories', async ({ request }) => {
    const data = await request.json() as any;
    const newCategory: PostCategory = {
      id: `cat-${Date.now()}`,
      name: data.name,
      slug: data.slug,
      description: data.description,
      parentId: data.parentId,
      postCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockCategories.push(newCategory);
    return HttpResponse.json(newCategory, { status: 201 });
  }),

  // Update category
  http.put('/api/v1/categories/:id', async ({ params, request }) => {
    const data = await request.json() as any;
    const index = mockCategories.findIndex(c => c.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    mockCategories[index] = {
      ...mockCategories[index],
      ...data,
      updatedAt: new Date(),
    };
    
    return HttpResponse.json(mockCategories[index]);
  }),

  // Delete category
  http.delete('/api/v1/categories/:id', ({ params }) => {
    const index = mockCategories.findIndex(c => c.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    mockCategories.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Create tag
  http.post('/api/v1/tags', async ({ request }) => {
    const data = await request.json() as any;
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: data.name,
      slug: data.slug,
      description: data.description,
      postCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockTags.push(newTag);
    return HttpResponse.json(newTag, { status: 201 });
  }),

  // Update tag
  http.put('/api/v1/tags/:id', async ({ params, request }) => {
    const data = await request.json() as any;
    const index = mockTags.findIndex(t => t.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    mockTags[index] = {
      ...mockTags[index],
      ...data,
      updatedAt: new Date(),
    };
    
    return HttpResponse.json(mockTags[index]);
  }),

  // Delete tag
  http.delete('/api/v1/tags/:id', ({ params }) => {
    const index = mockTags.findIndex(t => t.id === params.id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    mockTags.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Bulk delete tags
  http.post('/api/v1/tags/bulk-delete', async ({ request }) => {
    const { ids } = await request.json() as { ids: string[] };
    
    ids.forEach(id => {
      const index = mockTags.findIndex(t => t.id === id);
      if (index !== -1) {
        mockTags.splice(index, 1);
      }
    });
    
    return HttpResponse.json({ success: true, deleted: ids.length });
  }),
];