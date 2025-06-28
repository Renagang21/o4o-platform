import React, { useState } from 'react';
import { StatusBadge } from '../../../admin';
import { Settings, FileText, Palette, Calendar, Eye, Lock, Globe } from 'lucide-react';

interface SettingsPanelProps {
  selectedBlockId: string | null;
  pageId?: string;
}

export function SettingsPanel({ selectedBlockId, pageId }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'block' | 'page' | 'style'>('page');

  return (
    <div className="p-4">
      {/* 탭 헤더 */}
      <div className="mb-4">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('block')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'block'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            블록
          </button>
          <button
            onClick={() => setActiveTab('page')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'page'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            페이지
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'style'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Palette className="h-4 w-4 inline mr-2" />
            스타일
          </button>
        </div>
      </div>

      {/* 탭 내용 */}
      {activeTab === 'block' && (
        <BlockSettings selectedBlockId={selectedBlockId} />
      )}
      
      {activeTab === 'page' && (
        <PageSettings pageId={pageId} />
      )}
      
      {activeTab === 'style' && (
        <StyleSettings />
      )}
    </div>
  );
}

// 블록 설정
function BlockSettings({ selectedBlockId }: { selectedBlockId: string | null }) {
  if (!selectedBlockId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">블록을 선택하여 설정을 변경하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">블록 설정</h3>
      
      {/* 블록별 설정 UI */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            정렬
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option>왼쪽</option>
            <option>가운데</option>
            <option>오른쪽</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            여백
          </label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            defaultValue="20"
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0px</span>
            <span>100px</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배경색
          </label>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-white border border-gray-300 rounded cursor-pointer"></div>
            <div className="w-8 h-8 bg-gray-100 border border-gray-300 rounded cursor-pointer"></div>
            <div className="w-8 h-8 bg-blue-100 border border-gray-300 rounded cursor-pointer"></div>
            <div className="w-8 h-8 bg-green-100 border border-gray-300 rounded cursor-pointer"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 페이지 설정
function PageSettings({ pageId }: { pageId?: string }) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">페이지 설정</h3>
      
      <div className="space-y-4">
        {/* 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상태
          </label>
          <StatusBadge status="초안" variant="warning" />
        </div>

        {/* 가시성 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            가시성
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="public">
              <Globe className="inline h-4 w-4 mr-2" />
              공개
            </option>
            <option value="private">
              <Lock className="inline h-4 w-4 mr-2" />
              비공개
            </option>
            <option value="password">
              <Lock className="inline h-4 w-4 mr-2" />
              암호 보호
            </option>
          </select>
        </div>

        {/* 발행일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            발행일
          </label>
          <input 
            type="datetime-local" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* URL 슬러그 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL 슬러그
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
              /
            </span>
            <input 
              type="text" 
              placeholder="url-slug"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 요약 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            요약 (SEO)
          </label>
          <textarea 
            placeholder="페이지 요약을 입력하세요..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">검색 엔진에서 표시될 설명입니다.</p>
        </div>

        {/* 태그 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            태그
          </label>
          <input 
            type="text" 
            placeholder="태그를 입력하세요 (쉼표로 구분)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

// 스타일 설정
function StyleSettings() {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">스타일 설정</h3>
      
      <div className="space-y-4">
        {/* 테마 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            테마
          </label>
          <div className="grid grid-cols-1 gap-2">
            <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:border-blue-300">
              <input type="radio" name="theme" value="default" className="mr-3" defaultChecked />
              <div>
                <div className="font-medium text-sm">기본 테마</div>
                <div className="text-xs text-gray-500">클린하고 모던한 디자인</div>
              </div>
            </label>
            <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:border-blue-300">
              <input type="radio" name="theme" value="dark" className="mr-3" />
              <div>
                <div className="font-medium text-sm">다크 테마</div>
                <div className="text-xs text-gray-500">어두운 배경의 테마</div>
              </div>
            </label>
            <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:border-blue-300">
              <input type="radio" name="theme" value="minimal" className="mr-3" />
              <div>
                <div className="font-medium text-sm">미니멀 테마</div>
                <div className="text-xs text-gray-500">단순하고 깔끔한 스타일</div>
              </div>
            </label>
          </div>
        </div>

        {/* 폰트 크기 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            폰트 크기
          </label>
          <input 
            type="range" 
            min="12" 
            max="24" 
            defaultValue="16"
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>12px</span>
            <span>18px</span>
            <span>24px</span>
          </div>
        </div>

        {/* 라인 높이 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            라인 높이
          </label>
          <input 
            type="range" 
            min="1" 
            max="2" 
            step="0.1"
            defaultValue="1.5"
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1.0</span>
            <span>1.5</span>
            <span>2.0</span>
          </div>
        </div>

        {/* 콘텐츠 너비 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            콘텐츠 너비
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option>좁음 (600px)</option>
            <option>보통 (800px)</option>
            <option>넓음 (1000px)</option>
            <option>전체 너비</option>
          </select>
        </div>
      </div>
    </div>
  );
}