import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock data
let mockCategories = [
  {
    id: 'cat-1',
    name: '일반 토론',
    slug: 'general-discussion',
    description: '일반적인 주제에 대한 토론',
    postCount: 234,
    active: true,
    order: 1,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'cat-2',
    name: '제품 리뷰',
    slug: 'product-reviews',
    description: '제품에 대한 사용 후기',
    postCount: 567,
    active: true,
    order: 2,
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString()
  },
  {
    id: 'cat-3',
    name: 'Q&A',
    slug: 'questions-answers',
    description: '질문과 답변',
    postCount: 433,
    active: true,
    order: 3,
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString()
  }
];

let mockPosts = [
  {
    id: 'post-1',
    title: '플랫폼 사용 후기 공유합니다',
    content: '안녕하세요. O4O 플랫폼을 사용한지 3개월이 되었는데요, 정말 만족스럽습니다. 특히 제휴 마케팅 기능이 강력해서 매출이 30% 증가했습니다.',
    author: {
      id: 'user-1',
      name: '김철수',
      avatar: null,
      role: '일반회원'
    },
    category: mockCategories[1],
    status: 'published',
    views: 1234,
    replyCount: 23,
    isPinned: true,
    isLocked: false,
    createdAt: new Date('2024-03-20T10:00:00').toISOString(),
    updatedAt: new Date('2024-03-20T10:00:00').toISOString()
  },
  {
    id: 'post-2',
    title: '디지털 사이니지 기능 문의드립니다',
    content: '디지털 사이니지 기능을 사용하려고 하는데, 여러 대의 디스플레이를 동시에 관리할 수 있나요? 매장이 3곳이라서 통합 관리가 필요합니다.',
    author: {
      id: 'user-2',
      name: '이영희',
      avatar: null,
      role: '비즈니스'
    },
    category: mockCategories[2],
    status: 'published',
    views: 567,
    replyCount: 12,
    isPinned: false,
    isLocked: false,
    createdAt: new Date('2024-03-19T14:30:00').toISOString(),
    updatedAt: new Date('2024-03-19T14:30:00').toISOString()
  },
  {
    id: 'post-3',
    title: '제휴 마케팅 수수료 정산 관련',
    content: '제휴 마케팅 수수료는 언제 정산되나요? 그리고 최소 정산 금액이 있는지 궁금합니다.',
    author: {
      id: 'user-3',
      name: '박민수',
      avatar: null,
      role: '제휴사'
    },
    category: mockCategories[0],
    status: 'published',
    views: 234,
    replyCount: 5,
    isPinned: false,
    isLocked: false,
    createdAt: new Date('2024-03-18T09:15:00').toISOString(),
    updatedAt: new Date('2024-03-18T09:15:00').toISOString()
  },
  {
    id: 'post-4',
    title: '[공지] 포럼 이용 규칙 안내',
    content: '포럼을 이용하실 때는 다음 규칙을 준수해 주세요:\n\n1. 상호 존중하는 대화\n2. 광고성 게시글 금지\n3. 개인정보 보호\n4. 저작권 준수',
    author: {
      id: 'admin-1',
      name: '관리자',
      avatar: null,
      role: '관리자'
    },
    category: mockCategories[0],
    status: 'published',
    views: 3456,
    replyCount: 0,
    isPinned: true,
    isLocked: true,
    createdAt: new Date('2024-01-01T00:00:00').toISOString(),
    updatedAt: new Date('2024-01-01T00:00:00').toISOString()
  },
  {
    id: 'post-5',
    title: '신고된 게시글입니다',
    content: '이 게시글은 커뮤니티 규칙을 위반하여 신고되었습니다.',
    author: {
      id: 'user-4',
      name: '문제사용자',
      avatar: null,
      role: '일반회원'
    },
    category: mockCategories[0],
    status: 'reported',
    views: 45,
    replyCount: 2,
    isPinned: false,
    isLocked: true,
    createdAt: new Date('2024-03-17T16:45:00').toISOString(),
    updatedAt: new Date('2024-03-17T16:45:00').toISOString()
  }
];

