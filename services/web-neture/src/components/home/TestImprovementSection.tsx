/**
 * TestImprovementSection - 서비스 테스트 & 개선 참여 섹션
 *
 * Work Order: WO-TEST-HOMEPAGE-SECTION-V1
 *
 * 구성:
 * 1. 테스트 안내 영역 (카드 기반)
 * 2. 테스트 의견 게시판 (포럼 연동)
 * 3. 서비스 업데이트 게시판 (포럼 연동)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Bell, Target, Users, Lightbulb, CheckCircle } from 'lucide-react';

// Types
interface ForumPost {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  commentCount: number;
}

// 서비스별 설정
interface ServiceConfig {
  serviceName: string;
  serviceDescription: string;
  forumCategorySlug: string;
  updatesCategorySlug: string;
  primaryColor: string;
}

// 기본 설정 (Neture)
const defaultConfig: ServiceConfig = {
  serviceName: 'Neture',
  serviceDescription: '공급자를 찾고, 제휴를 연결하는 B2B 유통 정보 플랫폼',
  forumCategorySlug: 'neture-feedback',
  updatesCategorySlug: 'neture-updates',
  primaryColor: '#4f46e5',
};

// 테스트 안내 카드 콘텐츠
const guideCards = [
  {
    icon: Target,
    title: '이 서비스의 목적',
    description: '실제 사용자가 편리하게 이용할 수 있는 서비스를 만들기 위해 여러분의 피드백을 수집합니다.',
  },
  {
    icon: Users,
    title: '참여 방법',
    description: '서비스를 자유롭게 사용해보시고, 불편한 점이나 개선 아이디어가 있으면 의견을 남겨주세요.',
  },
  {
    icon: Lightbulb,
    title: '의견 남기기',
    description: '아래 테스트 의견 게시판에서 직접 글을 작성하거나, 기존 의견에 댓글로 의견을 더할 수 있습니다.',
  },
  {
    icon: CheckCircle,
    title: '의견 반영 방식',
    description: '작성해주신 의견은 검토 후 서비스 업데이트에 반영되며, 처리 결과는 댓글로 안내드립니다.',
  },
];

// Mock 데이터 (실제 API 연동 전)
const mockFeedbackPosts: ForumPost[] = [
  { id: '1', title: '공급자 검색 필터 기능 개선 요청', author: '사용자A', createdAt: '2026-01-13', commentCount: 3 },
  { id: '2', title: '제휴 요청 상세 페이지 로딩 속도 개선', author: '사용자B', createdAt: '2026-01-12', commentCount: 1 },
  { id: '3', title: '모바일에서 메뉴 접근이 불편합니다', author: '사용자C', createdAt: '2026-01-10', commentCount: 5 },
];

const mockUpdatePosts: ForumPost[] = [
  { id: '1', title: '공급자 상세 페이지 UI 개선', author: '운영팀', createdAt: '2026-01-14', commentCount: 0 },
  { id: '2', title: '제휴 요청 필터링 기능 추가', author: '운영팀', createdAt: '2026-01-11', commentCount: 0 },
  { id: '3', title: '로그인 후 역할 선택 화면 개선', author: '운영팀', createdAt: '2026-01-08', commentCount: 0 },
];

interface Props {
  config?: Partial<ServiceConfig>;
}

export function TestImprovementSection({ config = {} }: Props) {
  const mergedConfig = { ...defaultConfig, ...config };
  const [feedbackPosts, setFeedbackPosts] = useState<ForumPost[]>([]);
  const [updatePosts, setUpdatePosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 실제 포럼 API 연동
    // const fetchPosts = async () => {
    //   const feedback = await forumApi.getPosts({ category: mergedConfig.forumCategorySlug, limit: 3 });
    //   const updates = await forumApi.getPosts({ category: mergedConfig.updatesCategorySlug, limit: 3 });
    //   setFeedbackPosts(feedback);
    //   setUpdatePosts(updates);
    // };
    // fetchPosts();

    // 현재는 Mock 데이터 사용
    setTimeout(() => {
      setFeedbackPosts(mockFeedbackPosts);
      setUpdatePosts(mockUpdatePosts);
      setLoading(false);
    }, 300);
  }, [mergedConfig.forumCategorySlug, mergedConfig.updatesCategorySlug]);

  return (
    <section className="py-16 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            서비스 테스트 &amp; 개선 참여
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {mergedConfig.serviceDescription}에 대한 여러분의 의견을 들려주세요.
            함께 더 나은 서비스를 만들어갑니다.
          </p>
        </div>

        {/* Guide Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {guideCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${mergedConfig.primaryColor}15` }}
                >
                  <card.icon
                    className="w-5 h-5"
                    style={{ color: mergedConfig.primaryColor }}
                  />
                </div>
                <h3 className="font-semibold text-gray-900">{card.title}</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Forum Boards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feedback Board */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">테스트 의견</h3>
              </div>
              <Link
                to="/forum/feedback"
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                글쓰기 &rarr;
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-5 py-8 text-center text-gray-500">
                  로딩 중...
                </div>
              ) : feedbackPosts.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-500">
                  아직 등록된 의견이 없습니다. 첫 번째 의견을 남겨주세요!
                </div>
              ) : (
                feedbackPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/forum/post/${post.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {post.author} · {post.createdAt}
                      </p>
                    </div>
                    {post.commentCount > 0 && (
                      <span className="ml-3 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                        댓글 {post.commentCount}
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <Link
                to="/forum/feedback"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                전체 보기 &rarr;
              </Link>
            </div>
          </div>

          {/* Updates Board */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">서비스 업데이트</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-5 py-8 text-center text-gray-500">
                  로딩 중...
                </div>
              ) : updatePosts.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-500">
                  아직 등록된 업데이트가 없습니다.
                </div>
              ) : (
                updatePosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/forum/post/${post.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {post.author} · {post.createdAt}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <Link
                to="/forum/updates"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                전체 보기 &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TestImprovementSection;
