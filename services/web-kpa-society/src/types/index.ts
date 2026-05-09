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
export interface ForumInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  forumType?: string;
  // 신청자(=포럼 소유자) ID — forum_category_requests.requester_id (entity property: requesterId)
  requesterId?: string;
}

/** @deprecated Use ForumInfo instead */
export type ForumCategory = ForumInfo;

export interface ForumPost extends Partial<ForumPostResponse> {
  id: string;
  title: string;
  content: string | any[]; // Block[] or string
  excerpt?: string;
  authorId: string;
  authorName: string;       // flattened from author.name
  forumId?: string;          // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: SSOT (forum_category_requests.id)
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
  forumType?: string;
  tags?: string[] | null;
  creatorName?: string;
}

// 포럼 활동 섹션 (WO-KPA-FORUM-HUB-V2-PHASE3)
export interface ForumActivityPost {
  id: string;
  title: string;
  isPinned: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  authorName: string | null;
}

export interface ForumActivityCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  iconEmoji: string | null;
  postCount: number;
  recentPosts: ForumActivityPost[];
}

export interface CreatePostRequest {
  title: string;
  content: string | any[]; // Block[] or string for backward compatibility
  // WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1: 멀티 포럼 — slug로 forum_id 매핑
  forumSlug?: string;
  forumId?: string;
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
  // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
  rejectionReason?: string | null;
  createdAt: string;
  isPaid?: boolean;
  price?: number;
  credits?: number;
  tags?: string[];
  instructor?: { id: string; name: string; avatar?: string };
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
  visibility?: 'public' | 'members';
  // WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: 매장 자료함 가져가기 허용 정책 (visibility와 독립 축)
  reusablePolicy?: 'restricted' | 'organization' | 'platform';
}

// Instructor Public Profile - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
export interface InstructorCourseItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  duration: number;
  isPaid: boolean;
  price: number | null;
  credits: number;
  tags: string[];
  currentEnrollments: number;
  createdAt: string;
  publishedAt: string | null;
}

export interface InstructorPublicProfile {
  instructor: {
    id: string;
    name: string;
    nickname: string | null;
    avatar: string | null;
  };
  stats: {
    courseCount: number;
    totalStudents: number;
    freeCourses: number;
    paidCourses: number;
  };
  courses: InstructorCourseItem[];
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
  isFree?: boolean;
  type?: 'video' | 'article' | 'quiz' | 'assignment' | 'live';
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  progress: number; // 0-100
  completedLessons: number; // count of completed lessons (DB INTEGER, not an array)
  startedAt: string;
  completedAt?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  metadata?: {
    completedLessonIds?: string[]; // per-lesson completion tracking (use this for .includes() checks)
  };
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

// Quiz (WO-O4O-QUIZ-SYSTEM-V1)
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  points?: number;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number;
  lessonId?: string;
  courseId?: string;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  earnedPoints: number;
  totalPoints: number;
  answers: Array<{
    questionId: string;
    isCorrect?: boolean;
    points?: number;
  }>;
  lessonCompleted: boolean;
  creditsEarned: number;
}

// Credit (WO-O4O-CREDIT-SYSTEM-V1)
export interface CreditTransaction {
  id: string;
  amount: number;
  transactionType: 'earn' | 'spend' | 'adjust';
  sourceType: string;
  sourceId?: string;
  description?: string;
  createdAt: string;
}

// Completion (WO-O4O-COMPLETION-V1)
export interface CourseCompletionItem {
  id: string;
  courseId: string;
  courseTitle: string;
  enrollmentId: string;
  completedAt: string;
}

// 이벤트 오퍼 통계 (WO-KPA-GROUPBUY-STATS-V1)
export interface EventOfferStats {
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
  participatingStores: number;
  registeredProducts: number;
}

// 이벤트 오퍼 상품 (OrganizationProductListing 기반, WO-KPA-GROUPBUY-PAGE-V1)
export interface EventOfferProduct {
  id: string;
  organization_id: string;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: Record<string, unknown>;
  retail_price: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// 이벤트 상품 (Enriched, WO-EVENT-OFFER-HUB-TABLE-AND-DIRECT-ORDER-REFINE-V1)
// WO-O4O-EVENT-OFFER-CORE-REFORM-V1: status / startAt / endAt 추가
// WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: 수량 필드 추가
// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: eventPrice / generalPrice / 신규 status
// WO-O4O-GROUPBUY-LISTING-VIEWMODEL-PHASE1-V1: sourceType 추가 (Store Listing 정렬)
export interface EventOfferItem {
  id: string;
  offerId: string;
  price: number | null;
  /** 이벤트 전용 공급가 (null = 레거시 listing) */
  eventPrice: number | null;
  /** 일반 공급가 (price_general 스냅샷). 비교 표시용. */
  generalPrice: number | null;
  isActive: boolean;
  /**
   * 런타임 계산 상태:
   * - pending: 운영자 승인 대기
   * - rejected: 반려
   * - canceled: 취소
   * - upcoming: 승인됨, 시작 전
   * - active: 진행 중
   * - sold_out: 매진
   * - ended: 종료
   */
  status: 'pending' | 'rejected' | 'canceled' | 'upcoming' | 'active' | 'sold_out' | 'ended';
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplierId: string;
  unitPrice: number | null;
  productName: string;
  supplierName: string;
  // 수량 제한 정보 (null = 무제한)
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
  /** OPL.source_type — Store Listing 진입 경로 식별자 (예: 'event-offer', null=레거시) */
  sourceType: string | null;
}

// WO-O4O-GROUPBUY-LISTING-VIEWMODEL-PHASE1-V1: Generic Store Listing alias
// EventOfferItem은 실제로 Store Listing ViewModel 역할을 수행한다.
// 향후 sourceType 분기(trial/campaign 등) 도입 시 이 alias에서 분리한다.
export type StoreListing = EventOfferItem;

// 이벤트 상태 — KPA 매장 경영자 탭 키
// WO-EVENT-OFFER-HUB-TIME-WINDOW-FILTER-HOTFIX-V1
// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 'upcoming' 추가
export type EventOfferStatus = 'upcoming' | 'active' | 'ended' | 'all';

// 이벤트 오퍼 (캠페인 모델 - legacy)
export interface LegacyEventOffer {
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

export interface EventOfferParticipation {
  id: string;
  groupbuyId: string;
  groupbuy: LegacyEventOffer;
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

// 조직
export interface Organization {
  id: string;
  name: string;
  type: 'headquarters' | 'committee' | 'pharmacy';
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


// ─────────────────────────────────────────────────────
// Store Listing Card — Canonical ViewModel
// WO-O4O-KPA-STORE-LISTING-VIEWMODEL-CANONICAL-V1
// ─────────────────────────────────────────────────────

export type {
  StoreListingSourceType,
  StoreListingBadge,
  StoreListingPeriod,
  StoreListingInventory,
  StoreListingPrimaryAction,
  StoreListingCardViewModel,
} from './storeListing';

export { fromEventOfferItem } from './storeListing';
