// Mock data for posts when database is not available
export const mockPosts = [
  {
    id: '1',
    title: 'Welcome to Neture Platform',
    slug: 'welcome-to-neture-platform',
    content: {
      blocks: [
        {
          id: 'block-1',
          type: 'core/paragraph',
          content: 'This is the first paragraph of the welcome post.'
        },
        {
          id: 'block-2',
          type: 'core/heading',
          content: 'Getting Started'
        },
        {
          id: 'block-3',
          type: 'core/paragraph',
          content: 'Here is how you can get started with our platform...'
        }
      ]
    },
    excerpt: 'Welcome to the Neture platform. This is your first post.',
    status: 'publish',
    author: {
      id: '1',
      name: 'Admin',
      email: 'admin@neture.co.kr'
    },
    categories: [
      { id: '1', name: '공지사항', slug: 'notice' }
    ],
    tags: [
      { id: '1', name: 'welcome', slug: 'welcome' },
      { id: '2', name: 'getting-started', slug: 'getting-started' }
    ],
    featuredImage: null,
    views: 234,
    publishedAt: new Date('2024-01-20').toISOString(),
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-01-20').toISOString()
  },
  {
    id: '2',
    title: 'How to Use the Editor',
    slug: 'how-to-use-the-editor',
    content: {
      blocks: [
        {
          id: 'block-4',
          type: 'core/paragraph',
          content: 'The Gutenberg editor is a powerful tool for creating content.'
        }
      ]
    },
    excerpt: 'Learn how to use the Gutenberg editor effectively.',
    status: 'publish',
    author: {
      id: '1',
      name: 'Admin',
      email: 'admin@neture.co.kr'
    },
    categories: [
      { id: '2', name: '튜토리얼', slug: 'tutorial' }
    ],
    tags: [
      { id: '3', name: 'editor', slug: 'editor' }
    ],
    featuredImage: null,
    views: 456,
    publishedAt: new Date('2024-01-18').toISOString(),
    createdAt: new Date('2024-01-18').toISOString(),
    updatedAt: new Date('2024-01-18').toISOString()
  },
  {
    id: '3',
    title: 'Draft: Upcoming Features',
    slug: 'draft-upcoming-features',
    content: {
      blocks: [
        {
          id: 'block-5',
          type: 'core/paragraph',
          content: 'We are working on exciting new features...'
        }
      ]
    },
    excerpt: 'Preview of upcoming features.',
    status: 'draft',
    author: {
      id: '1',
      name: 'Admin',
      email: 'admin@neture.co.kr'
    },
    categories: [
      { id: '3', name: '이벤트', slug: 'events' }
    ],
    tags: [],
    featuredImage: null,
    views: 0,
    publishedAt: null,
    createdAt: new Date('2024-01-22').toISOString(),
    updatedAt: new Date('2024-01-22').toISOString()
  }
];

// Helper to find post by ID
export const findPostById = (id: string) => {
  return mockPosts.find(post => post.id === id);
};

// Helper to update post
export const updatePost = (id: string, updates: any) => {
  const index = mockPosts.findIndex(post => post.id === id);
  if (index !== -1) {
    mockPosts[index] = { ...mockPosts[index], ...updates, updatedAt: new Date().toISOString() };
    return mockPosts[index];
  }
  return null;
};

// Helper to create new post
export const createPost = (postData: any) => {
  const newPost = {
    id: String(mockPosts.length + 1),
    ...postData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockPosts.push(newPost);
  return newPost;
};