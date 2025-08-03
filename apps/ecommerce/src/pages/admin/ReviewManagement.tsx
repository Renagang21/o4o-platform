import { FormEvent, useState } from 'react';
import { ReviewStatus } from '@o4o/types';
import type { ReviewFilters } from '@o4o/types';
import { ReviewList } from '@/components/review';
import { Card, CardContent, CardHeader, CardTitle } from '@o4o/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@o4o/ui';
import { Alert, AlertDescription } from '@o4o/ui';
import { Badge } from '@o4o/ui';
import { Input } from '@o4o/ui';
import { Button } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import { AlertCircle, Search } from 'lucide-react';
import {
  useAdminReviews,
  useApproveReview,
  useRejectReview,
  useDeleteReview
} from '@/hooks/useReviews';
import { toast } from 'sonner';

export function ReviewManagement() {
  const [filters, setFilters] = useState<ReviewFilters>({
    status: ReviewStatus.PENDING,
    limit: 20,
    page: 1
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: reviewsData, isLoading } = useAdminReviews(filters);

  // Mutations
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  const deleteReview = useDeleteReview();

  const handleTabChange = (status: string) => {
    setFilters({
      ...filters,
      status: status as ReviewStatus,
      page: 1
    });
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setFilters({
      ...filters,
      search: searchQuery,
      page: 1
    });
  };

  const handleApprove = (reviewId: string) => {
    approveReview.mutate(reviewId);
  };

  const handleReject = (reviewId: string) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (reason !== null) {
      rejectReview.mutate({ id: reviewId, reason });
    }
  };


  const handleDelete = (reviewId: string) => {
    if (confirm('이 리뷰를 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteReview.mutate(reviewId);
    }
  };

  const stats = {
    pending: reviewsData?.total || 0,
    approved: 0,
    rejected: 0,
    hidden: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">리뷰 관리</h1>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="리뷰 검색..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button type="submit" size="icon">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">승인됨</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">거부됨</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">숨김</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.hidden}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Tabs */}
      <Tabs defaultValue={filters.status}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value={ReviewStatus.PENDING} onClick={() => handleTabChange(ReviewStatus.PENDING)}>
            대기 중
            {stats.pending > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value={ReviewStatus.APPROVED} onClick={() => handleTabChange(ReviewStatus.APPROVED)}>승인됨</TabsTrigger>
          <TabsTrigger value={ReviewStatus.REJECTED} onClick={() => handleTabChange(ReviewStatus.REJECTED)}>거부됨</TabsTrigger>
          <TabsTrigger value={ReviewStatus.HIDDEN} onClick={() => handleTabChange(ReviewStatus.HIDDEN)}>숨김</TabsTrigger>
        </TabsList>

        <TabsContent value={filters.status} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i: any) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                {reviewsData && reviewsData.reviews.length > 0 ? (
                  <ReviewList
                    reviews={reviewsData}
                    onEdit={() => {
                      // Admin can't edit user reviews
                      toast.error('관리자는 사용자 리뷰를 수정할 수 없습니다.');
                    }}
                    onDelete={handleDelete}
                  />
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {filters.status === ReviewStatus.PENDING
                        ? '검토 대기 중인 리뷰가 없습니다.'
                        : '리뷰가 없습니다.'}
                    </p>
                  </div>
                )}
              </CardContent>

              {/* Actions for Pending Reviews */}
              {filters.status === ReviewStatus.PENDING && reviewsData && reviewsData.reviews.length > 0 && (
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    {reviewsData.reviews.map((review: any) => (
                      <div key={review.id} className="flex gap-2 items-center p-2 border rounded">
                        <span className="text-sm">{review.title}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(review.id)}
                          disabled={approveReview.isPending}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(review.id)}
                          disabled={rejectReview.isPending}
                        >
                          거부
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Guidelines */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>리뷰 관리 가이드라인:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• 부적절한 언어나 욕설이 포함된 리뷰는 거부하세요.</li>
            <li>• 상품과 관련 없는 내용의 리뷰는 거부하세요.</li>
            <li>• 스팸이나 광고성 리뷰는 즉시 삭제하세요.</li>
            <li>• 거부 시 사용자에게 이유를 명확히 전달하세요.</li>
            <li>• 숨김 처리는 일시적으로 리뷰를 비공개하는 것입니다.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}