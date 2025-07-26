import { useState, useEffect, useCallback, useMemo, useRef, Fragment, FC } from 'react'

const Analytics: FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-wp-text-primary">분석 & 리포트</h1>
        <p className="text-wp-text-secondary mt-1">플랫폼의 성과를 분석합니다</p>
      </div>

      <div className="wp-card">
        <div className="wp-card-body">
          <div className="text-center py-12 text-wp-text-secondary">
            <p>분석 페이지는 개발 중입니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics