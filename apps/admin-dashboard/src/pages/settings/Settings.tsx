import { useState, useEffect, useCallback, useMemo, useRef, Fragment, FC } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Settings as SettingsIcon, Palette, Users, Mail, Link as LinkIcon, BookOpen } from 'lucide-react'
import ThemeSettingsWithAuth from './ThemeSettingsWithAuth'
import GeneralSettings from './GeneralSettings'
import ReadingSettings from './ReadingSettings'

const UserSettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>사용자 설정 페이지는 개발 중입니다.</p>
      </div>
    </div>
  </div>
)

const EmailSettings: FC = () => (
  <div className="wp-card">
    <div className="wp-card-body">
      <div className="text-center py-12 text-wp-text-secondary">
        <p>이메일 설정 페이지는 개발 중입니다.</p>
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
  { id: 'general', label: '일반 설정', icon: <SettingsIcon className="w-4 h-4" />, path: '' },
  { id: 'reading', label: '읽기 설정', icon: <BookOpen className="w-4 h-4" />, path: 'reading' },
  { id: 'theme', label: '테마 설정', icon: <Palette className="w-4 h-4" />, path: 'theme' },
  { id: 'users', label: '사용자 설정', icon: <Users className="w-4 h-4" />, path: 'users' },
  { id: 'email', label: '이메일 설정', icon: <Mail className="w-4 h-4" />, path: 'email' },
  { id: 'integrations', label: '연동 설정', icon: <LinkIcon className="w-4 h-4" />, path: 'integrations' }
]

const Settings: FC = () => {
  const location = useLocation()
  const currentPath = location.pathname.split('/').pop() || ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-wp-text-primary">설정</h1>
        <p className="text-wp-text-secondary mt-1">시스템 설정을 관리합니다</p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="border-b border-wp-border-secondary">
        <nav className="-mb-px flex space-x-8">
          {settingsTabs.map((tab) => {
            const isActive = tab.path === currentPath || (tab.path === '' && currentPath === 'settings')
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`
                  flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-wp-text-secondary hover:text-wp-text-primary hover:border-wp-border-primary'
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
        <Route path="reading" element={<ReadingSettings />} />
        <Route path="theme" element={<ThemeSettingsWithAuth />} />
        <Route path="users" element={<UserSettings />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="integrations" element={<IntegrationSettings />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}

export default Settings