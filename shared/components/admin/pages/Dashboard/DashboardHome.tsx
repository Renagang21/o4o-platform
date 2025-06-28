import React, { useState } from 'react';
import { QuickDraft } from './QuickDraft';
import { ActivityWidget } from './ActivityWidget';
import { NewsWidget } from './NewsWidget';
import { SiteHealthWidget } from './SiteHealthWidget';
import { Settings, Eye, EyeOff } from 'lucide-react';

export function DashboardHome() {
  const [screenOptions, setScreenOptions] = useState({
    quickDraft: true,
    activity: true,
    news: true,
    siteHealth: true
  });
  const [screenOptionsOpen, setScreenOptionsOpen] = useState(false);

  const toggleWidget = (widget: keyof typeof screenOptions) => {
    setScreenOptions(prev => ({
      ...prev,
      [widget]: !prev[widget]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              안녕하세요! 알림판에 오신 것을 환영합니다.
            </h2>
            <p className="text-gray-600">
              O4O Platform의 WordPress 스타일 관리자 환경에서 콘텐츠를 관리하세요.
            </p>
          </div>
          
          {/* Screen Options */}
          <div className="relative">
            <button
              onClick={() => setScreenOptionsOpen(!screenOptionsOpen)}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              화면 옵션
            </button>

            {screenOptionsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setScreenOptionsOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
                  <h3 className="font-medium text-gray-900 mb-3">위젯 표시/숨기기</h3>
                  <div className="space-y-2">
                    {Object.entries(screenOptions).map(([key, enabled]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleWidget(key as keyof typeof screenOptions)}
                          className="mr-2 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          {key === 'quickDraft' && '빠른 초안'}
                          {key === 'activity' && '최근 활동'}
                          {key === 'news' && 'WordPress 뉴스'}
                          {key === 'siteHealth' && '사이트 상태'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Draft Widget */}
        {screenOptions.quickDraft && (
          <div className="lg:col-span-1">
            <QuickDraft />
          </div>
        )}

        {/* Activity Widget */}
        {screenOptions.activity && (
          <div className="lg:col-span-1">
            <ActivityWidget />
          </div>
        )}

        {/* WordPress News Widget */}
        {screenOptions.news && (
          <div className="lg:col-span-1">
            <NewsWidget />
          </div>
        )}

        {/* Site Health Widget */}
        {screenOptions.siteHealth && (
          <div className="lg:col-span-1">
            <SiteHealthWidget />
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                📝
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">전체 글</p>
              <p className="text-lg font-semibold text-gray-900">245</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                📄
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">전체 페이지</p>
              <p className="text-lg font-semibold text-gray-900">18</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                💬
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">댓글</p>
              <p className="text-lg font-semibold text-gray-900">1,234</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                👥
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">사용자</p>
              <p className="text-lg font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}