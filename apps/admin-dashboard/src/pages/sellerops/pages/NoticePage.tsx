/**
 * SellerOps Notice Page
 *
 * Refactored: PageHeader pattern applied (master-detail layout preserved)
 */

import React, { useState, useEffect } from 'react';
import { FileText, ChevronRight, Book, Bell, Info } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';

interface Document {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: Date;
}

const NoticePage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      const docs: Document[] = [
        {
          id: '1',
          title: 'SellerOps 시작 가이드',
          category: 'guide',
          content: '판매자 운영 앱(SellerOps)에 오신 것을 환영합니다. 이 가이드를 통해 플랫폼 사용법을 익혀보세요.\n\n1. 대시보드에서 판매 현황을 확인하세요.\n2. 공급자 관리에서 거래할 공급자를 선택하세요.\n3. 리스팅 관리에서 상품을 등록하세요.\n4. 주문이 들어오면 주문/배송 메뉴에서 확인하세요.',
          createdAt: new Date(),
        },
        {
          id: '2',
          title: '공급자 승인 요청 방법',
          category: 'guide',
          content: '공급자 승인을 요청하려면 공급자 관리 메뉴에서 원하는 공급자를 선택하고 승인 요청 버튼을 클릭하세요.\n\n승인이 완료되면 해당 공급자의 상품을 리스팅으로 등록할 수 있습니다.',
          createdAt: new Date(Date.now() - 86400000),
        },
        {
          id: '3',
          title: '플랫폼 업데이트 안내',
          category: 'notice',
          content: '2024년 12월 업데이트 내용:\n\n- 대시보드 UI 개선\n- 실시간 알림 기능 추가\n- 정산 상세 내역 확인 기능 추가',
          createdAt: new Date(Date.now() - 172800000),
        },
        {
          id: '4',
          title: '수수료 정책 안내',
          category: 'policy',
          content: '판매 수수료 정책:\n\n- 기본 수수료율: 10%\n- 정산 주기: 월 1회\n- 정산일: 매월 15일',
          createdAt: new Date(Date.now() - 259200000),
        },
      ];
      setDocuments(docs);
      setLoading(false);
    }, 500);
  }, [selectedCategory]);

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

  const filteredDocuments = documents.filter(
    (d) => selectedCategory === 'all' || d.category === selectedCategory
  );

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="공지사항"
        subtitle="플랫폼 공지 및 이용 가이드"
      />

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
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {filteredDocuments.map((doc) => (
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
                        {doc.createdAt.toLocaleDateString()}
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
                    {selectedDoc.createdAt.toLocaleDateString()}
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
