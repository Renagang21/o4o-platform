import { FC } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Settings as SettingsIcon, Palette, Mail, Link as LinkIcon, BookOpen, Key, FileText, MessageSquare, Image, Shield } from 'lucide-react'
import ThemeSettingsWithAuth from './ThemeSettingsWithAuth'
import GeneralSettings from './GeneralSettings'
import ReadingSettings from './ReadingSettings'
import OAuthSettings from './OAuthSettings'
import WritingSettings from './WritingSettings'
import DiscussionSettings from './DiscussionSettings'
import EmailSettings from './EmailSettings'

const UserSettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>사용자 설정 페이지는 개발 중입니다.</p>
      </div>
    </div>
  </div>
)

const MediaSettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>미디어 설정 페이지는 개발 중입니다.</p>
      </div>
    </div>
  </div>
)

const PermalinksSettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>고유주소 설정 페이지는 개발 중입니다.</p>
      </div>
    </div>
  </div>
)

const PrivacySettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>개인정보 설정 페이지는 개발 중입니다.</p>
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
  { id: 'writing', label: '쓰기', icon: <FileText className="w-4 h-4" />, path: '/settings/writing' },
  { id: 'reading', label: '읽기', icon: <BookOpen className="w-4 h-4" />, path: '/settings/reading' },
  { id: 'discussion', label: '토론', icon: <MessageSquare className="w-4 h-4" />, path: '/settings/discussion' },
  { id: 'media', label: '미디어', icon: <Image className="w-4 h-4" />, path: '/settings/media' },
  { id: 'permalinks', label: '고유주소', icon: <LinkIcon className="w-4 h-4" />, path: '/settings/permalinks' },
  { id: 'privacy', label: '개인정보', icon: <Shield className="w-4 h-4" />, path: '/settings/privacy' },
  { id: 'theme', label: '테마', icon: <Palette className="w-4 h-4" />, path: '/settings/theme' },
  { id: 'oauth', label: 'OAuth', icon: <Key className="w-4 h-4" />, path: '/settings/oauth' },
  { id: 'email', label: '이메일', icon: <Mail className="w-4 h-4" />, path: '/settings/email' }
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
        <Route path="discussion" element={<DiscussionSettings />} />
        <Route path="media" element={<MediaSettings />} />
        <Route path="permalinks" element={<PermalinksSettings />} />
        <Route path="privacy" element={<PrivacySettings />} />
        <Route path="theme" element={<ThemeSettingsWithAuth />} />
        <Route path="oauth" element={<OAuthSettings />} />
        <Route path="users" element={<UserSettings />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="integrations" element={<IntegrationSettings />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}

export default Settings