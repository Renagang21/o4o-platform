/**
 * SellerOps Notice Page
 *
 * 공지사항 및 가이드 문서
 */

import React, { useState, useEffect } from 'react';
import { FileText, ChevronRight, Book, Bell, Info } from 'lucide-react';
import type { DocumentDto } from '../../dto/index.js';

interface NoticePageProps {
  apiBaseUrl?: string;
}

export const NoticePage: React.FC<NoticePageProps> = ({
  apiBaseUrl = '/api/v1/sellerops',
}) => {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let url = `${apiBaseUrl}/documents`;
      if (selectedCategory !== 'all') {
        url += `?category=${selectedCategory}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'notice':
        return <Bell className="w-5 h-5 text-red-500" />;
      case 'guide':
        return <Book className="w-5 h-5 text-blue-500" />;
      case 'policy':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'notice':
        return '공지사항';
      case 'guide':
        return '이용 가이드';
      case 'policy':
        return '정책';
      default:
        return '기타';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">공지사항</h1>
        <p className="text-gray-600">플랫폼 공지 및 이용 가이드</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="lg:col-span-1">
          {/* Category Filter */}
          <div className="bg-white rounded-lg shadow mb-4">
            <div className="p-4 border-b">
              <h2 className="font-semibold">카테고리</h2>
            </div>
            <div className="p-2">
              {['all', 'notice', 'guide', 'policy'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-2 rounded-lg mb-1 ${
                    selectedCategory === cat
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {cat === 'all' ? '전체' : getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Document List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">문서 목록</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                문서가 없습니다
              </div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
                      selectedDoc?.id === doc.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {getCategoryIcon(doc.category)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {selectedDoc ? (
              <>
                <div className="p-6 border-b">
                  <div className="flex items-center gap-3 mb-2">
                    {getCategoryIcon(selectedDoc.category)}
                    <span className="text-sm text-gray-500">
                      {getCategoryLabel(selectedDoc.category)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{selectedDoc.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(selectedDoc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-6">
                  <div className="prose max-w-none">
                    {selectedDoc.content.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>좌측에서 문서를 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticePage;
