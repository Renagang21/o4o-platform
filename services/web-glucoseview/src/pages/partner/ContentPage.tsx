/**
 * PartnerContentPage - 콘텐츠 관리 페이지
 * Reference: GlycoPharm (복제)
 */

import { useState } from 'react';
import {
  FileText,
  Image,
  Link2,
  Plus,
  MoreVertical,
  Edit2,
  Power,
  Trash2,
} from 'lucide-react';

interface PartnerContent {
  id: string;
  type: 'text' | 'image' | 'link';
  title: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const mockContents: PartnerContent[] = [
  {
    id: '1',
    type: 'text',
    title: '혈당 관리 가이드',
    description: '일상에서 쉽게 실천할 수 있는 혈당 관리 방법을 안내합니다.',
    status: 'active',
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    type: 'image',
    title: '1월 건강 캠페인 배너',
    description: '새해 건강 관리 캠페인 이미지',
    status: 'active',
    createdAt: '2026-01-08',
  },
];

const typeConfig = {
  text: { icon: FileText, label: '텍스트', color: 'blue' },
  image: { icon: Image, label: '이미지', color: 'green' },
  link: { icon: Link2, label: '링크', color: 'cyan' },
};

export default function PartnerContentPage() {
  const [contents] = useState<PartnerContent[]>(mockContents);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">콘텐츠</h1>
          <p className="text-slate-500 mt-1">
            홍보용 콘텐츠를 작성하고 관리하세요.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          콘텐츠 추가
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-slate-600">
          콘텐츠의 실제 노출 방식과 위치는 서비스 정책에 따라 결정됩니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">내 콘텐츠</h2>
        </div>

        {contents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">아직 등록된 콘텐츠가 없습니다.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              첫 콘텐츠 만들기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contents.map((content) => {
              const config = typeConfig[content.type];
              const Icon = config.icon;

              return (
                <li key={content.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-${config.color}-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${config.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800 truncate">
                          {content.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          content.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {content.status === 'active' ? '활성' : '비활성'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {content.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {config.label} · {content.createdAt}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === content.id ? null : content.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </button>
                      {activeMenu === content.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border py-1 z-20">
                            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Edit2 className="w-4 h-4" />
                              수정
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Power className="w-4 h-4" />
                              {content.status === 'active' ? '비활성화' : '활성화'}
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <Trash2 className="w-4 h-4" />
                              삭제
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">콘텐츠 추가</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  콘텐츠 타입
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(typeConfig).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        className="p-3 border rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <Icon className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                        <span className="text-xs text-slate-600">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="콘텐츠 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  설명
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="콘텐츠 설명을 입력하세요"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
