import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 약사(사용자) 정보 타입
interface PharmacistInfo {
  name: string;
  pharmacyName: string;
  pharmacyAddress: string;
  phone: string;
  email: string;
  licenseNumber: string;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  // 현재 로그인한 약사 정보
  const [pharmacist, setPharmacist] = useState<PharmacistInfo>({
    name: user?.name || '',
    pharmacyName: user?.pharmacyName || '',
    pharmacyAddress: user?.pharmacyAddress || '',
    phone: user?.phone || '',
    email: user?.email || '',
    licenseNumber: user?.licenseNumber || '',
  });

  // user가 변경되면 pharmacist 상태도 업데이트
  useEffect(() => {
    if (user) {
      setPharmacist({
        name: user.name || '',
        pharmacyName: user.pharmacyName || '',
        pharmacyAddress: user.pharmacyAddress || '',
        phone: user.phone || '',
        email: user.email || '',
        licenseNumber: user.licenseNumber || '',
      });
    }
  }, [user]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<PharmacistInfo>(pharmacist);

  const handleSave = () => {
    setPharmacist(editForm);
    updateUser({
      name: editForm.name,
      pharmacyName: editForm.pharmacyName,
      pharmacyAddress: editForm.pharmacyAddress,
      phone: editForm.phone,
      licenseNumber: editForm.licenseNumber,
    });
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditForm(pharmacist);
    setIsEditing(true);
  };

  const isRegistered = pharmacist.name !== '';

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">Settings</h1>
          <p className="text-slate-500">약사 정보 및 약국 설정</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Pharmacist Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">약사 정보</h2>
                  <p className="text-sm text-slate-500">서비스 이용을 위한 기본 정보</p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {isRegistered ? '수정' : '등록'}
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {/* 이름 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    약사 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="홍길동"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 면허번호 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    약사 면허번호
                  </label>
                  <input
                    type="text"
                    value={editForm.licenseNumber}
                    onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                    placeholder="12345"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 약국명 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    약국명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.pharmacyName}
                    onChange={(e) => setEditForm({ ...editForm, pharmacyName: e.target.value })}
                    placeholder="건강약국"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 약국 주소 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    약국 주소
                  </label>
                  <input
                    type="text"
                    value={editForm.pharmacyAddress}
                    onChange={(e) => setEditForm({ ...editForm, pharmacyAddress: e.target.value })}
                    placeholder="서울시 강남구..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 연락처 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      전화번호
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="02-1234-5678"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      이메일
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="pharmacy@example.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    저장하기
                  </button>
                </div>
              </div>
            ) : isRegistered ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">약사 이름</p>
                    <p className="text-sm font-medium text-slate-900">{pharmacist.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">면허번호</p>
                    <p className="text-sm font-medium text-slate-900">{pharmacist.licenseNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">약국명</p>
                    <p className="text-sm font-medium text-slate-900">{pharmacist.pharmacyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">약국 주소</p>
                    <p className="text-sm font-medium text-slate-900">{pharmacist.pharmacyAddress || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">전화번호</p>
                    <p className="text-sm font-medium text-slate-900">{pharmacist.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">이메일</p>
                    <p className="text-sm font-medium text-slate-900">{pharmacist.email || '-'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-slate-500 mb-1">약사 정보가 등록되지 않았습니다</p>
                <p className="text-xs text-slate-400 mb-4">서비스 이용을 위해 정보를 등록해 주세요</p>
                <button
                  onClick={handleStartEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  정보 등록하기
                </button>
              </div>
            )}
          </div>

          {/* Data Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">데이터 관리</h2>
                <p className="text-sm text-slate-500">CGM 연동 및 데이터 설정</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">LibreView 연동</p>
                  <p className="text-xs text-slate-500">Abbott FreeStyle Libre</p>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full">미연동</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Dexcom 연동</p>
                  <p className="text-xs text-slate-500">Dexcom G6/G7</p>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full">미연동</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">조제 데이터 연동</p>
                  <p className="text-xs text-slate-500">약국 조제 시스템</p>
                </div>
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">준비 중</span>
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">서비스 정보</h2>
                <p className="text-sm text-slate-500">GlucoseView 버전 정보</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">버전</span>
                <span className="text-slate-900">1.0.0 (Beta)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">최종 업데이트</span>
                <span className="text-slate-900">2026.01.01</span>
              </div>
            </div>
          </div>

          {/* Notice */}
          <p className="text-xs text-slate-400 text-center">
            등록된 고객 데이터는 약사 계정별로 안전하게 분리 저장됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
