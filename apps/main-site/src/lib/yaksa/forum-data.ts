/**
 * Yaksa Forum Data Loader
 *
 * Data fetching utilities for pharmacist association forum.
 * All requests require organizationId for proper data scoping.
 */

const API_BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Types
export type YaksaRole = 'administrator' | 'operator' | 'member' | 'guest';

export type OrganizationLevel = 'national' | 'regional' | 'local';

export interface YaksaOrganization {
  id: string;
  name: string;
  level: OrganizationLevel;
  parentId?: string;
  parentName?: string;
  memberCount?: number;
  description?: string;
}

export interface YaksaUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: YaksaRole;
  organizationId: string;
  organizationName?: string;
  licenseNumber?: string;
  isVerified: boolean;
}

export interface YaksaCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPrivate: boolean;
  requiredRole: YaksaRole;
  postCount: number;
  icon?: string;
  order: number;
  parentId?: string;
  children?: YaksaCategory[];
}

export interface YaksaPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: YaksaRole;
  };
  categoryId: string;
  categoryName?: string;
  organizationId: string;
  organizationName?: string;
  isPinned: boolean;
  isLocked: boolean;
  isPrivate: boolean;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  viewCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  attachments?: YaksaAttachment[];
  metadata?: {
    priority?: 'normal' | 'important' | 'urgent';
    expiresAt?: string;
    targetRoles?: YaksaRole[];
  };
}

export interface YaksaAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface YaksaComment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: YaksaRole;
  };
  postId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  replies?: YaksaComment[];
}

export interface YaksaHomeData {
  organization: YaksaOrganization;
  announcements: YaksaPost[];
  recentPosts: YaksaPost[];
  pinnedPosts: YaksaPost[];
  categories: YaksaCategory[];
  stats: {
    totalPosts: number;
    totalMembers: number;
    newPostsToday: number;
  };
}

export interface YaksaPostListResult {
  posts: YaksaPost[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    hasMore: boolean;
  };
}

// API Functions

/**
 * Fetch Yaksa forum home data
 */
export async function fetchYaksaHome(orgId: string): Promise<YaksaHomeData | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/forum/home?orgId=${orgId}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      // Return mock data for development
      return getMockHomeData(orgId);
    }

    const result = await response.json();
    return result.success ? result.data : getMockHomeData(orgId);
  } catch (error) {
    console.error('Error fetching Yaksa home:', error);
    return getMockHomeData(orgId);
  }
}

/**
 * Fetch posts for organization
 */
export async function fetchYaksaPosts(
  orgId: string,
  options: {
    categoryId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'popular' | 'commented';
    status?: YaksaPost['status'];
  } = {}
): Promise<YaksaPostListResult> {
  const { categoryId, page = 1, limit = 20, sortBy = 'newest', status } = options;

  try {
    const params = new URLSearchParams({
      orgId,
      page: String(page),
      limit: String(limit),
      sortBy,
    });
    if (categoryId) params.set('categoryId', categoryId);
    if (status) params.set('status', status);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/forum/posts?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return getMockPostList(orgId);
    }

    const result = await response.json();
    return result.success ? result.data : getMockPostList(orgId);
  } catch (error) {
    console.error('Error fetching Yaksa posts:', error);
    return getMockPostList(orgId);
  }
}

/**
 * Fetch single post detail
 */
export async function fetchYaksaPostDetail(
  postId: string
): Promise<YaksaPost | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/forum/posts/${postId}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return getMockPost();
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching post detail:', error);
    return getMockPost();
  }
}

/**
 * Fetch categories for organization
 */
export async function fetchYaksaCategories(
  orgId: string
): Promise<YaksaCategory[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/forum/categories?orgId=${orgId}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return getMockCategories();
    }

    const result = await response.json();
    return result.success ? result.data : getMockCategories();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return getMockCategories();
  }
}

/**
 * Fetch recent posts for organization
 */
export async function fetchYaksaRecentPosts(
  orgId: string,
  limit = 10
): Promise<YaksaPost[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/forum/posts/recent?orgId=${orgId}&limit=${limit}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return getMockPostList(orgId).posts.slice(0, limit);
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    return getMockPostList(orgId).posts.slice(0, limit);
  }
}

/**
 * Fetch private board posts (member+ only)
 */
