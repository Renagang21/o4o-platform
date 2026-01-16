import { FC } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Key, Package, Bot } from 'lucide-react'
import OAuthSettings from './OAuthSettings'
import AppServices from './AppServices'
import AiQuerySettings from './AiQuerySettings'

const settingsTabs = [
  { id: 'oauth', label: 'OAuth', icon: <Key className="w-4 h-4" />, path: '/settings' },
  { id: 'app-services', label: 'AI Services', icon: <Package className="w-4 h-4" />, path: '/settings/app-services' },
  { id: 'ai-query', label: 'AI Query', icon: <Bot className="w-4 h-4" />, path: '/settings/ai-query' }
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
        <Route index element={<OAuthSettings />} />
        <Route path="app-services" element={<AppServices />} />
        <Route path="ai-query" element={<AiQuerySettings />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}

export default Settings