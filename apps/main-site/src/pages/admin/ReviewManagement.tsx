import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useReviewStore } from '../../stores/reviewStore';
import { useAuthStore } from '../../stores/authStore';
import { Review, ReviewStatus } from '../../types/review';

export default function ReviewManagement() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    reviews,
    reviewStats,
    reviewReports,
    filters,
    pagination,
    isLoading,
    error,
    fetchReviews,
    fetchReviewStats,
    fetchReviewReports,
    publishReview,
    hideReview,
    deleteReview,
    resolveReport,
    setFilters,
    clearError,
  } = useReviewStore();

  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      navigate('/login');
      return;
    }

    fetchReviewStats();
    fetchReviewReports();
    fetchReviews({ status: statusFilter || undefined });
  }, [user, statusFilter]);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = !searchTerm || 
      review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleApprove = async (reviewId: string) => {
    try {
      await publishReview(reviewId);
      toast.success('��  �xȵ��.');
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    } catch (error) {
      toast.error('�x ��� �(����.');
    }
  };

  const handleHide = async (reviewId: string) => {
    const reason = prompt('(@ �� � | �%t�8�:');
    if (!reason) return;

    try {
      await hideReview(reviewId);
      toast.success('��  (@ ��ȵ��.');
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    } catch (error) {
      toast.error('(@ ��� �(����.');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('� t ��| �Xܠ��L? t ��@ ̴  Ƶ��.')) {
      return;
    }

    try {
      await deleteReview(reviewId);
      toast.success('��  �ȵ��.');
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    } catch (error) {
      toast.error('�� �(����.');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedReviews.length === 0) {
      toast.error('�x` ��|  �X8�.');
      return;
    }

    try {
      await Promise.all(
        selectedReviews.map(id => publishReview(id))
      );
      toast.success(`${selectedReviews.length} ��  �xȵ��.`);
      setSelectedReviews([]);
    } catch (error) {
      toast.error('| �x� �(����.');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await resolveReport(reportId, user!.id);
      toast.success('��  ��ȵ��.');
    } catch (error) {
      toast.error('�� ��� �(����.');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(filteredReviews.map(r => r.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleReviewSelect = (reviewId: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews(prev => [...prev, reviewId]);
    } else {
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      hidden: 'bg-gray-100 text-gray-800',
      reported: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: '�x  0',
      published: '�� ',
      hidden: '(@',
      reported: '��(',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
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
    <div className="min-h-screen bg-gray-100">
      {/* �T */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                 ���\ �D 0
              </button>
              <h1 className="text-3xl font-bold text-gray-900">��  �</h1>
              <p className="mt-2 text-sm text-gray-600">� ��| ��X�  �X8�</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowReports(!showReports)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  showReports ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                } hover:bg-opacity-80`}
              >
                �� �] ({reviewReports.filter(r => r.status === 'pending').length})
              </button>
              <span className="text-sm text-gray-500"> ��: {user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* �� t� */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">=�</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate"> ��</dt>
                    <dd className="text-lg font-medium text-gray-900">{reviewStats.totalReviews}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">�</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">�x  0</dt>
                    <dd className="text-lg font-medium text-gray-900">{reviewStats.pendingReviews}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">=�</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">�� ��</dt>
                    <dd className="text-lg font-medium text-gray-900">{reviewStats.reportedReviews}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">�� �</dt>
                    <dd className="text-lg font-medium text-gray-900">{reviewStats.averageRating.toFixed(1)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* �� �] */}
        {showReports && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">�� ��</h3>
            </div>
            <div className="p-6">
              {reviewReports.length === 0 ? (
                <p className="text-gray-500 text-center py-4">�� ��  Ƶ��.</p>
              ) : (
                <div className="space-y-4">
                  {reviewReports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">���: {report.reporterName}</span>
                            <span className="text-sm text-gray-500">"</span>
                            <span className="text-sm text-gray-500">{formatDate(report.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700">� : {report.reason}</p>
                          <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {report.status === 'pending' ? '��  0' : '�� D�'}
                          </span>
                          {report.status === 'pending' && (
                            <button
                              onClick={() => handleResolveReport(report.id)}
                              className="text-sm text-blue-600 hover:text-blue-500"
                            >
                              �� D�
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* D0  �� */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                �� ��
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">� ��</option>
                <option value="pending">�x  0</option>
                <option value="published">�� </option>
                <option value="hidden">(@</option>
                <option value="reported">��(</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ��
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="�� �, ��, ���, �1�\ ��"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('pending');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                D0 0T
              </button>
            </div>
          </div>
        </div>

        {/* | �� */}
        {selectedReviews.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">
                {selectedReviews.length} ��  �(
              </span>
              <div className="space-x-2">
                <button
                  onClick={handleBulkApprove}
                  className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700"
                >
                  | �x
                </button>
                <button
                  onClick={() => setSelectedReviews([])}
                  className="bg-gray-600 text-white px-4 py-2 text-sm rounded hover:bg-gray-700"
                >
                   � t
                </button>
              </div>
            </div>
          </div>
        )}

        {/* �� �] */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">��| ��$� ...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">t� ptX ��  Ƶ��</h3>
              <p className="mt-1 text-sm text-gray-500">�x D0 ptD ��t�8�.</p>
            </div>
          ) : (
            <>
              {/* Lt �T */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedReviews.length === filteredReviews.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    �  � ({selectedReviews.length}/{filteredReviews.length})
                  </span>
                </div>
              </div>

              {/* �� �] */}
              <div className="divide-y divide-gray-200">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      {/* �l� */}
                      <input
                        type="checkbox"
                        checked={selectedReviews.includes(review.id)}
                        onChange={(e) => handleReviewSelect(review.id, e.target.checked)}
                        className="mt-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />

                      {/* �� �� */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="pr-6">
                            {/* �� �T */}
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="flex items-center">
                                {renderStars(review.rating)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{review.userName}</span>
                              {review.isPurchaseVerified && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  l� Ux
                                </span>
                              )}
                              {review.userType === 'retailer' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  �L|�
                                </span>
                              )}
                            </div>

                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              {review.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                              ��: {review.productName}
                            </p>
                            <div className="text-sm text-gray-600 mb-3">
                              <span>�1|: {formatDate(review.createdAt)}</span>
                              <span className="mx-2">"</span>
                              <span>��(: {review.helpfulCount}�</span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {review.content}
                            </p>
                          </div>

                          <div className="text-right">
                            {getStatusBadge(review.status)}
                          </div>
                        </div>

                        {/* �� t�� */}
                        {review.images && review.images.length > 0 && (
                          <div className="mt-3 flex space-x-2">
                            {review.images.slice(0, 3).map((image) => (
                              <img
                                key={image.id}
                                src={image.url}
                                alt={image.alt || '�� t��'}
                                className="w-16 h-16 object-cover rounded"
                              />
                            ))}
                            {review.images.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">+{review.images.length - 3}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* aX ��� */}
                        <div className="mt-4 flex items-center space-x-3">
                          <button
                            onClick={() => setViewingReview(review)}
                            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                          >
                            �8 �0
                          </button>

                          {review.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(review.id)}
                                className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                              >
                                 �x
                              </button>
                              <button
                                onClick={() => handleHide(review.id)}
                                className="bg-yellow-600 text-white px-3 py-1 text-sm rounded hover:bg-yellow-700"
                              >
                                =A (@
                              </button>
                            </>
                          )}

                          {review.status === 'published' && (
                            <button
                              onClick={() => handleHide(review.id)}
                              className="bg-yellow-600 text-white px-3 py-1 text-sm rounded hover:bg-yellow-700"
                            >
                              =A (@
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(review.id)}
                            className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
                          >
                            =� �
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* �� T�� */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  �0
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* �� �8 �� */}
      {viewingReview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">�� �8 �</h3>
                <button
                  onClick={() => setViewingReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* �� �T */}
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center">
                      {renderStars(viewingReview.rating)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{viewingReview.userName}</span>
                    {getStatusBadge(viewingReview.status)}
                  </div>
                  <h4 className="text-xl font-medium text-gray-900">{viewingReview.title}</h4>
                  <p className="text-sm text-gray-500">��: {viewingReview.productName}</p>
                </div>

                {/* �� �� */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">�� ��</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingReview.content}</p>
                </div>

                {/* �� t�� */}
                {viewingReview.images && viewingReview.images.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">�� t��</label>
                    <div className="grid grid-cols-4 gap-2">
                      {viewingReview.images.map((image) => (
                        <img
                          key={image.id}
                          src={image.url}
                          alt={image.alt || '�� t��'}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* aX �� */}
                {viewingReview.status === 'pending' && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        handleHide(viewingReview.id);
                        setViewingReview(null);
                      }}
                      className="bg-yellow-600 text-white px-4 py-2 text-sm rounded hover:bg-yellow-700"
                    >
                      (@
                    </button>
                    <button
                      onClick={() => {
                        handleApprove(viewingReview.id);
                        setViewingReview(null);
                      }}
                      className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700"
                    >
                      �x
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}