export async function fetchYaksaPrivatePosts(
  orgId: string,
  options: { page?: number; limit?: number } = {}
): Promise<YaksaPostListResult> {
  const { page = 1, limit = 20 } = options;

  try {
    const params = new URLSearchParams({
      orgId,
      page: String(page),
      limit: String(limit),
      isPrivate: 'true',
    });

    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/forum/posts/private?${params}`,
      {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      return { posts: [], pagination: { currentPage: 1, totalPages: 0, totalPosts: 0, hasMore: false } };
    }

    const result = await response.json();
    return result.success ? result.data : { posts: [], pagination: { currentPage: 1, totalPages: 0, totalPosts: 0, hasMore: false } };
  } catch (error) {
    console.error('Error fetching private posts:', error);
    return { posts: [], pagination: { currentPage: 1, totalPages: 0, totalPosts: 0, hasMore: false } };
  }
}

/**
 * Fetch organization list
 */
export async function fetchOrganizations(
  parentId?: string
): Promise<YaksaOrganization[]> {
  try {
    const params = new URLSearchParams();
    if (parentId) params.set('parentId', parentId);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/organizations?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return getMockOrganizations(parentId);
    }

    const result = await response.json();
    return result.success ? result.data : getMockOrganizations(parentId);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return getMockOrganizations(parentId);
  }
}

/**
 * Fetch current user's Yaksa profile
 */
export async function fetchYaksaUserProfile(): Promise<YaksaUser | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/yaksa/user/profile`,
      {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      }
    );

    if (!response.ok) return null;

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Check if user has access to role-restricted content
 */
export function hasRoleAccess(userRole: YaksaRole, requiredRole: YaksaRole): boolean {
  const roleHierarchy: Record<YaksaRole, number> = {
    administrator: 4,
    operator: 3,
    member: 2,
    guest: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Mock Data Functions

function getMockHomeData(orgId: string): YaksaHomeData {
  return {
    organization: {
      id: orgId,
      name: '서울특별시약사회',
      level: 'regional',
      memberCount: 1234,
    },
    announcements: [
      {
        id: '1',
        title: '[공지] 2024년 정기총회 개최 안내',
        slug: 'annual-meeting-2024',
        excerpt: '2024년 정기총회를 아래와 같이 개최하오니 회원 여러분의 많은 참석 바랍니다.',
        author: { id: '1', name: '관리자', role: 'administrator' },
        categoryId: 'notice',
        categoryName: '공지사항',
        organizationId: orgId,
        isPinned: true,
        isLocked: false,
        isPrivate: false,
        status: 'approved',
        viewCount: 1542,
        commentCount: 23,
        likeCount: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { priority: 'important' },
      },
    ],
    recentPosts: getMockPostList(orgId).posts.slice(0, 5),
    pinnedPosts: [],
    categories: getMockCategories(),
    stats: {
      totalPosts: 1234,
      totalMembers: 5678,
      newPostsToday: 12,
    },
  };
}

function getMockPostList(orgId: string): YaksaPostListResult {
  const posts: YaksaPost[] = [
    {
      id: '1',
      title: '신규 의약품 안전 정보 공유',
      slug: 'new-drug-safety-info',
      excerpt: '최근 식약처에서 발표한 신규 의약품 안전 정보를 공유합니다.',
      author: { id: '2', name: '약사A', role: 'member' },
      categoryId: 'info',
      categoryName: '정보공유',
      organizationId: orgId,
      isPinned: false,
      isLocked: false,
      isPrivate: false,
      status: 'approved',
      viewCount: 234,
      commentCount: 12,
      likeCount: 8,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      title: '복약지도 사례 공유 - 당뇨 환자',
      slug: 'medication-counseling-diabetes',
      excerpt: '당뇨 환자 복약지도 시 유의사항과 실제 상담 사례를 공유합니다.',
      author: { id: '3', name: '약사B', role: 'member' },
      categoryId: 'counseling',
      categoryName: '복약지도',
      organizationId: orgId,
      isPinned: false,
      isLocked: false,
      isPrivate: false,
      status: 'approved',
      viewCount: 567,
      commentCount: 34,
      likeCount: 21,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '3',
      title: '2024년 보수교육 일정 안내',
      slug: 'continuing-education-2024',
      excerpt: '올해 보수교육 일정 및 신청 방법을 안내드립니다.',
      author: { id: '1', name: '관리자', role: 'administrator' },
      categoryId: 'education',
      categoryName: '교육',
      organizationId: orgId,
      isPinned: true,
      isLocked: false,
      isPrivate: false,
      status: 'approved',
      viewCount: 892,
      commentCount: 45,
      likeCount: 32,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      metadata: { priority: 'important' },
    },
  ];

  return {
    posts,
    pagination: {
      currentPage: 1,
      totalPages: 10,
      totalPosts: 200,
      hasMore: true,
    },
  };
}

function getMockPost(): YaksaPost {
  return {
    id: '1',
    title: '신규 의약품 안전 정보 공유',
    slug: 'new-drug-safety-info',
    content: '<p>최근 식약처에서 발표한 신규 의약품 안전 정보를 공유합니다.</p><p>자세한 내용은 첨부파일을 참조해 주세요.</p>',
    excerpt: '최근 식약처에서 발표한 신규 의약품 안전 정보를 공유합니다.',
    author: { id: '2', name: '약사A', role: 'member' },
    categoryId: 'info',
    categoryName: '정보공유',
    organizationId: 'org-1',
    isPinned: false,
    isLocked: false,
    isPrivate: false,
    status: 'approved',
    viewCount: 234,
    commentCount: 12,
    likeCount: 8,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    attachments: [
      {
        id: 'att-1',
        filename: '의약품안전정보_2024.pdf',
        url: '/files/drug-safety-2024.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
      },
    ],
  };
}

function getMockCategories(): YaksaCategory[] {
  return [
    {
      id: 'notice',
      name: '공지사항',
      slug: 'notice',
      description: '약사회 공식 공지사항',
      isPrivate: false,
      requiredRole: 'guest',
      postCount: 156,
      icon: '📢',
      order: 1,
    },
    {
      id: 'admin',
      name: '행정',
      slug: 'admin',
      description: '행정 관련 안내 및 자료',
      isPrivate: false,
      requiredRole: 'member',
      postCount: 234,
      icon: '📋',
      order: 2,
    },
    {
      id: 'education',
      name: '교육',
      slug: 'education',
      description: '보수교육 및 학술 정보',
      isPrivate: false,
      requiredRole: 'member',
      postCount: 189,
      icon: '📚',
      order: 3,
    },
    {
      id: 'info',
      name: '정보공유',
      slug: 'info',
      description: '의약품 정보 및 업무 공유',
      isPrivate: false,
      requiredRole: 'member',
      postCount: 456,
      icon: '💊',
      order: 4,
    },
    {
      id: 'counseling',
      name: '복약지도',
      slug: 'counseling',
      description: '복약지도 사례 및 노하우',
      isPrivate: false,
      requiredRole: 'member',
      postCount: 321,
      icon: '👨‍⚕️',
      order: 5,
    },
    {
      id: 'resources',
      name: '자료실',
      slug: 'resources',
      description: '각종 서식 및 자료',
      isPrivate: false,
      requiredRole: 'member',
      postCount: 98,
      icon: '📁',
      order: 6,
    },
    {
      id: 'qna',
      name: '문의/상담',
      slug: 'qna',
      description: '회원 문의 및 상담 (비공개)',
      isPrivate: true,
      requiredRole: 'member',
      postCount: 67,
      icon: '💬',
      order: 7,
    },
  ];
}

function getMockOrganizations(parentId?: string): YaksaOrganization[] {
  if (!parentId) {
    // National level
    return [
      { id: 'national', name: '대한약사회', level: 'national', memberCount: 50000 },
    ];
  }

  if (parentId === 'national') {
    // Regional level
    return [
      { id: 'seoul', name: '서울특별시약사회', level: 'regional', parentId: 'national', memberCount: 8000 },
      { id: 'busan', name: '부산광역시약사회', level: 'regional', parentId: 'national', memberCount: 3000 },
      { id: 'daegu', name: '대구광역시약사회', level: 'regional', parentId: 'national', memberCount: 2500 },
      { id: 'incheon', name: '인천광역시약사회', level: 'regional', parentId: 'national', memberCount: 2800 },
      { id: 'gwangju', name: '광주광역시약사회', level: 'regional', parentId: 'national', memberCount: 1500 },
      { id: 'daejeon', name: '대전광역시약사회', level: 'regional', parentId: 'national', memberCount: 1600 },
      { id: 'ulsan', name: '울산광역시약사회', level: 'regional', parentId: 'national', memberCount: 1000 },
      { id: 'gyeonggi', name: '경기도약사회', level: 'regional', parentId: 'national', memberCount: 12000 },
    ];
  }

  if (parentId === 'seoul') {
    // Local level (districts)
    return [
      { id: 'gangnam', name: '강남구분회', level: 'local', parentId: 'seoul', memberCount: 450 },
      { id: 'gangbuk', name: '강북구분회', level: 'local', parentId: 'seoul', memberCount: 280 },
      { id: 'gangdong', name: '강동구분회', level: 'local', parentId: 'seoul', memberCount: 320 },
      { id: 'gangseo', name: '강서구분회', level: 'local', parentId: 'seoul', memberCount: 380 },
      { id: 'gwanak', name: '관악구분회', level: 'local', parentId: 'seoul', memberCount: 290 },
      { id: 'jongro', name: '종로구분회', level: 'local', parentId: 'seoul', memberCount: 210 },
      { id: 'junggu', name: '중구분회', level: 'local', parentId: 'seoul', memberCount: 180 },
      { id: 'mapo', name: '마포구분회', level: 'local', parentId: 'seoul', memberCount: 340 },
    ];
  }

  return [];
}

export default {
  fetchYaksaHome,
  fetchYaksaPosts,
  fetchYaksaPostDetail,
  fetchYaksaCategories,
  fetchYaksaRecentPosts,
  fetchYaksaPrivatePosts,
  fetchOrganizations,
  fetchYaksaUserProfile,
  hasRoleAccess,
};