let mockComments = [
  {
    id: 'comment-1',
    postId: 'post-1',
    content: '저도 사용해보니 정말 좋더라구요! 특히 통계 기능이 강력해서 마케팅 전략 수립에 큰 도움이 됩니다.',
    author: {
      id: 'user-5',
      name: '정수민',
      avatar: null,
      role: '일반회원'
    },
    parentId: null,
    isEdited: false,
    createdAt: new Date('2024-03-20T11:00:00').toISOString(),
    updatedAt: new Date('2024-03-20T11:00:00').toISOString()
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    content: '어떤 제휴 채널을 주로 사용하시나요?',
    author: {
      id: 'user-6',
      name: '최지훈',
      avatar: null,
      role: '비즈니스'
    },
    parentId: null,
    isEdited: false,
    createdAt: new Date('2024-03-20T12:00:00').toISOString(),
    updatedAt: new Date('2024-03-20T12:00:00').toISOString()
  },
  {
    id: 'comment-3',
    postId: 'post-1',
    content: '주로 인플루언서 마케팅과 블로그 제휴를 활용하고 있습니다. 전환율이 가장 좋더라구요.',
    author: {
      id: 'user-1',
      name: '김철수',
      avatar: null,
      role: '일반회원'
    },
    parentId: 'comment-2',
    isEdited: false,
    createdAt: new Date('2024-03-20T13:00:00').toISOString(),
    updatedAt: new Date('2024-03-20T13:00:00').toISOString()
  },
  {
    id: 'comment-4',
    postId: 'post-2',
    content: '네, 가능합니다! 중앙 관리 시스템에서 모든 디스플레이를 통합 관리할 수 있습니다. 각 매장별로 다른 콘텐츠를 표시하거나 동일한 콘텐츠를 동기화할 수도 있어요.',
    author: {
      id: 'admin-1',
      name: '관리자',
      avatar: null,
      role: '관리자'
    },
    parentId: null,
    isEdited: false,
    createdAt: new Date('2024-03-19T15:00:00').toISOString(),
    updatedAt: new Date('2024-03-19T15:00:00').toISOString()
  }
];

// Helper function to build comment tree
const buildCommentTree = (comments: any[]) => {
  const commentMap = new Map();
  const roots: any[] = [];

  // First pass: create map
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build tree
  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id);
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentNode);
      }
    } else {
      roots.push(commentNode);
    }
  });

  return roots;
};

