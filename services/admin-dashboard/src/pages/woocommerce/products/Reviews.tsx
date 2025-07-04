import React, { useState, useEffect } from 'react'
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Filter, Search, Eye, Trash2 } from 'lucide-react'
import { Product } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

interface Review {
  id: string
  productId: string
  productName: string
  customerId: string
  customerName: string
  customerEmail: string
  rating: number
  title: string
  content: string
  verified: boolean
  helpful: number
  notHelpful: number
  status: 'pending' | 'approved' | 'spam' | 'trash'
  createdAt: string
  updatedAt: string
}

const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterRating, setFilterRating] = useState<string>('')
  const [selectedReviews, setSelectedReviews] = useState<string[]>([])

  // Mock data for demonstration
  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      const mockReviews: Review[] = [
        {
          id: '1',
          productId: 'p1',
          productName: '프리미엄 비타민 D3',
          customerId: 'c1',
          customerName: '김영희',
          customerEmail: 'kim@example.com',
          rating: 5,
          title: '정말 좋은 제품입니다!',
          content: '주문한 다음날 바로 받았고 포장도 깔끔했습니다. 제품 품질도 기대했던 것 이상이네요. 재주문 의사 있습니다.',
          verified: true,
          helpful: 12,
          notHelpful: 1,
          status: 'approved',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          productId: 'p2',
          productName: '오메가3 피쉬오일',
          customerId: 'c2',
          customerName: '이철수',
          customerEmail: 'lee@example.com',
          rating: 4,
          title: '만족스러운 구매',
          content: '가격 대비 품질이 좋습니다. 다만 배송이 조금 늦었던 것이 아쉽네요.',
          verified: true,
          helpful: 8,
          notHelpful: 0,
          status: 'approved',
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-14T14:20:00Z'
        },
        {
          id: '3',
          productId: 'p1',
          productName: '프리미엄 비타민 D3',
          customerId: 'c3',
          customerName: '박민수',
          customerEmail: 'park@example.com',
          rating: 2,
          title: '기대보다 아쉬운 제품',
          content: '캡슐이 너무 크고 냄새도 좀 나네요. 효과는 아직 잘 모르겠습니다.',
          verified: false,
          helpful: 3,
          notHelpful: 5,
          status: 'pending',
          createdAt: '2024-01-13T09:15:00Z',
          updatedAt: '2024-01-13T09:15:00Z'
        }
      ]
      setReviews(mockReviews)
    } catch (error) {
      console.error('Failed to load reviews:', error)
      toast.error('리뷰 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (reviewId: string, status: string) => {
    try {
      // await ReviewApi.updateReviewStatus(reviewId, status)
      setReviews(prev => prev.map(review => 
        review.id === reviewId ? { ...review, status: status as any } : review
      ))
      toast.success('리뷰 상태가 변경되었습니다.')
    } catch (error) {
      console.error('Failed to update review status:', error)
      toast.error('리뷰 상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm('이 리뷰를 삭제하시겠습니까?')) return

    try {
      // await ReviewApi.deleteReview(reviewId)
      setReviews(prev => prev.filter(review => review.id !== reviewId))
      toast.success('리뷰가 삭제되었습니다.')
    } catch (error) {
      console.error('Failed to delete review:', error)
      toast.error('리뷰 삭제에 실패했습니다.')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedReviews.length === 0) {
      toast.error('선택된 리뷰가 없습니다.')
      return
    }

    try {
      // await ReviewApi.bulkAction(selectedReviews, action)
      if (action === 'delete') {
        setReviews(prev => prev.filter(review => !selectedReviews.includes(review.id)))
      } else {
        setReviews(prev => prev.map(review => 
          selectedReviews.includes(review.id) ? { ...review, status: action as any } : review
        ))
      }
      setSelectedReviews([])
      toast.success('일괄 작업이 완료되었습니다.')
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error('일괄 작업에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      spam: 'bg-red-100 text-red-800',
      trash: 'bg-gray-100 text-gray-800'
    }
    
    const labels = {
      pending: '대기중',
      approved: '승인됨',
      spam: '스팸',
      trash: '휴지통'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !filterStatus || review.status === filterStatus
    const matchesRating = !filterRating || review.rating.toString() === filterRating
    
    return matchesSearch && matchesStatus && matchesRating
  })

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    spam: reviews.filter(r => r.status === 'spam').length,
    averageRating: reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 리뷰</h1>
          <p className="text-gray-600 mt-1">고객이 작성한 상품 리뷰를 관리합니다</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 리뷰</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">승인 대기</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">승인됨</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">스팸</p>
                <p className="text-2xl font-bold text-red-600">{stats.spam}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 평점</p>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                </div>
              </div>
              <Star className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="상품명, 고객명, 리뷰 내용으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="pending">승인 대기</option>
                <option value="approved">승인됨</option>
                <option value="spam">스팸</option>
                <option value="trash">휴지통</option>
              </select>

              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 평점</option>
                <option value="5">5점</option>
                <option value="4">4점</option>
                <option value="3">3점</option>
                <option value="2">2점</option>
                <option value="1">1점</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('')
                  setFilterRating('')
                }}
                className="wp-button-secondary"
              >
                <Filter className="w-4 h-4" />
                초기화
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedReviews.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedReviews.length}개 리뷰 선택됨
                </span>
                
                <div className="flex items-center gap-2">
                  <select 
                    className="wp-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">일괄 작업 선택</option>
                    <option value="approved">승인하기</option>
                    <option value="pending">대기로 변경</option>
                    <option value="spam">스팸으로 표시</option>
                    <option value="delete">삭제하기</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setSelectedReviews([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            리뷰 목록 ({filteredReviews.length}개)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">리뷰가 없습니다</p>
              <p className="text-sm">고객이 상품 리뷰를 작성하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredReviews.map((review) => (
                <div key={review.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedReviews.includes(review.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReviews(prev => [...prev, review.id])
                        } else {
                          setSelectedReviews(prev => prev.filter(id => id !== review.id))
                        }
                      }}
                      className="mt-1 rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />

                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-900 font-medium">{review.customerName}</span>
                            {review.verified && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                구매확인
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900">{review.title}</h4>
                          <p className="text-sm text-gray-600">
                            {review.productName} • {formatDate(review.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(review.status)}
                          <select
                            value={review.status}
                            onChange={(e) => handleStatusChange(review.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="pending">대기중</option>
                            <option value="approved">승인</option>
                            <option value="spam">스팸</option>
                            <option value="trash">휴지통</option>
                          </select>
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="text-red-600 hover:text-red-700"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed">{review.content}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>도움됨 {review.helpful}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsDown className="w-4 h-4" />
                            <span>도움안됨 {review.notHelpful}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{review.customerEmail}</span>
                          <span>•</span>
                          <span>ID: {review.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reviews