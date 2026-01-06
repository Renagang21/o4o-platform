/**
 * Event/Notice Tab
 *
 * 운영자 Event/Notice 콘텐츠 관리
 * - Event/Notice 목록 관리
 * - 콘텐츠 등록 (제목, 본문 요약, 링크)
 * - 고정(isPinned) 상태 표시 (운영자 콘텐츠 기본 고정)
 * - 노출/비노출 토글
 *
 * 운영자 Event/Notice는 스토어에 항상 고정 노출됨
 */

import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Megaphone,
  Bell,
  Pin,
  X,
  ExternalLink,
} from 'lucide-react';
import type { EventNoticeContent, EventNoticeType } from '@/types/store';

// Mock 데이터 (실제로는 API에서 가져옴)
const MOCK_EVENT_NOTICES: EventNoticeContent[] = [
  {
    id: 'notice-1',
    type: 'notice',
    owner: 'operator',
    title: '플랫폼 점검 안내',
    summary: '1월 20일 새벽 2시~4시 서비스 점검이 예정되어 있습니다.',
    link: '/notice/1',
    isActive: true,
    isPinned: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'event-1',
    type: 'event',
    owner: 'operator',
    title: '신규 회원 가입 이벤트',
    summary: '신규 가입 시 5,000원 적립금 즉시 지급!',
    link: '/event/welcome',
    isActive: true,
    isPinned: true,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'notice-2',
    type: 'notice',
    owner: 'operator',
    title: '배송비 정책 변경 안내',
    summary: '2024년 2월부터 무료배송 기준이 30,000원으로 변경됩니다.',
    isActive: false,
    isPinned: true,
    createdAt: '2024-01-10T09:00:00Z',
  },
];

interface EventNoticeFormData {
  type: EventNoticeType;
  title: string;
  summary: string;
  link: string;
  startDate: string;
  endDate: string;
}

const INITIAL_FORM: EventNoticeFormData = {
  type: 'notice',
  title: '',
  summary: '',
  link: '',
  startDate: '',
  endDate: '',
};

export function EventNoticeTab() {
  const [contents, setContents] = useState<EventNoticeContent[]>(MOCK_EVENT_NOTICES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventNoticeFormData>(INITIAL_FORM);
  const [filterType, setFilterType] = useState<'all' | EventNoticeType>('all');

  // 필터링된 콘텐츠
  const filteredContents = contents.filter(
    (c) => filterType === 'all' || c.type === filterType
  );

  // 활성화 토글
  const toggleActive = (id: string) => {
    setContents((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  // 삭제
  const deleteContent = (id: string) => {
    if (confirm('이 콘텐츠를 삭제하시겠습니까?')) {
      setContents((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // 편집 모달 열기
  const openEditModal = (content: EventNoticeContent) => {
    setEditingId(content.id);
    setForm({
      type: content.type,
      title: content.title,
      summary: content.summary || '',
      link: content.link || '',
      startDate: content.startDate || '',
      endDate: content.endDate || '',
    });
    setIsModalOpen(true);
  };

  // 신규 등록 모달 열기
  const openCreateModal = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  };

  // 저장
  const handleSave = () => {
    if (!form.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (editingId) {
      // 수정
      setContents((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                type: form.type,
                title: form.title,
                summary: form.summary || undefined,
                link: form.link || undefined,
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
              }
            : item
        )
      );
    } else {
      // 신규 등록
      const newContent: EventNoticeContent = {
        id: `${form.type}-${Date.now()}`,
        type: form.type,
        owner: 'operator',
        title: form.title,
        summary: form.summary || undefined,
        link: form.link || undefined,
        isActive: true,
        isPinned: true, // 운영자 콘텐츠는 항상 고정
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        createdAt: new Date().toISOString(),
      };
      setContents((prev) => [newContent, ...prev]);
    }

    setIsModalOpen(false);
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* 상단 액션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체 ({contents.length})
          </button>
          <button
            onClick={() => setFilterType('notice')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterType === 'notice'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            공지 ({contents.filter((c) => c.type === 'notice').length})
          </button>
          <button
            onClick={() => setFilterType('event')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterType === 'event'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            이벤트 ({contents.filter((c) => c.type === 'event').length})
          </button>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 콘텐츠 등록
        </button>
      </div>

      {/* 콘텐츠 목록 */}
      <div className="space-y-3">
        {filteredContents.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">등록된 콘텐츠가 없습니다.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-primary-600 hover:underline text-sm"
            >
              첫 번째 콘텐츠 등록하기
            </button>
          </div>
        ) : (
          filteredContents.map((content) => (
            <div
              key={content.id}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-colors
                ${content.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}
              `}
            >
              {/* 타입 아이콘 */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${content.type === 'event' ? 'bg-amber-100' : 'bg-primary-100'}
                `}
              >
                {content.type === 'event' ? (
                  <Megaphone className="w-5 h-5 text-amber-600" />
                ) : (
                  <Bell className="w-5 h-5 text-primary-600" />
                )}
              </div>

              {/* 콘텐츠 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${content.type === 'event'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-primary-100 text-primary-700'
                      }
                    `}
                  >
                    {content.type === 'event' ? '이벤트' : '공지'}
                  </span>
                  {content.isPinned && (
                    <span title="고정됨">
                      <Pin className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-slate-800 truncate mt-1">{content.title}</h3>
                {content.summary && (
                  <p className="text-sm text-slate-500 truncate mt-0.5">{content.summary}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>등록: {formatDate(content.createdAt)}</span>
                  {content.startDate && content.endDate && (
                    <span>
                      기간: {formatDate(content.startDate)} ~ {formatDate(content.endDate)}
                    </span>
                  )}
                  {content.link && (
                    <a
                      href={content.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 flex items-center gap-1 hover:underline"
                    >
                      링크 <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* 액션 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(content.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    content.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  title={content.isActive ? '비활성화' : '활성화'}
                >
                  {content.isActive ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => openEditModal(content)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="편집"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteContent(content.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 등록/편집 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? '콘텐츠 편집' : '새 콘텐츠 등록'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 타입 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  콘텐츠 유형
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'notice' })}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors
                      ${form.type === 'notice'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <Bell className="w-5 h-5" />
                    공지
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'event' })}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors
                      ${form.type === 'event'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <Megaphone className="w-5 h-5" />
                    이벤트
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="콘텐츠 제목을 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  요약 (선택)
                </label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="본문 요약을 입력하세요"
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  상세 링크 (선택)
                </label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="/notice/1 또는 https://..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* 이벤트 기간 (이벤트 타입일 때만) */}
              {form.type === 'event' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      시작일 (선택)
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      종료일 (선택)
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* 운영 규칙 안내 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-800">
                  <strong>운영자 콘텐츠 규칙:</strong> 이 콘텐츠는 모든 약국 스토어에 고정 노출됩니다.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingId ? '저장' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