export const forumHandlers = [
  // Get all categories
  http.get(`${API_BASE}/v1/forum/categories`, () => {
    return HttpResponse.json({
      success: true,
      data: mockCategories
    });
  }),

  // Create category
  http.post(`${API_BASE}/v1/forum/categories`, async ({ request }: any) => {
    const data = await request.json();
    const newCategory = {
      id: `cat-${Date.now()}`,
      ...data,
      postCount: 0,
      order: mockCategories.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockCategories.push(newCategory);
    
    return HttpResponse.json({
      success: true,
      data: newCategory
    }, { status: 201 });
  }),

  // Update category
  http.put(`${API_BASE}/v1/forum/categories/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();
    
    const index = mockCategories.findIndex(c => c.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    mockCategories[index] = {
      ...mockCategories[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json({
      success: true,
      data: mockCategories[index]
    });
  }),

  // Delete category
  http.delete(`${API_BASE}/v1/forum/categories/:id`, ({ params }: any) => {
    const { id } = params;
    const index = mockCategories.findIndex(c => c.id === id);
    
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    mockCategories.splice(index, 1);
    
    return HttpResponse.json({
      success: true,
      message: '카테고리가 삭제되었습니다'
    });
  }),

  // Get all posts
  http.get(`${API_BASE}/v1/forum/posts`, ({ request }: any) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    
    let filteredPosts = [...mockPosts];
    
    if (category && category !== 'all') {
      filteredPosts = filteredPosts.filter(post => post.category.id === category);
    }
    
    if (status && status !== 'all') {
      filteredPosts = filteredPosts.filter(post => post.status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower) ||
        post.author.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by pinned first, then by date
    filteredPosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return HttpResponse.json({
      success: true,
      data: filteredPosts
    });
  }),

  // Get single post
  http.get(`${API_BASE}/v1/forum/posts/:id`, ({ params }: any) => {
    const post = mockPosts.find(p => p.id === params.id);
    
    if (!post) {
      return HttpResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    post.views++;
    
    return HttpResponse.json({
      success: true,
      data: post
    });
  }),

  // Create post
  http.post(`${API_BASE}/v1/forum/posts`, async ({ request }: any) => {
    const data = await request.json();
    const category = mockCategories.find(c => c.id === data.categoryId);
    
    if (!category) {
      return HttpResponse.json(
        { success: false, error: 'Category not found' },
        { status: 400 }
      );
    }
    
    const newPost = {
      id: `post-${Date.now()}`,
      title: data.title,
      content: data.content,
      author: {
        id: 'admin-1',
        name: '관리자',
        avatar: null,
        role: '관리자'
      },
      category: category,
      status: data.status || 'published',
      views: 0,
      replyCount: 0,
      isPinned: data.isPinned || false,
      isLocked: data.isLocked || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockPosts.unshift(newPost);
    category.postCount++;
    
    return HttpResponse.json({
      success: true,
      data: newPost
    }, { status: 201 });
  }),

  // Update post
  http.put(`${API_BASE}/v1/forum/posts/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();
    
    const index = mockPosts.findIndex(p => p.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    const category = data.categoryId ? mockCategories.find(c => c.id === data.categoryId) : mockPosts[index].category;
    
    mockPosts[index] = {
      ...mockPosts[index],
      ...data,
      category: category || mockPosts[index].category,
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json({
      success: true,
      data: mockPosts[index]
    });
  }),

  // Toggle pin
  http.post(`${API_BASE}/v1/forum/posts/:id/toggle-pin`, ({ params }: any) => {
    const { id } = params;
    const post = mockPosts.find(p => p.id === id);
    
    if (!post) {
      return HttpResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    post.isPinned = !post.isPinned;
    post.updatedAt = new Date().toISOString();
    
    return HttpResponse.json({
      success: true,
      data: post
    });
  }),

  // Toggle lock
  http.post(`${API_BASE}/v1/forum/posts/:id/toggle-lock`, ({ params }: any) => {
    const { id } = params;
    const post = mockPosts.find(p => p.id === id);
    
    if (!post) {
      return HttpResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    post.isLocked = !post.isLocked;
    post.updatedAt = new Date().toISOString();
    
    return HttpResponse.json({
      success: true,
      data: post
    });
  }),

  // Get comments for a post
  http.get(`${API_BASE}/v1/forum/posts/:id/comments`, ({ params }: any) => {
    const postComments = mockComments.filter(c => c.postId === params.id);
    const commentTree = buildCommentTree(postComments);
    
    return HttpResponse.json({
      success: true,
      data: commentTree
    });
  }),

  // Create comment
  http.post(`${API_BASE}/v1/forum/posts/:id/comments`, async ({ params, request }: any) => {
    const { id: postId } = params;
    const data = await request.json();
    
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      return HttpResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }
    
    const newComment = {
      id: `comment-${Date.now()}`,
      postId: postId,
      content: data.content,
      author: {
        id: 'admin-1',
        name: '관리자',
        avatar: null,
        role: '관리자'
      },
      parentId: data.parentId || null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockComments.push(newComment);
    post.replyCount++;
    
    return HttpResponse.json({
      success: true,
      data: newComment
    }, { status: 201 });
  }),

  // Update comment
  http.put(`${API_BASE}/v1/forum/comments/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();
    
    const index = mockComments.findIndex(c => c.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    mockComments[index] = {
      ...mockComments[index],
      content: data.content,
      isEdited: true,
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json({
      success: true,
      data: mockComments[index]
    });
  }),

  // Delete comment
  http.delete(`${API_BASE}/v1/forum/comments/:id`, ({ params }: any) => {
    const { id } = params;
    const comment = mockComments.find(c => c.id === id);
    
    if (!comment) {
      return HttpResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    // Find and decrement post reply count
    const post = mockPosts.find(p => p.id === comment.postId);
    if (post) {
      post.replyCount--;
    }
    
    // Remove comment and its replies
    const removeCommentAndReplies = (commentId: string) => {
      const index = mockComments.findIndex(c => c.id === commentId);
      if (index !== -1) {
        mockComments.splice(index, 1);
        // Remove replies
        const replies = mockComments.filter(c => c.parentId === commentId);
        replies.forEach(reply => removeCommentAndReplies(reply.id));
      }
    };
    
    removeCommentAndReplies(id);
    
    return HttpResponse.json({
      success: true,
      message: '댓글이 삭제되었습니다'
    });
  })
];