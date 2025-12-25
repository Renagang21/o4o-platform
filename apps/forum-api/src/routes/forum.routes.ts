/**
 * Forum Routes
 * =============================================================================
 * Domain-specific routes for forum functionality.
 *
 * Endpoints:
 * - GET  /api/v1/forum/threads           - List threads (public)
 * - GET  /api/v1/forum/threads/:id       - Get single thread (public)
 * - POST /api/v1/forum/threads           - Create thread (auth required)
 * - GET  /api/v1/forum/threads/:id/replies - Get thread replies (public)
 * - POST /api/v1/forum/threads/:id/replies - Create reply (auth required)
 * - GET  /api/v1/forum/categories        - List categories (public)
 *
 * Permission Model:
 * - Read: Public (anyone can view threads/replies)
 * - Write: Authenticated users only (create threads/replies)
 * =============================================================================
 */

import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  validateCreateThread,
  validateCreateReply,
  validatePagination,
} from '../utils/validation.js';
import {
  sendValidationError,
  sendNotFoundError,
  ErrorCodes,
} from '../utils/errors.js';

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

interface Reply {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
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

// Mock replies for demonstration
const mockReplies: Reply[] = [
  {
    id: 'reply-1',
    threadId: 'thread-1',
    content: '좋은 정보 감사합니다!',
    authorId: 'user-3',
    authorName: '이약사',
    createdAt: '2025-01-02T10:00:00Z',
    updatedAt: '2025-01-02T10:00:00Z',
  },
  {
    id: 'reply-2',
    threadId: 'thread-1',
    content: '참고가 되었습니다.',
    authorId: 'user-4',
    authorName: '박약사',
    createdAt: '2025-01-02T11:30:00Z',
    updatedAt: '2025-01-02T11:30:00Z',
  },
];

// =============================================================================
// VALID CATEGORIES
// =============================================================================

const VALID_CATEGORIES = ['general', 'pharmacy', 'medicine', 'qna'];

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/forum/threads
 * List all threads with pagination
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - category: Filter by category (optional)
 *
 * Permission: Public
 */
router.get('/threads', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;

  // Validate pagination
  const { page, limit } = validatePagination({
    page: req.query.page as string,
    limit: req.query.limit as string,
  });

  const category = req.query.category as string;

  // Filter by category if provided
  let threads = [...mockThreads];
  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      // Invalid category - return empty result instead of error
      threads = [];
    } else {
      threads = threads.filter(t => t.category === category);
    }
  }

  // Sort by creation date (newest first)
  threads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
        totalPages: Math.ceil(total / limit) || 1,
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
 *
 * Permission: Public
 */
router.get('/threads/:id', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { id } = req.params;

  const thread = mockThreads.find(t => t.id === id);

  if (!thread) {
    return sendNotFoundError(res, ErrorCodes.THREAD_NOT_FOUND, '게시글을 찾을 수 없습니다.');
  }

  // In production, increment view count here

  res.json({
    success: true,
    data: {
      thread,
    },
    meta: {
      authenticated: authReq.authenticated || false,
      canEdit: authReq.user?.id === thread.authorId,
      canDelete: authReq.user?.id === thread.authorId,
    },
  });
});

/**
 * GET /api/v1/forum/threads/:id/replies
 * Get replies for a thread
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Permission: Public
 */
router.get('/threads/:id/replies', optionalAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { id } = req.params;

  // Check if thread exists
  const thread = mockThreads.find(t => t.id === id);
  if (!thread) {
    return sendNotFoundError(res, ErrorCodes.THREAD_NOT_FOUND, '게시글을 찾을 수 없습니다.');
  }

  // Validate pagination
  const { page, limit } = validatePagination({
    page: req.query.page as string,
    limit: req.query.limit as string,
  });

  // Filter replies for this thread
  const threadReplies = mockReplies.filter(r => r.threadId === id);

  // Sort by creation date (oldest first for replies)
  threadReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Pagination
  const total = threadReplies.length;
  const offset = (page - 1) * limit;
  const paginatedReplies = threadReplies.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      replies: paginatedReplies.map(reply => ({
        ...reply,
        canEdit: authReq.user?.id === reply.authorId,
        canDelete: authReq.user?.id === reply.authorId,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
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
 *
 * Permission: Public
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

// =============================================================================
// PROTECTED ENDPOINTS
// =============================================================================

/**
 * POST /api/v1/forum/threads
 * Create a new thread
 *
 * Body:
 * - title: Thread title (required, 2-200 chars)
 * - content: Thread content (required, 10-50000 chars)
 * - category: Category ID (optional, defaults to 'general')
 *
 * Permission: Authenticated users only
 */
router.post('/threads', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { title, content, category } = req.body;

  // Validate input
  const validation = validateCreateThread({ title, content, category });
  if (!validation.valid) {
    return sendValidationError(res, validation.errors);
  }

  // Validate category exists
  const categoryId = category || 'general';
  if (!VALID_CATEGORIES.includes(categoryId)) {
    return sendValidationError(res, [{
      field: 'category',
      message: '올바른 카테고리를 선택해주세요.',
      code: 'INVALID_CATEGORY',
    }]);
  }

  // In production, this would save to database via Core API
  const newThread: Thread = {
    id: `thread-${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    authorId: authReq.user?.id || 'unknown',
    authorName: authReq.user?.name || authReq.user?.email?.split('@')[0] || 'Anonymous',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replyCount: 0,
    viewCount: 0,
    category: categoryId,
  };

  // Add to mock data (in production, save to database)
  mockThreads.unshift(newThread);

  res.status(201).json({
    success: true,
    data: {
      thread: newThread,
    },
    message: '게시글이 작성되었습니다.',
  });
});

/**
 * POST /api/v1/forum/threads/:id/replies
 * Create a reply to a thread
 *
 * Body:
 * - content: Reply content (required, 2-10000 chars)
 *
 * Permission: Authenticated users only
 */
router.post('/threads/:id/replies', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { id } = req.params;
  const { content } = req.body;

  // Check if thread exists
  const thread = mockThreads.find(t => t.id === id);
  if (!thread) {
    return sendNotFoundError(res, ErrorCodes.THREAD_NOT_FOUND, '게시글을 찾을 수 없습니다.');
  }

  // Validate input
  const validation = validateCreateReply({ content });
  if (!validation.valid) {
    return sendValidationError(res, validation.errors);
  }

  // In production, this would save to database via Core API
  const newReply: Reply = {
    id: `reply-${Date.now()}`,
    threadId: id,
    content: content.trim(),
    authorId: authReq.user?.id || 'unknown',
    authorName: authReq.user?.name || authReq.user?.email?.split('@')[0] || 'Anonymous',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to mock data (in production, save to database)
  mockReplies.push(newReply);

  // Update thread reply count
  thread.replyCount += 1;
  thread.updatedAt = new Date().toISOString();

  res.status(201).json({
    success: true,
    data: {
      reply: newReply,
    },
    message: '댓글이 작성되었습니다.',
  });
});

export default router;
