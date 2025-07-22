import { Link } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useTrendingPosts, useRecentPosts } from '../hooks/usePosts';
import { useForumStats } from '../hooks/useStats';
import { 
  TrendingUp, 
  Clock, 
  MessageSquare, 
  Users, 
  FileText,
  Eye,
  Heart,
  ArrowRight,
  Layers
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@o4o/utils';

const HomePage = () => {
  const { data: categories, isLoading: categoriesLoading } = useCategories({ isActive: true });
  const { data: trendingPosts, isLoading: trendingLoading } = useTrendingPosts(5);
  const { data: recentPosts, isLoading: recentLoading } = useRecentPosts(5);
  const { data: stats, isLoading: statsLoading } = useForumStats();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg text-white p-8">
        <h1 className="text-3xl font-bold mb-2">O4O Community Forum</h1>
        <p className="text-primary-100 mb-6">
          지식을 공유하고, 질문하고, 함께 성장하는 커뮤니티
        </p>
        <div className="flex gap-4">
          <Link to="/posts/new" className="btn bg-white text-primary-600 hover:bg-gray-100">
            새 글 작성하기
          </Link>
          <Link to="/posts" className="btn btn-ghost text-white border-white hover:bg-white/10">
            모든 게시글 보기
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 게시글</p>
                <p className="text-2xl font-bold">{stats.totalPosts.toLocaleString()}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 댓글</p>
                <p className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">활성 사용자</p>
                <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">오늘 게시글</p>
                <p className="text-2xl font-bold">{stats.postsToday.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-500" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            카테고리
          </h2>
          
          {categoriesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {categories?.map((category) => (
                <Link
                  key={category.id}
                  to={`/categories/${category.slug}`}
                  className="block card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary-600">
                        {category.postCount}
                      </span>
                      <p className="text-xs text-gray-500">게시글</p>
                    </div>
                  </div>
                </Link>
              ))}
              
              <Link
                to="/categories"
                className="block text-center py-3 text-primary-600 hover:text-primary-700 font-medium"
              >
                모든 카테고리 보기 <ArrowRight className="inline w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Trending Posts */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              인기 게시글
            </h2>
            
            {trendingLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {trendingPosts?.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              최신 게시글
            </h2>
            
            {recentLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentPosts?.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                
                <Link
                  to="/posts"
                  className="block text-center py-3 text-primary-600 hover:text-primary-700 font-medium"
                >
                  모든 게시글 보기 <ArrowRight className="inline w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Post Card Component
const PostCard = ({ post }: { post: any }) => {
  return (
    <Link
      to={`/posts/${post.slug}`}
      className="block card hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'badge text-xs',
              post.type === 'announcement' ? 'badge-primary' : 'badge-secondary'
            )}>
              {post.type === 'discussion' && '토론'}
              {post.type === 'question' && '질문'}
              {post.type === 'announcement' && '공지'}
              {post.type === 'poll' && '투표'}
              {post.type === 'guide' && '가이드'}
            </span>
            {post.isPinned && (
              <span className="text-xs text-primary-600 font-medium">📌 고정됨</span>
            )}
          </div>
          
          <h3 className="font-medium text-gray-900 mb-1">{post.title}</h3>
          
          {post.excerpt && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {post.excerpt}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{post.authorName}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {post.commentCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {post.likeCount}
            </span>
            <span>
              {formatDistanceToNow(new Date(post.createdAt), { 
                addSuffix: true,
                locale: ko 
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default HomePage;