import React from 'react'
import { Search, Filter, Download, RefreshCw } from 'lucide-react'
import { UserFilters as IUserFilters, UserRole, UserStatus, ROLE_LABELS, STATUS_LABELS, BUSINESS_TYPES } from '@/types/user'

interface UserFiltersProps {
  filters: IUserFilters
  onFiltersChange: (filters: IUserFilters) => void
  onExport?: () => void
  onRefresh?: () => void
  loading?: boolean
}

const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onFiltersChange,
  onExport,
  onRefresh,
  loading = false
}) => {
  const updateFilter = (key: keyof IUserFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    })
  }

  return (
    <div className="wp-card">
      <div className="wp-card-body">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 이메일, 전화번호로 검색..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="wp-input pl-10"
              />
            </div>
          </div>

          {/* 필터들 */}
          <div className="flex flex-wrap gap-2">
            {/* 역할 필터 */}
            <select
              value={filters.role || 'all'}
              onChange={(e) => updateFilter('role', e.target.value)}
              className="wp-select min-w-[120px]"
            >
              <option value="all">전체 역할</option>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>

            {/* 상태 필터 */}
            <select
              value={filters.status || 'all'}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="wp-select min-w-[120px]"
            >
              <option value="all">전체 상태</option>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>

            {/* 사업체 유형 필터 */}
            <select
              value={filters.businessType || 'all'}
              onChange={(e) => updateFilter('businessType', e.target.value)}
              className="wp-select min-w-[140px]"
            >
              <option value="all">전체 사업체</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* 가입일 필터 */}
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="wp-input"
              placeholder="시작일"
            />
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="wp-input"
              placeholder="종료일"
            />

            {/* 액션 버튼들 */}
            <div className="flex gap-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="wp-button-secondary"
                  title="새로고침"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}

              {onExport && (
                <button
                  onClick={onExport}
                  className="wp-button-secondary"
                  title="내보내기"
                >
                  <Download className="w-4 h-4" />
                  내보내기
                </button>
              )}

              <button
                onClick={() => onFiltersChange({})}
                className="wp-button-secondary"
                title="필터 초기화"
              >
                <Filter className="w-4 h-4" />
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 활성 필터 표시 */}
        {Object.values(filters).some(v => v && v !== 'all') && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">활성 필터:</span>
            
            {filters.role && filters.role !== 'all' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                역할: {ROLE_LABELS[filters.role as UserRole]}
                <button
                  onClick={() => updateFilter('role', 'all')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.status && filters.status !== 'all' && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                상태: {STATUS_LABELS[filters.status as UserStatus]}
                <button
                  onClick={() => updateFilter('status', 'all')}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.businessType && filters.businessType !== 'all' && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                사업체: {filters.businessType}
                <button
                  onClick={() => updateFilter('businessType', 'all')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.search && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                검색: {filters.search}
                <button
                  onClick={() => updateFilter('search', '')}
                  className="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            )}

            {(filters.dateFrom || filters.dateTo) && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                기간: {filters.dateFrom || '시작'} ~ {filters.dateTo || '끝'}
                <button
                  onClick={() => {
                    updateFilter('dateFrom', '')
                    updateFilter('dateTo', '')
                  }}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserFilters