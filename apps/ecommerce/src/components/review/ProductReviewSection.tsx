import { useState } from 'react';
import { Product, CreateReviewDto, UpdateReviewDto } from '@o4o/types';
import type { ReviewFilters } from '@o4o/types';
import { ReviewStats } from './ReviewStats';
import { ReviewList } from './ReviewList';
import { ReviewForm } from './ReviewForm';
import { Button } from '@o4o/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@o4o/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@o4o/ui';
import { Alert, AlertDescription } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import { PenSquare, AlertCircle } from 'lucide-react';
import {
  useProductReviews,
  useProductReviewStats,
  useCanReviewProduct,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
  useMarkReviewHelpful,
  useReportReview
} from '@/hooks/useReviews';
import { useAuth } from '@o4o/auth-context';
import { toast } from 'sonner';
import { cn } from '@o4o/utils';

interface ProductReviewSectionProps {
  product: Product;
  className?: string;
}

export function ProductReviewSection({ product, className }: ProductReviewSectionProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReviewFilters>({
    sort: 'recent' as const,
    limit: 10,
    page: 1
  });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [reportingReview, setReportingReview] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  // Queries
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(product.id, filters);
  const { data: statsData, isLoading: statsLoading } = useProductReviewStats(product.id);
  const { data: canReviewData } = useCanReviewProduct(product.id);

  // Mutations
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const markHelpful = useMarkReviewHelpful();
  const reportReview = useReportReview();

  // Pagination
  const currentPage = filters.page || 1;
  const totalPages = reviewsData?.totalPages || 1;
  const hasMore = currentPage < totalPages;

  const handleLoadMore = () => {
    setFilters({
      ...filters,
      page: currentPage + 1
    });
  };

  const handleCreateReview = (data: CreateReviewDto) => {
    createReview.mutate(data, {
      onSuccess: () => {
        setShowReviewForm(false);
      }
    });
  };

  const handleUpdateReview = (data: UpdateReviewDto) => {
    if (!editingReview) return;
    
    updateReview.mutate(
      { id: editingReview, data },
      {
        onSuccess: () => {
          setEditingReview(null);
        }
      }
    );
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('리뷰를 삭제하시겠습니까?')) {
      deleteReview.mutate(reviewId);
    }
  };

  const handleReportSubmit = () => {
    if (!reportingReview || !reportReason) {
      toast.error('신고 사유를 입력해주세요.');
      return;
    }

    reportReview.mutate(
      { id: reportingReview, reason: reportReason },
      {
        onSuccess: () => {
          setReportingReview(null);
          setReportReason('');
        }
      }
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">리뷰</h2>
        {user && canReviewData?.canReview && (
          <Button onClick={() => setShowReviewForm(true)}>
            <PenSquare className="w-4 h-4 mr-2" />
            리뷰 작성
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">전체 리뷰</TabsTrigger>
          <TabsTrigger value="stats">리뷰 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {reviewsLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ReviewList
              reviews={reviewsData}
              filters={filters}
              onFiltersChange={setFilters}
              onHelpful={(reviewId, helpful) => 
                markHelpful.mutate({ id: reviewId, helpful })
              }
              onReport={(reviewId) => setReportingReview(reviewId)}
              onEdit={(reviewId) => setEditingReview(reviewId)}
              onDelete={handleDeleteReview}
              onLoadMore={handleLoadMore}
              isLoading={reviewsLoading}
              hasMore={hasMore}
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          {statsLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : statsData ? (
            <div className="max-w-md mx-auto">
              <ReviewStats stats={statsData} />
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">통계를 표시할 리뷰가 없습니다.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Review Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>리뷰 작성</DialogTitle>
          </DialogHeader>
          {canReviewData && !canReviewData.canReview && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {canReviewData.reason || '이 상품에 대한 리뷰를 작성할 수 없습니다.'}
              </AlertDescription>
            </Alert>
          )}
          <ReviewForm
            productId={product.id}
            onSubmit={handleCreateReview}
            onCancel={() => setShowReviewForm(false)}
            isSubmitting={createReview.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Review Dialog */}
      {editingReview && (
        <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>리뷰 수정</DialogTitle>
            </DialogHeader>
            <ReviewForm
              productId={product.id}
              review={reviewsData?.reviews.find((r: any) => r.id === editingReview)}
              onSubmit={handleUpdateReview}
              onCancel={() => setEditingReview(null)}
              isSubmitting={updateReview.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Report Review Dialog */}
      <Dialog open={!!reportingReview} onOpenChange={() => setReportingReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리뷰 신고</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">신고 사유</label>
              <textarea
                className="w-full mt-1 p-3 border rounded-md resize-none"
                rows={4}
                placeholder="신고 사유를 입력해주세요"
                value={reportReason}
                onChange={(e: any) => setReportReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleReportSubmit}
                disabled={!reportReason || reportReview.isPending}
                className="flex-1"
              >
                신고하기
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setReportingReview(null);
                  setReportReason('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}