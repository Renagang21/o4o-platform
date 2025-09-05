/**
 * Mock API for development
 * Use this when the actual API server authentication is not working
 */

import { CreatePostRequest, UpdatePostRequest, PostResponse, PostListResponse } from '@/types/post.types';

// Mock data storage (in-memory)
let mockPosts: any[] = [];
let mockPostIdCounter = 1;

/**
 * Mock Post API
 */
export const mockPostApi = {
  // Create post
  create: async (data: CreatePostRequest): Promise<PostResponse> => {
    const newPost = {
      id: `post-${mockPostIdCounter++}`,
      title: data.title,
      content: data.content,
      status: data.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com'
      }
    };
    
    mockPosts.push(newPost);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      data: newPost
    };
  },

  // Save draft
  saveDraft: async (data: CreatePostRequest | UpdatePostRequest): Promise<PostResponse> => {
    const isDraft = {
      ...data,
      status: 'draft'
    };
    
    if ('id' in data) {
      // Update existing draft
      const index = mockPosts.findIndex(p => p.id === data.id);
      if (index !== -1) {
        mockPosts[index] = {
          ...mockPosts[index],
          ...isDraft,
          updatedAt: new Date().toISOString()
        };
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return {
          success: true,
          data: mockPosts[index]
        };
      }
    }
    
    // Create new draft
    return mockPostApi.create(isDraft as CreatePostRequest);
  },

  // Publish post
  publish: async (id: string): Promise<PostResponse> => {
    const index = mockPosts.findIndex(p => p.id === id);
    
    if (index !== -1) {
      mockPosts[index] = {
        ...mockPosts[index],
        status: 'published',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        data: mockPosts[index]
      };
    }
    
    return {
      success: false,
      error: 'Post not found'
    };
  },

  // Get post
  get: async (id: string): Promise<PostResponse> => {
    const post = mockPosts.find(p => p.id === id);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (post) {
      return {
        success: true,
        data: post
      };
    }
    
    return {
      success: false,
      error: 'Post not found'
    };
  },

  // Update post
  update: async (data: UpdatePostRequest): Promise<PostResponse> => {
    const index = mockPosts.findIndex(p => p.id === data.id);
    
    if (index !== -1) {
      mockPosts[index] = {
        ...mockPosts[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        data: mockPosts[index]
      };
    }
    
    return {
      success: false,
      error: 'Post not found'
    };
  },

  // Delete post
  delete: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const index = mockPosts.findIndex(p => p.id === id);
    
    if (index !== -1) {
      mockPosts.splice(index, 1);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return { success: true };
    }
    
    return {
      success: false,
      error: 'Post not found'
    };
  },

  // List posts
  list: async (params?: any): Promise<PostListResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simple filtering
    let filteredPosts = [...mockPosts];
    
    if (params?.status && params.status !== 'all') {
      filteredPosts = filteredPosts.filter(p => p.status === params.status);
    }
    
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredPosts = filteredPosts.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.content?.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    const paginatedPosts = filteredPosts.slice(start, end);
    
    return {
      success: true,
      data: {
        posts: paginatedPosts,
        total: filteredPosts.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredPosts.length / pageSize)
      }
    };
  },

  // Auto save
  autoSave: async (id: string, data: Partial<CreatePostRequest>): Promise<PostResponse> => {
    const index = mockPosts.findIndex(p => p.id === id);
    
    if (index !== -1) {
      mockPosts[index] = {
        ...mockPosts[index],
        ...data,
        autoSavedAt: new Date().toISOString()
      };
      
      // Faster for auto-save
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        data: mockPosts[index]
      };
    }
    
    return {
      success: false,
      error: 'Post not found'
    };
  }
};

/**
 * Mock Categories API
 */
export const mockTaxonomyApi = {
  getCategories: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      success: true,
      data: [
        { id: '1', name: 'Technology', slug: 'technology', count: 10 },
        { id: '2', name: 'Business', slug: 'business', count: 8 },
        { id: '3', name: 'Design', slug: 'design', count: 15 },
        { id: '4', name: 'Marketing', slug: 'marketing', count: 5 }
      ]
    };
  },

  getTags: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      success: true,
      data: [
        { id: '1', name: 'JavaScript', slug: 'javascript', count: 20 },
        { id: '2', name: 'React', slug: 'react', count: 18 },
        { id: '3', name: 'TypeScript', slug: 'typescript', count: 15 },
        { id: '4', name: 'Node.js', slug: 'nodejs', count: 12 }
      ]
    };
  },

  createCategory: async (name: string, description?: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      data: {
        id: `cat-${Date.now()}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        count: 0
      }
    };
  },

  createTag: async (name: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      data: {
        id: `tag-${Date.now()}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        count: 0
      }
    };
  }
};

/**
 * Check if we should use mock API
 */
export const shouldUseMockApi = () => {
  // Use mock API in development when:
  // 1. Explicitly enabled via environment variable
  // 2. Or when API server is not available
  return import.meta.env.VITE_USE_MOCK_API === 'true' || 
         (import.meta.env.DEV && import.meta.env.VITE_FORCE_MOCK === 'true');
};