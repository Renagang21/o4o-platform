export type PostStatus = 'draft' | 'published' | 'archived';
export type PostType = 'general' | 'question' | 'announcement';

export interface Post {
  id: string;
  title: string;
  content: string;
  type: PostType;
  status: PostStatus;
  authorId: string;
  authorName: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostCreateRequest {
  title: string;
  content: string;
  type: PostType;
  tags: string[];
}

export interface PostUpdateRequest extends Partial<PostCreateRequest> {
  status?: PostStatus;
}

export interface CommentCreateRequest {
  content: string;
}

export interface CommentUpdateRequest {
  content: string;
}

export interface PostListResponse {
  items: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface CommentListResponse {
  items: Comment[];
  total: number;
  page: number;
  limit: number;
}

export interface PostListParams {
  page?: number;
  limit?: number;
  type?: PostType;
  status?: PostStatus;
  search?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CommentListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ForumError {
  message: string;
  code: string;
}

export interface LikeResponse {
  success: boolean;
  likeCount: number;
}

export interface PostStats {
  totalPosts: number;
  totalComments: number;
  totalViews: number;
  totalLikes: number;
  recentActivity: {
    type: 'post' | 'comment';
    id: string;
    title?: string;
    content: string;
    authorName: string;
    createdAt: string;
  }[];
}