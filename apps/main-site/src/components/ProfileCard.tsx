import React from 'react';
import { User, UserRole } from '../contexts/AuthContext';
import { UserCircle, Mail, Shield, Calendar, LogOut, KeyRound } from 'lucide-react';

interface ProfileCardProps {
  user: User;
  onLogout: () => void;
  onPasswordChange?: () => void;
}

const roleLabel: Record<string, string> = {
  b2c: '일반 사용자',
  yaksa: '약사',
  admin: '관리자',
};

const ProfileCard: FC<ProfileCardProps> = ({ user, onLogout, onPasswordChange }) => {
  const joinDate = user._id.length === 24 ? new Date(parseInt(user._id.substring(0, 8), 16) * 1000) : new Date();
  const formattedDate = joinDate.toISOString().slice(0, 10);

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col gap-4">
      <div className="flex items-center gap-4 mb-2">
        <UserCircle size={40} className="text-blue-500" />
        <div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-300">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
        <Shield size={18} />
        <span className="font-medium">역할:</span>
        <span>{roleLabel[user.roles[0]]}</span>
        {user.roles.includes('yaksa' as UserRole) && (
          <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs">약사 인증 대기/승인</span>
        )}
        {user.roles.includes('admin' as UserRole) && (
          <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">관리자</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
        <Calendar size={18} />
        <span className="font-medium">가입일:</span>
        <span>{formattedDate}</span>
      </div>
      <div className="flex gap-2 mt-4">
        {onPasswordChange && (
          <button
            onClick={onPasswordChange}
            className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm"
          >
            <KeyRound size={16} /> 비밀번호 변경
          </button>
        )}
        <button
          onClick={onLogout}
          className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          <LogOut size={16} /> 로그아웃
        </button>
      </div>
    </div>
  );
};

export default ProfileCard; 