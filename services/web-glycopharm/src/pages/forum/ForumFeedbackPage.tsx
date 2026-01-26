/**
 * ForumFeedbackPage - 테스트 의견/피드백 게시판
 *
 * 사용자가 서비스에 대한 피드백과 개선 의견을 남기는 페이지
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, ThumbsUp, Eye, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState, EmptyState } from '@/components/common';

interface FeedbackPost {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  status: 'open' | 'reviewing' | 'resolved';
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: '접수됨', color: 'bg-blue-100 text-blue-700' },
  reviewing: { label: '검토중', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: '반영됨', color: 'bg-green-100 text-green-700' },
};

export default function ForumFeedbackPage() {
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<FeedbackPost[]>('/api/v1/glycopharm/forum/feedback');
        if (response.data) {
          setPosts(response.data);
        }
      } catch {
        // API가 없거나 에러 시 빈 배열 유지
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (isLoading) {
    return <LoadingState message="피드백을 불러오는 중..." />;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/test-center"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          테스트 센터로 돌아가기
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">테스트 의견</h1>
            <p className="text-slate-500">서비스 개선을 위한 의견을 남겨주세요</p>
          </div>
          <a
            href="https://neture.co.kr/supplier-ops/forum/test-feedback/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            <Plus className="w-5 h-5" />
            의견 작성
          </a>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm">
            <EmptyState
              icon={MessageSquare}
              title="아직 등록된 의견이 없습니다"
              description="서비스 이용 중 불편하신 점이나 개선 아이디어가 있으시면 첫 번째 의견을 남겨주세요!"
            />
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabels[post.status].color}`}>
                      {statusLabels[post.status].label}
                    </span>
                    <span className="text-xs text-slate-400">{post.category}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{post.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span>{post.author}</span>
                    <span>{post.createdAt}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {post.comments}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-8 p-6 bg-primary-50 rounded-2xl">
        <h3 className="font-semibold text-primary-800 mb-2">피드백 처리 과정</h3>
        <div className="flex flex-wrap gap-4 text-sm text-primary-700">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">1</span>
            <span>의견 접수</span>
          </div>
          <span className="text-primary-300">→</span>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium">2</span>
            <span>검토 중</span>
          </div>
          <span className="text-primary-300">→</span>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-medium">3</span>
            <span>서비스 반영</span>
          </div>
        </div>
      </div>
    </div>
  );
}
