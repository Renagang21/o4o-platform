import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useInfinitePosts } from '../hooks/usePosts';
import { useCategories } from '../hooks/useCategories';
import { PostType, PostStatus } from '@o4o/forum-types';
import { 
  Filter, 
  Search, 
  ChevronDown,
  FileText,
  MessageSquare,
  Eye,
  Heart,
  Calendar,
  TrendingUp,
  Clock,
  Users,
  BookOpen,
  HelpCircle,
  Megaphone,
  Vote,
  Sparkles,
  SlidersHorizontal,
  Grid3X3,
  List,
  Pin
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@o4o/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  ToggleGroup,
  ToggleGroupItem,
  Skeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@o4o/ui';

const PostListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categories } = useCategories({ isActive: true });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    type: searchParams.get('type') as PostType | undefined,
    categoryId: searchParams.get('category') || undefined,
    sortBy: (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'updatedAt' | 'viewCount' | 'commentCount' | 'likeCount' | 'title',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    search: searchParams.get('search') || '',
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitePosts({
    ...filters,
    status: PostStatus.PUBLISHED,
    limit: 20,
  });

  const posts = data?.pages.flatMap(page => page.posts) || [];
  const totalPosts = data?.pages[0]?.pagination?.total || 0;

  const updateFilter = (key: string, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    setSearchParams(params);
  };

  // Post type config for icons and colors
  const postTypeConfig = {
    [PostType.DISCUSSION]: { icon: MessageSquare, label: '토론', color: 'text-blue-600 bg-blue-50' },
    [PostType.QUESTION]: { icon: HelpCircle, label: '질문', color: 'text-purple-600 bg-purple-50' },
    [PostType.ANNOUNCEMENT]: { icon: Megaphone, label: '공지', color: 'text-red-600 bg-red-50' },
    [PostType.POLL]: { icon: Vote, label: '투표', color: 'text-green-600 bg-green-50' },
    [PostType.GUIDE]: { icon: BookOpen, label: '가이드', color: 'text-orange-600 bg-orange-50' },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">커뮤니티 포럼</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                총 {totalPosts.toLocaleString()}개의 게시글
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}
              >
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-gray-100 dark:bg-gray-800")}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="제목, 내용, 태그로 검색..."
                  value={filters.search}
                  onChange={(e: any) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="default">
                <Search className="h-4 w-4 mr-2" />
                검색
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">카테고리</label>
                  <select
                    value={filters.categoryId || 'all'}
                    onChange={(e: any) => updateFilter('categoryId', e.target.value === 'all' ? undefined : e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">모든 카테고리</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">게시글 유형</label>
                  <select
                    value={filters.type || 'all'}
                    onChange={(e: any) => updateFilter('type', e.target.value === 'all' ? undefined : e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">모든 유형</option>
                    {Object.entries(postTypeConfig).map(([type, config]: any) => (
                      <option key={type} value={type}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">정렬 기준</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e: any) => updateFilter('sortBy', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="createdAt">최신순</option>
                    <option value="viewCount">조회순</option>
                    <option value="likeCount">인기순</option>
                    <option value="commentCount">댓글순</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={filters.sortBy === 'createdAt' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('sortBy', 'createdAt')}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            최신
          </Button>
          <Button
            variant={filters.sortBy === 'likeCount' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('sortBy', 'likeCount')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            인기
          </Button>
          <Button
            variant={filters.type === PostType.QUESTION ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('type', filters.type === PostType.QUESTION ? undefined : PostType.QUESTION)}
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            질문만
          </Button>
          <Button
            variant={filters.type === PostType.ANNOUNCEMENT ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('type', filters.type === PostType.ANNOUNCEMENT ? undefined : PostType.ANNOUNCEMENT)}
          >
            <Megaphone className="h-4 w-4 mr-1" />
            공지만
          </Button>
        </div>

        {/* Posts List */}
        <div className={cn(
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'
        )}>
          {isLoading ? (
            [...Array(6)].map((_: any, i: any) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : posts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">게시글이 없습니다</h3>
                <p className="text-gray-500 mb-4">검색 조건에 맞는 게시글을 찾을 수 없습니다.</p>
                <Button variant="outline" onClick={() => setFilters({
                  type: undefined,
                  categoryId: undefined,
                  sortBy: 'createdAt',
                  sortOrder: 'desc',
                  search: '',
                })}>
                  필터 초기화
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {posts.map((post: any) => {
                const typeConfig = post.type ? postTypeConfig[post.type as keyof typeof postTypeConfig] : null;
                const TypeIcon = typeConfig?.icon || FileText;
                
                return viewMode === 'grid' ? (
                  // Grid View
                  <Link
                    key={post.id}
                    to={`/posts/${post.slug}`}
                    className="block h-full"
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {typeConfig && (
                              <div className={cn(
                                "p-1.5 rounded-md",
                                typeConfig.color
                              )}>
                                <TypeIcon className="h-4 w-4" />
                              </div>
                            )}
                            {post.isPinned && (
                              <Badge variant="secondary" className="gap-1">
                                <Pin className="h-3 w-3" />
                                고정
                              </Badge>
                            )}
                          </div>
                          {post.category && (
                            <Badge variant="outline" className="text-xs">
                              {post.category.name}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2 text-lg">
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {post.excerpt && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                            {post.excerpt}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">{post.authorName}</span>
                          <span>
                            {formatDistanceToNow(new Date(post.createdAt), { 
                              addSuffix: true,
                              locale: ko 
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {post.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {post.commentCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" />
                            {post.likeCount}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  // List View
                  <Link
                    key={post.id}
                    to={`/posts/${post.slug}`}
                    className="block"
                  >
                    <Card className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {typeConfig && (
                            <div className={cn(
                              "p-2 rounded-lg flex-shrink-0",
                              typeConfig.color
                            )}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {post.isPinned && (
                                <Badge variant="secondary" className="gap-1">
                                  <Pin className="h-3 w-3" />
                                  고정됨
                                </Badge>
                              )}
                              {post.category && (
                                <Badge variant="outline">
                                  {post.category.name}
                                </Badge>
                              )}
                              {typeConfig && (
                                <Badge variant="secondary">
                                  {typeConfig.label}
                                </Badge>
                              )}
                            </div>
                            
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              {post.title}
                            </h2>
                            
                            {post.excerpt && (
                              <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                {post.excerpt}
                              </p>
                            )}
                            
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex gap-2 mb-3 flex-wrap">
                                {post.tags.map((tag: any) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                              <span className="font-medium">{post.authorName}</span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {post.viewCount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                {post.commentCount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-4 h-4" />
                                {post.likeCount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDistanceToNow(new Date(post.createdAt), { 
                                  addSuffix: true,
                                  locale: ko 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              
              {/* Load More */}
              {hasNextPage && (
                <div className="col-span-full text-center py-8">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    size="lg"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Skeleton className="h-4 w-4 mr-2 animate-spin" />
                        로딩 중...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        더 많은 게시글 보기
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostListPage;