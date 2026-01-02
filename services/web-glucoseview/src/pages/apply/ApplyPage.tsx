/**
 * GlucoseView Apply Page
 *
 * Phase C-4: CGM View 서비스 신청 페이지
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ApplyPage() {
  const { isAuthenticated } = useAuth();

  const [pharmacyName, setPharmacyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pharmacyName.trim()) {
      setError('약국명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.submitApplication({
        pharmacyName: pharmacyName.trim(),
        businessNumber: businessNumber.trim() || undefined,
        note: note.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      if (err.message?.includes('APPLICATION_PENDING')) {
        setError('이미 심사 대기 중인 신청이 있습니다.');
      } else if (err.message?.includes('ALREADY_APPROVED')) {
        setError('이미 승인된 신청이 있습니다.');
      } else {
        setError(err.message || '신청 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">서비스 신청을 위해 먼저 로그인해주세요.</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">신청이 완료되었습니다</h2>
          <p className="text-gray-600 mb-6">
            운영팀에서 검토 후 승인 결과를 알려드립니다.<br />
            보통 1-2 영업일 내에 처리됩니다.
          </p>
          <div className="space-y-3">
            <Link
              to="/apply/my-applications"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              내 신청 현황 보기
            </Link>
            <Link
              to="/"
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              홈으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">GlucoseView 서비스 신청</h1>
          <p className="text-gray-600 mt-2">CGM 데이터 조회 서비스를 신청합니다</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pharmacy Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                약국명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="예: 건강약국"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Business Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사업자등록번호
              </label>
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="예: 123-45-67890"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                추가 메모
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="추가로 전달하실 내용이 있으면 입력해주세요"
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Service Info */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">신청 서비스</h3>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-blue-700 font-medium">CGM View</span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">기본</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '신청 중...' : '서비스 신청하기'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link
              to="/apply/my-applications"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              내 신청 현황 보기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
