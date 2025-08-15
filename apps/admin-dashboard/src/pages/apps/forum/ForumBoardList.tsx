import { useState, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Eye, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  active: boolean;
  order: number;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  category: ForumCategory;
  status: 'published' | 'draft' | 'pending' | 'reported';
  views: number;
  replyCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

const ForumBoardList: FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/forum/categories');
      return response.data;
    }
  });
  const categories = categoriesData?.data || [];

  // Fetch posts
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['forum-posts', categoryFilter, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await authClient.api.get(`/forum/posts?${params.toString() as any}`);
      return response.data;
    }
  });
  const posts = postsData?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge>게시됨</Badge>;
      case 'draft':
        return <Badge variant="secondary">초안</Badge>;
      case 'pending':
        return <Badge variant={"outline" as const}>검토 중</Badge>;
      case 'reported':
        return <Badge variant="destructive">신고됨</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 전`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">포럼 게시판</h1>
          <p className="text-modern-text-secondary mt-1">포럼 게시글을 관리하고 모더레이션하세요.</p>
        </div>
        <Button onClick={() => navigate('/forum/posts/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 게시글
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-5 h-5" />
            <Input
              type="text"
              placeholder="제목, 내용, 작성자로 검색..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={categoryFilter}
            onChange={(e: any) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 카테고리</option>
            {categories.map((category: ForumCategory) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="published">게시됨</option>
            <option value="draft">초안</option>
            <option value="pending">검토 중</option>
            <option value="reported">신고됨</option>
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className="wp-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  작성자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider text-center">
                  통계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  작성일
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-modern-border-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-modern-text-secondary">
                    게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                posts.map((post: ForumPost) => (
                  <tr key={post.id} className="hover:bg-modern-bg-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {post.isPinned && (
                          <Badge variant="secondary" className="text-xs">고정</Badge>
                        )}
                        {post.isLocked && (
                          <Badge variant={"outline" as const} className="text-xs">잠김</Badge>
                        )}
                        <a
                          href="#"
                          onClick={(e: any) => {
                            e.preventDefault();
                            navigate(`/forum/posts/${post.id}`);
                          }}
                          className="text-sm font-medium text-modern-text-primary hover:text-modern-primary"
                        >
                          {post.title}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={"outline" as const}>{post.category.name}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-modern-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {post.author.name.charAt(0)}
                        </div>
                        <span className="text-sm text-modern-text-primary">{post.author.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(post.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-4 text-sm text-modern-text-secondary">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.views}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.replyCount}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-secondary">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant={"ghost" as const} size={"sm" as const}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/forum/posts/${post.id}`)}>
                            보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/forum/posts/${post.id}/edit`)}>
                            수정
                          </DropdownMenuItem>
                          {!post.isPinned && (
                            <DropdownMenuItem>고정하기</DropdownMenuItem>
                          )}
                          {!post.isLocked && (
                            <DropdownMenuItem>잠금</DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive">
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForumBoardList;