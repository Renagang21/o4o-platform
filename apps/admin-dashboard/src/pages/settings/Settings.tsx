import { FC } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Settings as SettingsIcon, Mail, BookOpen, Key, FileText, MessageSquare, Shield, Link as LinkIcon, Edit, Sparkles, Package } from 'lucide-react'
import GeneralSettings from './GeneralSettings'
import ReadingSettings from './ReadingSettings'
import OAuthSettings from './OAuthSettings'
import EmailSettings from './EmailSettings'
import PermalinkSettings from './PermalinkSettings'
import WritingSettings from './WritingSettings'
import PrivacySettings from './PrivacySettings'
import AISettings from './AISettings'
import AppServices from './AppServices'

const UserSettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>사용자 설정 페이지는 개발 중입니다.</p>
      </div>
    </div>
  </div>
)


const IntegrationSettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>연동 설정 페이지는 개발 중입니다.</p>
      </div>
    </div>
  </div>
)

const settingsTabs = [
  { id: 'general', label: '일반', icon: <SettingsIcon className="w-4 h-4" />, path: '/settings' },
  { id: 'writing', label: '쓰기', icon: <Edit className="w-4 h-4" />, path: '/settings/writing' },
  { id: 'reading', label: '읽기', icon: <BookOpen className="w-4 h-4" />, path: '/settings/reading' },
  { id: 'permalink', label: '고유주소', icon: <LinkIcon className="w-4 h-4" />, path: '/settings/permalink' },
  { id: 'discussion', label: '토론', icon: <MessageSquare className="w-4 h-4" />, path: '/settings/discussion' },
  { id: 'privacy', label: '개인정보', icon: <Shield className="w-4 h-4" />, path: '/settings/privacy' },
  { id: 'oauth', label: 'OAuth', icon: <Key className="w-4 h-4" />, path: '/settings/oauth' },
  { id: 'email', label: '이메일', icon: <Mail className="w-4 h-4" />, path: '/settings/email' },
  { id: 'ai', label: 'AI API', icon: <Sparkles className="w-4 h-4" />, path: '/settings/ai' },
  { id: 'app-services', label: 'AI Services', icon: <Package className="w-4 h-4" />, path: '/settings/app-services' }
]

const Settings: FC = () => {
  const location = useLocation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-wp-text-primary">설정</h1>
        <p className="text-wp-text-secondary mt-1">시스템 설정을 관리합니다</p>
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
                    : 'border-transparent text-wp-text-secondary hover:text-wp-text-primary hover:border border-gray-200'
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
        <Route index element={<GeneralSettings />} />
        <Route path="writing" element={<WritingSettings />} />
        <Route path="reading" element={<ReadingSettings />} />
        <Route path="permalink" element={<PermalinkSettings />} />
        <Route path="privacy" element={<PrivacySettings />} />
        <Route path="oauth" element={<OAuthSettings />} />
        <Route path="users" element={<UserSettings />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="ai" element={<AISettings />} />
        <Route path="app-services" element={<AppServices />} />
        <Route path="integrations" element={<IntegrationSettings />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}

export default Settings