/**
 * AGModal Demo Page
 *
 * Phase 7-C: Global Components Demo
 */

import React, { useState } from 'react';
import { AGModal, AGConfirmModal } from '../../components/ag/AGModal';

export default function ModalDemo() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [sizedOpen, setSizedOpen] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dangerConfirmOpen, setDangerConfirmOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setConfirmOpen(false);
    alert('확인되었습니다!');
  };

  const handleDangerConfirm = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setDangerConfirmOpen(false);
    alert('삭제되었습니다!');
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AGModal 데모</h1>
        <p className="text-gray-500 mt-1">모달 컴포넌트 데모 페이지</p>
      </div>

      {/* Basic Modal */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">기본 모달</h2>
        <button
          onClick={() => setBasicOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          기본 모달 열기
        </button>

        <AGModal
          isOpen={basicOpen}
          onClose={() => setBasicOpen(false)}
          title="기본 모달"
          description="이것은 기본 모달의 설명입니다."
        >
          <p className="text-gray-600">
            모달 내용이 여기에 표시됩니다. ESC 키를 누르거나 오버레이를 클릭하여
            모달을 닫을 수 있습니다.
          </p>
        </AGModal>
      </section>

      {/* Size Variants */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">크기 변형</h2>
        <div className="flex flex-wrap gap-2">
          {['sm', 'md', 'lg', 'xl', 'full'].map((size) => (
            <button
              key={size}
              onClick={() => setSizedOpen(size)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>

        <AGModal
          isOpen={!!sizedOpen}
          onClose={() => setSizedOpen(null)}
          title={`${sizedOpen?.toUpperCase()} 크기 모달`}
          size={sizedOpen as 'sm' | 'md' | 'lg' | 'xl' | 'full'}
        >
          <p className="text-gray-600">
            이 모달은 {sizedOpen?.toUpperCase()} 크기로 설정되어 있습니다.
            다양한 크기의 모달을 사용하여 콘텐츠에 맞는 레이아웃을 구성할 수 있습니다.
          </p>
          {sizedOpen === 'full' && (
            <div className="mt-4 h-64 bg-gray-100 rounded flex items-center justify-center">
              <p className="text-gray-400">전체 화면 모달 콘텐츠 영역</p>
            </div>
          )}
        </AGModal>
      </section>

      {/* Confirm Modal */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">확인 모달</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            확인 모달
          </button>
          <button
            onClick={() => setDangerConfirmOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            삭제 확인 모달
          </button>
        </div>

        <AGConfirmModal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          title="작업 확인"
          message="이 작업을 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          confirmLabel="확인"
          cancelLabel="취소"
          loading={loading}
        />

        <AGConfirmModal
          isOpen={dangerConfirmOpen}
          onClose={() => setDangerConfirmOpen(false)}
          onConfirm={handleDangerConfirm}
          title="삭제 확인"
          message="정말로 이 항목을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다."
          confirmLabel="삭제"
          cancelLabel="취소"
          variant="danger"
          loading={loading}
        />
      </section>

      {/* Modal with Form */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">폼 모달</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          폼 모달 열기
        </button>

        <AGModal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          title="새 사용자 추가"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  alert('저장되었습니다!');
                  setFormOpen(false);
                }}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          }
        >
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="이름을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="이메일을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                역할
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <option value="">선택하세요</option>
                <option value="admin">관리자</option>
                <option value="editor">편집자</option>
                <option value="viewer">뷰어</option>
              </select>
            </div>
          </form>
        </AGModal>
      </section>

      {/* Modal Features */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">모달 기능</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              ESC 키로 닫기
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              오버레이 클릭으로 닫기
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              포커스 트랩 (모달 내부에 포커스 유지)
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              바디 스크롤 잠금
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              다양한 크기 지원 (sm, md, lg, xl, full)
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
