import { FC } from 'react'
import { Link } from 'react-router-dom'
import { User, UserRole, UserStatus, ROLE_LABELS, STATUS_LABELS } from '@/types/user'
import { Eye, Edit, UserCheck, UserX, UserMinus, Trash2 } from 'lucide-react'
// import { clsx } from 'clsx' // Removed as not used

interface UserTableProps {
  users: User[]
  selectedUsers: string[]
  onSelectUser: (userId: string) => void
  onSelectAll: (selected: boolean) => void
  onApprove?: (userId: string) => void
  onReject?: (userId: string) => void
  onSuspend?: (userId: string) => void
  onReactivate?: (userId: string) => void
  onDelete?: (userId: string) => void
  showActions?: boolean
  showBulkSelect?: boolean
}

const UserTable: FC<UserTableProps> = ({
  users,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onDelete,
  showActions = true,
  showBulkSelect = true
}) => {
  const getRoleBadge = (role: UserRole) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      business: 'bg-blue-100 text-blue-800',
      affiliate: 'bg-purple-100 text-purple-800',
      customer: 'bg-green-100 text-green-800'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role]}`}>
        {ROLE_LABELS[role]}
      </span>
    )
  }

  const getStatusBadge = (status: UserStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {STATUS_LABELS[status]}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const allSelected = users.length > 0 && selectedUsers.length === users.length
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length

  return (
    <div className="overflow-x-auto">
      <table className="wp-table">
        <thead>
          <tr>
            {showBulkSelect && (
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected
                  }}
                  onChange={(e: any) => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
              </th>
            )}
            <th>사용자 정보</th>
            <th>역할</th>
            <th>상태</th>
            <th>사업체 정보</th>
            <th>가입일</th>
            <th>마지막 로그인</th>
            {showActions && <th>작업</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              {showBulkSelect && (
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => onSelectUser(user.id)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                </td>
              )}
              <td>
                <div className="flex items-center gap-3">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.phone && (
                      <div className="text-sm text-gray-500">{user.phone}</div>
                    )}
                    {!user.isEmailVerified && (
                      <span className="text-xs text-orange-600">이메일 미인증</span>
                    )}
                  </div>
                </div>
              </td>
              <td>{getRoleBadge(user.role)}</td>
              <td>{getStatusBadge(user.status)}</td>
              <td>
                {user.businessInfo ? (
                  <div className="text-sm">
                    <div className="font-medium">{user.businessInfo.businessName}</div>
                    <div className="text-gray-500">{user.businessInfo.businessType}</div>
                    {user.businessInfo.businessNumber && (
                      <div className="text-xs text-gray-400">
                        사업자번호: {user.businessInfo.businessNumber}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="text-sm text-gray-500">
                {formatDate(user.createdAt)}
              </td>
              <td className="text-sm text-gray-500">
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : '없음'}
              </td>
              {showActions && (
                <td>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-700"
                      title="상세보기"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    
                    <Link
                      to={`/users/${user.id}/edit`}
                      className="text-green-600 hover:text-green-700"
                      title="편집"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>

                    {user.status === 'pending' && onApprove && (
                      <button
                        onClick={() => onApprove(user.id)}
                        className="text-green-600 hover:text-green-700"
                        title="승인"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}

                    {user.status === 'pending' && onReject && (
                      <button
                        onClick={() => onReject(user.id)}
                        className="text-red-600 hover:text-red-700"
                        title="거부"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}

                    {user.status === 'approved' && onSuspend && (
                      <button
                        onClick={() => onSuspend(user.id)}
                        className="text-orange-600 hover:text-orange-700"
                        title="정지"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}

                    {user.status === 'suspended' && onReactivate && (
                      <button
                        onClick={() => onReactivate(user.id)}
                        className="text-blue-600 hover:text-blue-700"
                        title="재활성화"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => onDelete(user.id)}
                        className="text-red-600 hover:text-red-700"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>사용자가 없습니다.</p>
        </div>
      )}
    </div>
  )
}

export default UserTable