import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, Share2 } from 'lucide-react';
import Navbar from '../../../components/Navbar';

const PostDetail: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/forum"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            포럼으로 돌아가기
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 게시글 */}
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">약품 정보</span>
              <span className="text-sm text-gray-500">2025.01.20 14:30</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              혈압약 복용 중 주의해야 할 건강식품이 있을까요?
            </h1>
            <div className="flex items-center gap-4">
              <img src="/api/placeholder/40/40" alt="작성자" className="w-10 h-10 rounded-full" />
              <div>
                <div className="font-medium">건강지킴이</div>
                <div className="text-sm text-gray-500">Lv.15 활성 회원</div>
              </div>
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <p>고혈압으로 약을 복용하고 있는데, 같이 먹으면 안 되는 건강식품이나 영양제가 있는지 궁금합니다.</p>
            <p>현재 복용 중인 약물:</p>
            <ul>
              <li>아모잘탄 5mg (1일 1회)</li>
              <li>아스피린 100mg (1일 1회)</li>
            </ul>
            <p>함께 복용을 고려하고 있는 건강식품:</p>
            <ul>
              <li>오메가3</li>
              <li>코큐텐</li>
              <li>마그네슘</li>
            </ul>
            <p>전문가분들의 조언 부탁드립니다.</p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                <ThumbsUp className="w-4 h-4" />
                도움됨 (28)
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100">
                <ThumbsDown className="w-4 h-4" />
                (3)
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Share2 className="w-4 h-4" />
              공유
            </button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="mt-8 bg-white rounded-lg shadow p-8">
          <h2 className="text-lg font-bold mb-6">댓글 15개</h2>
          
          {/* 댓글 작성 */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <textarea
              placeholder="전문적이고 도움이 되는 답변을 작성해주세요..."
              className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-end mt-3">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                댓글 작성
              </button>
            </div>
          </div>

          {/* 댓글 목록 */}
          <div className="space-y-6">
            <div className="border-b pb-6">
              <div className="flex items-start gap-4">
                <img src="/api/placeholder/40/40" alt="댓글 작성자" className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">약사님</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">전문가</span>
                    <span className="text-sm text-gray-500">30분 전</span>
                  </div>
                  <div className="text-gray-700 mb-3">
                    혈압약과 건강식품 병용에 대해 답변드리겠습니다. 오메가3와 코큐텐은 일반적으로 문제없지만, 
                    마그네슘은 혈압약의 효과를 증강시킬 수 있어 주의가 필요합니다...
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-green-600 hover:text-green-700">
                      <ThumbsUp className="w-3 h-3" />
                      <span className="text-sm">12</span>
                    </button>
                    <button className="text-sm text-gray-500 hover:text-gray-700">답글</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
