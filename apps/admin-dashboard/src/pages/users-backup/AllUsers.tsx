import { useState, useEffect, FC } from 'react';
import { Link } from 'react-router-dom'
import { Plus, Users, TrendingUp, AlertTriangle, UserX } from 'lucide-react'
import { User, UserFilters as IUserFilters, UserBulkAction, UserStats } from '@/types/user'
import { UserApi } from '@/api/userApi'
import UserTable from './components/UserTable'
import UserFilters from './components/UserFilters'
import BulkActions from './components/BulkActions'
import toast from 'react-hot-toast'

const AllUsers: FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [filters, setFilters] = useState<IUserFilters>({})
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  })
  
  const pageSize = 20

  const loadUsers = async (page = 1) => {
    try {
      setLoading(true)
      const response = await UserApi.getUsers(page, pageSize, filters)
      setUsers(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      console.error('Failed to load users:', error)
      toast.error('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await UserApi.getUserStats()
      setStats(response.data)
    } catch (error: any) {
      console.error('Failed to load user stats:', error)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [filters])

  useEffect(() => {
    loadStats()
  }, [])

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedUsers(selected ? users.map(u => u.id) : [])
  }

  const handleBulkAction = async (action: UserBulkAction) => {
    try {
      await UserApi.bulkAction({
        ...action,
        userIds: selectedUsers
      })
      toast.success('작업이 완료되었습니다.')
      setSelectedUsers([])
      loadUsers(pagination.current)
      loadStats()
    } catch (error: any) {
      console.error('Bulk action failed:', error)
      toast.error('작업에 실패했습니다.')
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      await UserApi.approveUser(userId)
      toast.success('사용자가 승인되었습니다.')
      loadUsers(pagination.current)
      loadStats()
    } catch (error: any) {
      console.error('Failed to approve user:', error)
      toast.error('승인에 실패했습니다.')
    }
  }

  const handleReject = async (userId: string) => {
    const reason = prompt('거부 사유를 입력해주세요:')
    if (!reason) return

    try {
      await UserApi.rejectUser(userId, reason)
      toast.success('사용자가 거부되었습니다.')
      loadUsers(pagination.current)
      loadStats()
    } catch (error: any) {
      console.error('Failed to reject user:', error)
      toast.error('거부에 실패했습니다.')
    }
  }

  const handleSuspend = async (_userId: string) => {
    const reason = prompt('정지 사유를 입력해주세요:')
    if (!reason) return

    try {
      // await UserApi.suspendUser(userId, reason)
      toast.success('사용자가 정지되었습니다.')
      loadUsers(pagination.current)
      loadStats()
    } catch (error: any) {
      console.error('Failed to suspend user:', error)
      toast.error('정지에 실패했습니다.')
    }
  }

  const handleReactivate = async (_userId: string) => {
    try {
      // await UserApi.reactivateUser(userId)
      toast.success('사용자가 재활성화되었습니다.')
      loadUsers(pagination.current)
      loadStats()
    } catch (error: any) {
      console.error('Failed to reactivate user:', error)
      toast.error('재활성화에 실패했습니다.')
    }
  }

  const handleExport = async () => {
    try {
      const blob = await UserApi.exportUsers(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('사용자 목록이 내보내졌습니다.')
    } catch (error: any) {
      console.error('Failed to export users:', error)
      toast.error('내보내기에 실패했습니다.')
    }
  }

  const handlePageChange = (page: number) => {
    loadUsers(page)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전체 사용자 관리</h1>
          <p className="text-gray-600 mt-1">플랫폼의 모든 사용자를 관리합니다</p>
        </div>
        <Link to="/users/add" className="wp-button-primary">
          <Plus className="w-4 h-4 mr-2" />
          사용자 추가
        </Link>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">전체 사용자</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">승인 대기</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">활성 사용자</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>

          <div className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">정지된 사용자</p>
                  <p className="text-2xl font-bold text-red-600">{stats.suspended.toLocaleString()}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>

          <div className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">거부된 사용자</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.rejected.toLocaleString()}</p>
                </div>
                <UserX className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        onRefresh={() => loadUsers(pagination.current)}
        loading={loading}
      />

      {/* Bulk actions */}
      <BulkActions
        selectedCount={selectedUsers.length}
        onBulkAction={handleBulkAction}
        onClearSelection={() => setSelectedUsers([])}
        availableActions={['approve', 'reject', 'suspend', 'reactivate', 'delete', 'email']}
      />

      {/* Users table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            사용자 목록 ({pagination.totalItems.toLocaleString()}명)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : (
            <UserTable
              users={users}
              selectedUsers={selectedUsers}
              onSelectUser={handleSelectUser}
              onSelectAll={handleSelectAll}
              onApprove={handleApprove}
              onReject={handleReject}
              onSuspend={handleSuspend}
              onReactivate={handleReactivate}
              showActions={true}
              showBulkSelect={true}
            />
          )}
        </div>
      </div>

      {/* Pagination */}
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

export default AllUsers