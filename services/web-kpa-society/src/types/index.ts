/**
 * KPA Society 타입 정의
 */

// 약사 회원 타입 (신고서 양식 기반)
export * from './pharmacist';

// 공통 타입
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 사용자
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  organizationId?: string;
  organizationName?: string;
  role: 'member' | 'officer' | 'admin';
  createdAt: string;
}

// 포럼 — shared API response types from @o4o/types/forum (Phase 19-B)
import type {
  ForumPostResponse,
  ForumCommentResponse,
  ForumCategoryResponse,
} from '@o4o/types/forum';

export type { ForumPostResponse, ForumCommentResponse, ForumCategoryResponse };

// Local view types with KPA-specific flattened fields
export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
}

export interface ForumPost extends Partial<ForumPostResponse> {
  id: string;
  title: string;
  content: string | any[]; // Block[] or string
  excerpt?: string;
  authorId: string;
  authorName: string;       // flattened from author.name
  categoryId: string;
  categoryName: string;     // flattened from category.name
  viewCount: number;
  views: number;            // alias for viewCount
  commentCount: number;
  likeCount: number;
  likes: number;            // alias for likeCount
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;       // flattened from author.name
  parentId?: string;
  createdAt: string;
}

// Alias for ForumComment
export type Comment = ForumComment;

// 포럼 허브 카테고리 요약 (WO-KPA-FORUM-HUB-V2-PHASE1)
export interface ForumHubItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  iconEmoji: string | null;
  postCount: number;
  memberCount: number;
  lastActivityAt: string | null;
  lastPostTitle: string | null;
}

export interface CreatePostRequest {
  title: string;
  content: string | any[]; // Block[] or string for backward compatibility
  categoryId: string;
}

// LMS
export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructorName: string;
  duration: number; // minutes
  lessonCount: number;
  enrollmentCount: number;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  duration: number; // minutes
  videoUrl?: string;
  content?: string;
  isPreview: boolean;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  progress: number; // 0-100
  completedLessons: string[];
  startedAt: string;
  completedAt?: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  courseName: string;
  issuedAt: string;
  certificateNumber: string;
  downloadUrl: string;
}

// 공동구매
export interface Groupbuy {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  originalPrice: number;
  groupPrice: number;
  price?: number; // alias for groupPrice
  minParticipants: number;
  maxParticipants: number;
  currentParticipants: number;
  currentQuantity: number; // alias for currentParticipants
  targetQuantity: number; // alias for maxParticipants
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended' | 'cancelled';
  category: string;
  organizerId: string;
  organizerName: string;
}

export interface GroupbuyParticipation {
  id: string;
  groupbuyId: string;
  groupbuy: Groupbuy;
  userId: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  participatedAt: string;
}

// 공지사항/뉴스 (APP-CONTENT Phase 2: shared types from @o4o/types/content)
import type { ContentType, ContentMetadata, ContentSourceType, ContentSortType } from '@o4o/types/content';
export type { ContentType, ContentMetadata, ContentSourceType, ContentSortType };

export interface Notice {
  id: string;
  title: string;
  content: string;
  summary?: string;
  excerpt?: string;
  body?: string;
  authorId?: string;
  authorName?: string;
  author?: string;
  type: ContentType;
  isPinned: boolean;
  isImportant?: boolean;
  isOperatorPicked?: boolean;
  viewCount?: number;
  views?: number;
  likeCount?: number;
  /** Phase 3A: 추천수 */
  recommendCount?: number;
  /** Phase 3A: 내가 추천했는지 */
  isRecommendedByMe?: boolean;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  metadata?: ContentMetadata;
  attachments?: Attachment[];
  publishedAt?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  name: string; // alias for filename
  url: string;
  size: number;
  mimeType: string;
}

// 자료실
export interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  file?: Attachment;
  fileUrl?: string;
  fileType?: string;
  fileSize?: string;
  downloadCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

// 조직
export interface Organization {
  id: string;
  name: string;
  type: 'headquarters' | 'branch' | 'chapter';
  parentId?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  memberCount: number;
}

export interface Officer {
  id: string;
  userId: string;
  name: string;
  position: string;
  organizationId: string;
  organizationName: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  pharmacy?: string;
  order: number;
}

// 갤러리
export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl: string;
  eventDate?: string;
  viewCount?: number;
  createdAt: string;
}

// 행사/이벤트
export interface Event {
  id: string;
  title: string;
  description: string;
  location?: string;
  startDate: string;
  endDate?: string;
  registrationDeadline?: string;
  maxParticipants?: number;
  currentParticipants: number;
  status: 'upcoming' | 'ongoing' | 'ended';
  createdAt: string;
}
