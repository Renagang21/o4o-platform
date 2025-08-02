import { useState, useEffect, FC } from 'react';
import { UserCheck, UserX, Clock, AlertTriangle, Filter } from 'lucide-react'
import { User, UserBulkAction } from '@/types/user'
import { UserApi } from '@/api/userApi'
import UserTable from './components/UserTable'
import BulkActions from './components/BulkActions'
import toast from 'react-hot-toast'

const PendingApproval: FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  })

  const pageSize = 20

  const loadPendingUsers = async (page = 1) => {
    try {
      setLoading(true)
      const response = await UserApi.getPendingUsers(
        page, 
        pageSize, 
        businessTypeFilter !== 'all' ? businessTypeFilter : undefined
      )
      setUsers(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      console.error('Failed to load pending users:', error)
      toast.error('승인 대기 사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingUsers()
  }, [businessTypeFilter])

  // 검색 필터링
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.businessInfo?.businessName?.toLowerCase().includes(searchLower) ||
      user.businessInfo?.businessType?.toLowerCase().includes(searchLower)
    )
  })

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedUsers(selected ? filteredUsers.map(u => u.id) : [])
  }

  const handleApprove = async (userId: string) => {
    try {
      await UserApi.approveUser(userId)
      toast.success('사용자가 승인되었습니다.')
      loadPendingUsers(pagination.current)
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    } catch (error: any) {
      console.error('Failed to approve user:', error)
      toast.error('승인에 실패했습니다.')
    }
  }

  const handleReject = async (userId: string) => {
    const reason = prompt('거부 사유를 입력해주세요:')
    if (!reason?.trim()) return

    try {
      await UserApi.rejectUser(userId, reason)
      toast.success('사용자가 거부되었습니다.')
      loadPendingUsers(pagination.current)
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    } catch (error: any) {
      console.error('Failed to reject user:', error)
      toast.error('거부에 실패했습니다.')
    }
  }

  const handleBulkAction = async (action: UserBulkAction) => {
    try {
      await UserApi.bulkAction({
        ...action,
        userIds: selectedUsers
      })
      toast.success('일괄 작업이 완료되었습니다.')
      setSelectedUsers([])
      loadPendingUsers(pagination.current)
    } catch (error: any) {
      console.error('Bulk action failed:', error)
      toast.error('일괄 작업에 실패했습니다.')
    }
  }

  const handlePageChange = (page: number) => {
    loadPendingUsers(page)
  }

  const businessTypes = [...new Set(users.map(u => u.businessInfo?.businessType).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">승인 대기 사용자</h1>
          <p className="text-gray-600 mt-1">가입 승인을 기다리는 사용자들을 관리합니다</p>
        </div>
        
        {/* 빠른 통계 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {pagination.totalItems}명이 승인을 기다리고 있습니다
            </span>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 검색 */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="이름, 이메일, 사업체명으로 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="wp-input"
              />
            </div>

            {/* 사업체 유형 필터 */}
            <div className="flex gap-2">
              <select
                value={businessTypeFilter}
                onChange={(e: any) => setBusinessTypeFilter(e.target.value)}
                className="wp-select min-w-[150px]"
              >
                <option value="all">전체 사업체</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <button
                onClick={() => loadPendingUsers(pagination.current)}
                disabled={loading}
                className="wp-button-secondary"
                title="새로고침"
              >
                <Filter className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 일괄 작업 */}
      <BulkActions
        selectedCount={selectedUsers.length}
        onBulkAction={handleBulkAction}
        onClearSelection={() => setSelectedUsers([])}
        availableActions={['approve', 'reject']}
      />

      {/* 승인 대기 알림 */}
      {filteredUsers.length > 0 && (
        <div className="wp-notice-info">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <div>
              <p className="font-medium">승인 처리 안내</p>
              <p className="text-sm mt-1">
                사업자 회원의 경우 사업자등록번호와 사업체 정보를 반드시 확인해주세요. 
                승인 후 도매가격으로 구매할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 테이블 */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            승인 대기 목록 ({filteredUsers.length}명)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">승인 대기 중인 사용자가 없습니다</p>
              <p className="text-sm">모든 신규 가입자가 처리되었습니다.</p>
            </div>
          ) : (
            <UserTable
              users={filteredUsers}
              selectedUsers={selectedUsers}
              onSelectUser={handleSelectUser}
              onSelectAll={handleSelectAll}
              onApprove={handleApprove}
              onReject={handleReject}
              showActions={true}
              showBulkSelect={true}
            />
          )}
        </div>
      </div>

      {/* 승인/거부 빠른 액션 */}
      {filteredUsers.length > 0 && (
        <div className="wp-card border-l-4 border-l-yellow-500">
          <div className="wp-card-body">
            <h4 className="font-medium text-gray-900 mb-3">빠른 액션</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">모든 사용자 승인</p>
                  <p className="text-sm text-green-600">현재 페이지의 모든 사용자를 승인합니다</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('현재 페이지의 모든 사용자를 승인하시겠습니까?')) {
                      handleBulkAction({
                        action: 'approve',
                        userIds: filteredUsers.map(u => u.id)
                      })
                    }
                  }}
                  className="wp-button bg-green-600 text-white hover:bg-green-700"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  전체 승인
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-800">의심스러운 가입 신고</p>
                  <p className="text-sm text-red-600">스팸이나 가짜 계정을 신고합니다</p>
                </div>
                <button
                  onClick={() => alert('신고 기능은 개발 중입니다.')}
                  className="wp-button bg-red-600 text-white hover:bg-red-700"
                >
                  <UserX className="w-4 h-4 mr-1" />
                  신고하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 페이지네이션 */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            전체 <span className="font-medium">{pagination.totalItems}</span>명 중{' '}
            <span className="font-medium">
              {((pagination.current - 1) * pageSize) + 1}-{Math.min(pagination.current * pageSize, pagination.totalItems)}
            </span>명 표시
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="wp-button-secondary"
            >
              이전
            </button>
            
            {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
              const page = i + Math.max(1, pagination.current - 2)
              if (page > pagination.total) return null
              
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={page === pagination.current ? 'wp-button-primary' : 'wp-button-secondary'}
                >
                  {page}
                </button>
              )
            })}
            
            <button
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={pagination.current === pagination.total}
              className="wp-button-secondary"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PendingApproval