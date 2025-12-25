/**
 * Forum Routes
 * =============================================================================
 * Domain-specific routes for forum functionality.
 *
 * Endpoints:
 * - GET /api/v1/forum/threads          - List threads
 * - GET /api/v1/forum/threads/:id      - Get single thread
 * - POST /api/v1/forum/threads         - Create thread (auth required)
 * - GET /api/v1/forum/threads/:id/replies - Get thread replies
 * =============================================================================
 */

import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

// =============================================================================
// Mock data for reference implementation
// In production, this would call Core API or a forum-specific database
// =============================================================================

interface Thread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  viewCount: number;
  category: string;
}

// Mock threads for demonstration
const mockThreads: Thread[] = [
  {
    id: 'thread-1',
    title: '약사 포럼에 오신 것을 환영합니다',
    content: '약사 커뮤니티 포럼입니다. 자유롭게 정보를 공유해 주세요.',
    authorId: 'user-1',
    authorName: '관리자',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    replyCount: 5,
    viewCount: 100,
    category: 'general',
  },
  {
    id: 'thread-2',
    title: '신규 의약품 정보 공유',
    content: '2025년 신규 출시 의약품에 대한 정보를 공유합니다.',
    authorId: 'user-2',
    authorName: '김약사',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-01-15T10:30:00Z',
    replyCount: 12,
    viewCount: 250,
    category: 'pharmacy',
  },
];

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/forum/threads
 * List all threads with pagination
 */
router.get('/threads', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const category = req.query.category as string;

  // Filter by category if provided
  let threads = [...mockThreads];
  if (category) {
    threads = threads.filter(t => t.category === category);
  }

  // Pagination
  const total = threads.length;
  const offset = (page - 1) * limit;
  const paginatedThreads = threads.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      threads: paginatedThreads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    meta: {
      authenticated: authReq.authenticated || false,
    },
  });
});

/**
 * GET /api/v1/forum/threads/:id
 * Get a single thread by ID
 */
router.get('/threads/:id', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { id } = req.params;

  const thread = mockThreads.find(t => t.id === id);

  if (!thread) {
    return res.status(404).json({
      success: false,
      error: 'Thread not found',
    });
  }

  res.json({
    success: true,
    data: {
      thread,
    },
    meta: {
      authenticated: authReq.authenticated || false,
    },
  });
});

// =============================================================================
// PROTECTED ENDPOINTS
// =============================================================================

/**
 * POST /api/v1/forum/threads
 * Create a new thread (requires authentication)
 */
router.post('/threads', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { title, content, category } = req.body;

  // Validate input
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: 'Title and content are required',
    });
  }

  // In production, this would save to database via Core API
  const newThread: Thread = {
    id: `thread-${Date.now()}`,
    title,
    content,
    authorId: authReq.user?.id || 'unknown',
    authorName: authReq.user?.email?.split('@')[0] || 'Anonymous',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replyCount: 0,
    viewCount: 0,
    category: category || 'general',
  };

  res.status(201).json({
    success: true,
    data: {
      thread: newThread,
    },
    message: 'Thread created successfully',
  });
});

/**
 * GET /api/v1/forum/threads/:id/replies
 * Get replies for a thread
 */
router.get('/threads/:id/replies', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  // Check if thread exists
  const thread = mockThreads.find(t => t.id === id);
  if (!thread) {
    return res.status(404).json({
      success: false,
      error: 'Thread not found',
    });
  }

  // Mock replies
  const mockReplies = [
    {
      id: 'reply-1',
      threadId: id,
      content: '좋은 정보 감사합니다!',
      authorId: 'user-3',
      authorName: '이약사',
      createdAt: '2025-01-02T10:00:00Z',
    },
    {
      id: 'reply-2',
      threadId: id,
      content: '참고가 되었습니다.',
      authorId: 'user-4',
      authorName: '박약사',
      createdAt: '2025-01-02T11:30:00Z',
    },
  ];

  res.json({
    success: true,
    data: {
      replies: mockReplies,
      pagination: {
        page,
        limit,
        total: mockReplies.length,
        totalPages: 1,
      },
    },
    meta: {
      authenticated: authReq.authenticated || false,
    },
  });
});

/**
 * GET /api/v1/forum/categories
 * Get available forum categories
 */
router.get('/categories', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      categories: [
        { id: 'general', name: '일반', description: '일반 토론' },
        { id: 'pharmacy', name: '약국', description: '약국 관련 정보' },
        { id: 'medicine', name: '의약품', description: '의약품 정보' },
        { id: 'qna', name: 'Q&A', description: '질문과 답변' },
      ],
    },
  });
});

export default router;
