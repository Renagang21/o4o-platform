import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Navbar from '../../../components/Navbar';

const PostEditor: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    category: 'pharmacy',
    content: '',
    tags: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('게시글 작성:', formData);
    alert('게시글이 작성되었습니다!');
    navigate('/forum');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/forum"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              취소
            </Link>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Eye className="w-4 h-4" />
                미리보기
              </button>
              <button 
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                게시
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">새 게시글 작성</h1>
          
          {/* 카테고리 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pharmacy">💊 약품 정보</option>
              <option value="supplements">🌿 건강식품</option>
              <option value="medical">🏥 의료기기</option>
              <option value="business">💼 비즈니스</option>
            </select>
          </div>

          {/* 제목 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="질문이나 정보를 요약하는 제목을 작성해주세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 내용 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="상세한 내용을 작성해주세요. 전문적이고 도움이 되는 정보를 공유해주세요."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* 태그 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="태그를 쉼표로 구분해서 입력하세요 (예: 혈압약, 건강식품, 상호작용)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">검색과 분류에 도움이 되는 키워드를 입력해주세요</p>
          </div>

          {/* 작성 가이드 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">좋은 게시글 작성 가이드</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 명확하고 구체적인 제목을 작성해주세요</li>
              <li>• 상황을 자세히 설명하고 필요한 정보를 포함해주세요</li>
              <li>• 전문적이고 검증된 정보를 공유해주세요</li>
              <li>• 다른 사용자에게 도움이 되는 내용을 작성해주세요</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostEditor;
