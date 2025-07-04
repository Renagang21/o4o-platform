import React from 'react'
import { 
  TrendingUp,
  TrendingDown,
  Clock,
  Gift,
  User,
  FileText,
  Eye
} from 'lucide-react'
import { PointTransaction } from '@/types/ecommerce'

interface TransactionTableProps {
  transactions: PointTransaction[]
  loading?: boolean
  onTransactionClick?: (transaction: PointTransaction) => void
  compact?: boolean
  className?: string
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading = false,
  onTransactionClick,
  compact = false,
  className = ''
}) => {
  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('ko-KR').format(points) + 'P'
  }

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionTypeInfo = (type: string) => {
    const types = {
      earn: { 
        label: '적립', 
        color: 'text-green-600', 
        bgColor: 'bg-green-100', 
        icon: TrendingUp,
        sign: '+'
      },
      spend: { 
        label: '사용', 
        color: 'text-red-600', 
        bgColor: 'bg-red-100', 
        icon: TrendingDown,
        sign: '-'
      },
      expire: { 
        label: '만료', 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100', 
        icon: Clock,
        sign: '-'
      },
      admin_adjust: { 
        label: '조정', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100', 
        icon: Gift,
        sign: '±'
      }
    }
    return types[type] || types.earn
  }

  const getReasonLabel = (reason: string) => {
    const reasons = {
      purchase: '구매',
      review: '리뷰',
      referral: '추천',
      birthday: '생일',
      admin: '관리자',
      usage: '사용'
    }
    return reasons[reason] || reason
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    const statusLabels = {
      pending: '대기',
      confirmed: '확정',
      cancelled: '취소'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || statusColors.pending}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className={`wp-card ${className}`}>
        <div className="wp-card-body">
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner" />
            <span className="ml-2 text-gray-600">거래 내역을 불러오는 중...</span>
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p>거래 내역이 없습니다</p>
          </div>
        ) : (
          transactions.map((transaction) => {
            const typeInfo = getTransactionTypeInfo(transaction.type)
            const IconComponent = typeInfo.icon
            
            return (
              <div 
                key={transaction.id}
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${onTransactionClick ? 'cursor-pointer' : ''}`}
                onClick={() => onTransactionClick?.(transaction)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeInfo.bgColor}`}>
                    <IconComponent className={`w-4 h-4 ${typeInfo.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{typeInfo.label}</div>
                    <div className="text-sm text-gray-500">{transaction.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${typeInfo.color}`}>
                    {typeInfo.sign}{formatPoints(transaction.points)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(transaction.createdAt)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div className={`wp-card ${className}`}>
      <div className="wp-card-body p-0">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">거래 내역이 없습니다</p>
            <p className="text-sm">포인트 거래가 발생하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="wp-table">
              <thead>
                <tr>
                  <th>유형</th>
                  <th>사용자</th>
                  <th>포인트</th>
                  <th>사유</th>
                  <th>설명</th>
                  <th>주문번호</th>
                  <th>상태</th>
                  <th>일시</th>
                  <th>만료일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const typeInfo = getTransactionTypeInfo(transaction.type)
                  const IconComponent = typeInfo.icon
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${typeInfo.bgColor}`}>
                            <IconComponent className={`w-3 h-3 ${typeInfo.color}`} />
                          </div>
                          <span className={`font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-600" />
                          </div>
                          <span className="font-mono text-sm">{transaction.userId}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`font-bold ${typeInfo.color}`}>
                          {typeInfo.sign}{formatPoints(transaction.points)}
                        </span>
                      </td>
                      <td>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          {getReasonLabel(transaction.reason)}
                        </span>
                      </td>
                      <td>
                        <div className="max-w-48 truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                      <td>
                        {transaction.orderId ? (
                          <span className="font-mono text-sm text-blue-600">
                            {transaction.orderId}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td>
                        <div className="text-sm">
                          {formatDate(transaction.createdAt)}
                        </div>
                      </td>
                      <td>
                        {transaction.expiresAt ? (
                          <div className="text-sm">
                            {formatDate(transaction.expiresAt)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        {onTransactionClick && (
                          <button
                            onClick={() => onTransactionClick(transaction)}
                            className="text-blue-600 hover:text-blue-700"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionTable