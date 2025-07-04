import React from 'react'

const Content: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">콘텐츠 관리</h1>
        <p className="text-gray-600 mt-1">사이트의 콘텐츠를 관리합니다</p>
      </div>

      <div className="wp-card">
        <div className="wp-card-body">
          <div className="text-center py-12 text-gray-500">
            <p>콘텐츠 관리 페이지는 개발 중입니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Content