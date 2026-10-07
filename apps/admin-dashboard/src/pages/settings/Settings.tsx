import { FC } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Package, Bot, Mail, Users, UserCircle } from 'lucide-react'
import AppServices from './AppServices'
import AiQuerySettings from './AiQuerySettings'
import EmailSettings from './EmailSettings'
// WO-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1
import AdminAccountsSettings from './AdminAccountsSettings'
// WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1: 내 계정 › Google 연결(기존 GoogleAccountLink 재사용)
import MyAccountSettings from './MyAccountSettings'

// WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: OAuth 탭 은퇴 — 로그인 수단은 Google 하나이고 그 설정은 서버 env
//   (`GOOGLE_ALLOWED_CLIENT_IDS`)가 정본이다. 화면에서 편집하지 않는다.
const settingsTabs = [
  { id: 'app-services', label: 'AI Services', icon: <Package className="w-4 h-4" />, path: '/settings' },
  { id: 'ai-query', label: 'AI Query', icon: <Bot className="w-4 h-4" />, path: '/settings/ai-query' },
  { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, path: '/settings/email' },
  { id: 'admin-accounts', label: '관리자 계정', icon: <Users className="w-4 h-4" />, path: '/settings/admin-accounts' },
  { id: 'my-account', label: '내 계정', icon: <UserCircle className="w-4 h-4" />, path: '/settings/my-account' }
]

const Settings: FC = () => {
  const location = useLocation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-o4o-text-primary">설정</h1>
        <p className="text-o4o-text-secondary mt-1">시스템 설정을 관리합니다</p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="border-b border-gray-300">
        <nav className="-mb-px flex space-x-8">
          {settingsTabs.map((tab) => {
            const isActive = location.pathname === tab.path
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`
                  flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-o4o-text-secondary hover:text-o4o-text-primary hover:border border-gray-200'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Settings Content */}
      <Routes>
        <Route index element={<AppServices />} />
        <Route path="app-services" element={<AppServices />} />
        <Route path="ai-query" element={<AiQuerySettings />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="admin-accounts" element={<AdminAccountsSettings />} />
        <Route path="my-account" element={<MyAccountSettings />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}

export default Settings