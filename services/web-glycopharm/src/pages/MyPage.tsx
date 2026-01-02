import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Edit3,
  Check,
  X,
  Camera,
} from 'lucide-react';

const roleLabels: Record<string, string> = {
  pharmacy: '약사',
  supplier: '공급자',
  partner: '파트너',
  operator: '운영자',
  consumer: '소비자',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '승인 대기', color: 'yellow' },
  approved: { label: '승인됨', color: 'green' },
  rejected: { label: '거부됨', color: 'red' },
  suspended: { label: '정지됨', color: 'gray' },
};

export default function MyPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-slate-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  const status = statusLabels[user.status] || statusLabels.pending;

  const handleSave = () => {
    // TODO: Implement save API
    setIsEditing(false);
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">마이페이지</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-primary-500 to-accent-600">
            <div className="absolute -bottom-12 left-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <Camera className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-16 pb-6 px-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slate-500">{roleLabels[user.role]}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-700`}>
                    {status.label}
                  </span>
                </div>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  편집
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    저장
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 border rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    취소
                  </button>
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid gap-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">이메일</p>
                  <p className="text-sm font-medium text-slate-800">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">이름</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{user.name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">연락처</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800">
                      {user.phone || '등록된 연락처가 없습니다'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">역할</p>
                  <p className="text-sm font-medium text-slate-800">{roleLabels[user.role]}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">상태</p>
                  <p className="text-sm font-medium text-slate-800">{status.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Sections */}
        <div className="mt-6 grid gap-6">
          {/* Security */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">보안 설정</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">비밀번호 변경</span>
                <span className="text-xs text-slate-400">마지막 변경: 30일 전</span>
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">2단계 인증</span>
                <span className="text-xs text-slate-400">비활성화</span>
              </button>
            </div>
          </div>

          {/* Account */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">계정 관리</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">알림 설정</span>
              </button>
              <button className="w-full text-left p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                <span className="text-sm text-red-600">계정 탈퇴</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
