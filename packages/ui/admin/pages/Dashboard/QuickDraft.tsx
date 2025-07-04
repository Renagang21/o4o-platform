import React, { useState } from 'react';
import { Save, FileText } from 'lucide-react';

interface Draft {
  id: string;
  title: string;
  date: string;
}

export function QuickDraft() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const recentDrafts: Draft[] = [
    { id: '1', title: '새로운 제품 출시 계획', date: '2024년 6월 27일' },
    { id: '2', title: '고객 서비스 개선 방안', date: '2024년 6월 26일' },
    { id: '3', title: '마케팅 전략 검토', date: '2024년 6월 25일' }
  ];

  const handleSaveDraft = async () => {
    if (!title.trim() && !content.trim()) return;
    
    setIsSaving(true);
    // 실제 저장 로직
    setTimeout(() => {
      setIsSaving(false);
      setTitle('');
      setContent('');
      alert('초안이 저장되었습니다!');
    }, 1000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          빠른 초안
        </h3>
      </div>

      {/* Widget Content */}
      <div className="p-4 space-y-4">
        {/* Title Input */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Content Textarea */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="무슨 생각을 하고 계신가요?"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || (!title.trim() && !content.trim())}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '저장 중...' : '초안 저장'}
          </button>
        </div>

        {/* Recent Drafts */}
        {recentDrafts.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">최근 초안</h4>
            <div className="space-y-2">
              {recentDrafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {draft.title}
                    </p>
                    <p className="text-xs text-gray-500">{draft.date}</p>
                  </div>
                  <button className="ml-2 text-blue-600 hover:text-blue-800 text-sm">
                    편집
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <a 
                href="/admin/posts?status=draft" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                모든 초안 보기 →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}