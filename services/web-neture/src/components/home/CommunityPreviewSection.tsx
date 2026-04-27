/**
 * CommunityPreviewSection - 커뮤니티 미리보기 섹션
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * Forum Preview: 최근 포럼 글 3~5개
 * Knowledge Preview: 자료실 최신 항목 (정적)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, BookOpen, ArrowRight } from 'lucide-react';
import {
  fetchForumPosts,
  getAuthorName,
  type ForumPost,
} from '../../services/forumApi';

interface PreviewPost {
  id: string;
  title: string;
  slug: string;
  authorName: string;
  createdAt: string;
}

const knowledgeItems = [
  { title: '제품 소개 자료', desc: '공급자 제품 카탈로그와 상세 정보' },
  { title: 'POP 디자인', desc: '매장 홍보물 및 디스플레이 템플릿' },
  { title: '운영 가이드', desc: '플랫폼 활용 및 운영 매뉴얼' },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}

export function CommunityPreviewSection() {
  const [posts, setPosts] = useState<PreviewPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        const data = await fetchForumPosts({ page: 1, limit: 5 });
        setPosts(
          data.data.slice(0, 5).map((p: ForumPost) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            authorName: getAuthorName(p),
            createdAt: p.publishedAt || p.createdAt,
          }))
        );
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <section className="py-16 bg-gray-50">
      <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Community</h2>
          <p className="text-gray-600">포럼과 자료실에서 정보를 공유합니다</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Forum Preview */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Forum</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/forum/post/${post.slug}`}
                    className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {post.authorName} · {formatDate(post.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-white rounded-lg border border-gray-200 text-center">
                <p className="text-sm text-gray-500">아직 포럼 글이 없습니다</p>
              </div>
            )}

            <div className="mt-4">
              <Link
                to="/forum"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                포럼 보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Knowledge Preview */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Knowledge</h3>
            </div>

            <div className="space-y-3">
              {knowledgeItems.map((item) => (
                <div
                  key={item.title}
                  className="p-4 bg-white rounded-lg border border-gray-200"
                >
                  <p className="text-sm font-medium text-gray-900 mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Link
                to="/content"
                className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                자료실 보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
    </section>
  );
}
