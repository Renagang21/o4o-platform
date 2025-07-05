import React, { useState, useEffect } from 'react';
import { Review, ReviewSummary } from '../types/review';
import { useReviewStore } from '../stores/reviewStore';
import { useAuthStore } from '../stores/authStore';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user } = useAuthStore();
  const {
    reviews,
    reviewSummaries,
    filters,
    pagination,
    isLoading,
    fetchReviewsByProduct,
    fetchReviewSummary,
    toggleHelpful,
    setFilters,
    reportReview,
  } = useReviewStore();

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string>('');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    fetchReviewsByProduct(productId);
    fetchReviewSummary(productId);
  }, [productId]);

  const summary = reviewSummaries.find(s => s.productId === productId);

  const handleSortChange = (sortBy: string) => {
    setFilters({ sortBy: sortBy as any });
    fetchReviewsByProduct(productId);
  };

  const handleFilterChange = (rating?: number, type?: string) => {
    setFilters({ 
      rating: rating as any, 
      type: type as any,
      isPurchaseVerified: type === 'verified' ? true : undefined 
    });
    fetchReviewsByProduct(productId);
  };

  const handleHelpfulClick = (reviewId: string) => {
    if (user) {
      toggleHelpful(reviewId, user.id);
    }
  };

  const handleReportClick = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && reportingReviewId && reportReason) {
      await reportReview(reportingReviewId, user.id, reportReason, reportDescription);
      setShowReportModal(false);
      setReportingReviewId('');
      setReportReason('');
      setReportDescription('');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const stars = [];
    const starSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`${starSize} ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return stars;
  };

  return (
    <div className="bg-white">
      {/* ¬ð ”} */}
      {summary && (
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">à ¬ð</h2>
            <div className="text-right">
              <div className="flex items-center">
                <div className="flex items-center mr-2">
                  {renderStars(Math.round(summary.averageRating), 'lg')}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {summary.averageRating.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-gray-500">{summary.totalCount} ¬ð</p>
            </div>
          </div>

          {/* É „ì */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">É „ì</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center">
                    <span className="text-sm text-gray-600 w-3">{rating}</span>
                    <svg className="w-4 h-4 text-yellow-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div className="flex-1 mx-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{
                            width: `${summary.totalCount > 0 ? (summary.ratingDistribution[rating as keyof typeof summary.ratingDistribution] / summary.totalCount) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">
                      {summary.ratingDistribution[rating as keyof typeof summary.ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">”œ(</h3>
              <div className="flex items-center">
                <div className="text-3xl font-bold text-green-600">{summary.recommendationRate}%</div>
                <div className="ml-2 text-sm text-gray-500">àt ”œ</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D0  , */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4">
          {/* É D0 */}
          <select
            value={filters.rating || ''}
            onChange={(e) => handleFilterChange(e.target.value ? parseInt(e.target.value) : undefined)}
            className="border-gray-300 rounded-md text-sm"
          >
            <option value="">¨à É</option>
            <option value="5">PPPPP 5</option>
            <option value="4">PPPP 4</option>
            <option value="3">PPP 3</option>
            <option value="2">PP 2</option>
            <option value="1">P 1</option>
          </select>

          {/* lä Ux D0 */}
          <select
            value={filters.isPurchaseVerified === true ? 'verified' : filters.isPurchaseVerified === false ? 'unverified' : ''}
            onChange={(e) => handleFilterChange(undefined, e.target.value)}
            className="border-gray-300 rounded-md text-sm"
          >
            <option value="">´ ¬ð</option>
            <option value="verified">lä Ux ¬ð</option>
            <option value="unverified">´Ø ¬ð</option>
          </select>
        </div>

        {/* , */}
        <select
          value={filters.sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="border-gray-300 rounded-md text-sm"
        >
          <option value="newest">\à</option>
          <option value="oldest">$˜</option>
          <option value="rating_high">É ’@</option>
          <option value="rating_low">É ®@</option>
          <option value="helpful">ÄÀ(</option>
        </select>
      </div>

      {/* ¬ð ©] */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">DÁ ¬ð  ÆµÈä</h3>
          <p className="mt-1 text-sm text-gray-500">« ˆø ¬ð| ‘1tô8”!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6">
              {/* ¬ð äT */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{review.userName}</span>
                  {review.isPurchaseVerified && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      lä Ux
                    </span>
                  )}
                  {review.userType === 'retailer' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ¬L|ì
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </div>
              </div>

              {/* ¬ð © */}
              <h4 className="text-lg font-medium text-gray-900 mb-2">{review.title}</h4>

              {/* ¬ð ´© */}
              <p className="text-gray-700 mb-4">{review.content}</p>

              {/* ¬ð tøÀ */}
              {review.images && review.images.length > 0 && (
                <div className="flex space-x-2 mb-4">
                  {review.images.map((image) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={image.alt || '¬ð tøÀ'}
                      className="w-20 h-20 object-cover rounded cursor-pointer"
                      onClick={() => {
                        // tøÀ U  ¨ì l  ¥
                      }}
                    />
                  ))}
                </div>
              )}

              {/* ¬ð aX */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleHelpfulClick(review.id)}
                    className={`flex items-center space-x-1 text-sm ${
                      user && review.helpfulUserIds.includes(user.id)
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 6v4m-5 8h2.5A1.5 1.5 0 008 16.5v-5A1.5 1.5 0 006.5 10H4a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span>ÄÀ( ({review.helpfulCount})</span>
                  </button>
                </div>
                
                {user && user.id !== review.userId && (
                  <button
                    onClick={() => handleReportClick(review.id)}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    àà
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* àà ¨ì */}
      {showReportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <form onSubmit={handleReportSubmit}>
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">¬ð àà</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    àà ¬ 
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full border-gray-300 rounded-md"
                    required
                  >
                    <option value=""> ÝX8”</option>
                    <option value="spam">¤8</option>
                    <option value="inappropriate">€\ ´©</option>
                    <option value="fake">È ¬ð</option>
                    <option value="offensive">•$/D)</option>
                    <option value="other">0À</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Á8 $…
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="w-full border-gray-300 rounded-md"
                    rows={3}
                    placeholder="àà ¬ Ð  \ 8\ $…D …%tü8”"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    èŒ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    ààX0
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}