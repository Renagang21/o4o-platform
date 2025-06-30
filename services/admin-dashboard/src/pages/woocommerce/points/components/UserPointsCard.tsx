import React from 'react'
import { 
  Star,
  TrendingUp,
  Clock,
  Gift,
  Crown,
  Award,
  Medal,
  Zap,
  User
} from 'lucide-react'
import { UserPoints } from '@/types/ecommerce'

interface UserPointsCardProps {
  user: UserPoints
  rank?: number
  compact?: boolean
  showDetails?: boolean
  onClick?: () => void
  className?: string
}

const UserPointsCard: React.FC<UserPointsCardProps> = ({
  user,
  rank,
  compact = false,
  showDetails = false,
  onClick,
  className = ''
}) => {
  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('ko-KR').format(points) + 'P'
  }

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTierInfo = (tier: string) => {
    const tiers = {
      bronze: { 
        color: 'bg-orange-100 text-orange-800 border-orange-200', 
        icon: Medal, 
        label: '브론즈',
        iconColor: 'text-orange-600'
      },
      silver: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: Award, 
        label: '실버',
        iconColor: 'text-gray-600'
      },
      gold: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Star, 
        label: '골드',
        iconColor: 'text-yellow-600'
      },
      platinum: { 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        icon: Crown, 
        label: '플래티넘',
        iconColor: 'text-purple-600'
      }
    }
    return tiers[tier] || tiers.bronze
  }

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (position === 2) return <Award className="w-5 h-5 text-gray-400" />
    if (position === 3) return <Medal className="w-5 h-5 text-orange-500" />
    return <Star className="w-5 h-5 text-blue-500" />
  }

  const getRankBadge = (position: number) => {
    if (position <= 3) {
      const colors = {
        1: 'bg-yellow-500 text-white',
        2: 'bg-gray-400 text-white',
        3: 'bg-orange-500 text-white'
      }
      return colors[position]
    }
    return 'bg-blue-500 text-white'
  }

  const getProgressPercentage = () => {
    // Calculate tier progress (0-100%)
    return Math.min(user.tierProgress || 0, 100)
  }

  const tierInfo = getTierInfo(user.tier)
  const TierIcon = tierInfo.icon

  if (compact) {
    return (
      <div 
        className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {rank && (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadge(rank)}`}>
              {rank}
            </div>
          )}
          
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          
          <div>
            <div className="font-medium text-gray-900">{user.userId}</div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${tierInfo.color}`}>
                {tierInfo.label}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-bold text-lg text-gray-900">
            {formatPoints(user.currentBalance)}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(user.lastActivity)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`wp-card ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow duration-200 ${className}`}
      onClick={onClick}
    >
      <div className="wp-card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {rank && (
              <div className="flex items-center gap-2">
                {getRankIcon(rank)}
                <span className="text-lg font-bold text-gray-700">#{rank}</span>
              </div>
            )}
            
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900">{user.userId}</h3>
              <div className="flex items-center gap-2 mt-1">
                <TierIcon className={`w-4 h-4 ${tierInfo.iconColor}`} />
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatPoints(user.currentBalance)}
            </div>
            <div className="text-sm text-gray-500">현재 보유</div>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">등급 진행도</span>
            <span className="font-medium">{getProgressPercentage().toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                user.tier === 'bronze' ? 'bg-orange-500' :
                user.tier === 'silver' ? 'bg-gray-500' :
                user.tier === 'gold' ? 'bg-yellow-500' : 'bg-purple-500'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {showDetails && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">총 적립</span>
                <div className="font-medium text-green-600">
                  {formatPoints(user.totalEarned)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">총 사용</span>
                <div className="font-medium text-red-600">
                  {formatPoints(user.totalSpent)}
                </div>
              </div>
            </div>

            {user.pendingPoints > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    대기 중인 포인트: {formatPoints(user.pendingPoints)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">마지막 활동</span>
              <span className="text-gray-900">{formatDate(user.lastActivity)}</span>
            </div>
          </div>
        )}

        {!showDetails && (
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium text-green-600">
                {formatPoints(user.totalEarned)}
              </div>
              <div className="text-gray-500">총 적립</div>
            </div>
            <div>
              <div className="font-medium text-red-600">
                {formatPoints(user.totalSpent)}
              </div>
              <div className="text-gray-500">총 사용</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {user.pendingPoints > 0 ? formatPoints(user.pendingPoints) : '-'}
              </div>
              <div className="text-gray-500">대기중</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserPointsCard