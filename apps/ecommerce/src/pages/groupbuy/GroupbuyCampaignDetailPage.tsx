/**
 * Groupbuy Campaign Detail Page (Member View)
 * Phase 3: UI Integration
 *
 * Work Order: WO-GROUPBUY-YAKSA-PHASE3-UI-INTEGRATION
 * Displays campaign products and allows participation
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Input } from '@o4o/ui';
import { ArrowLeft, Calendar, Package, AlertCircle, CheckCircle } from 'lucide-react';
import {
  useGroupbuyCampaignDetail,
  useCampaignProducts,
  useParticipateGroupbuy,
  useRemainingTime
} from '@/hooks/useGroupbuy';
import { GroupbuyStatusBadge, GroupbuyProductCard, ProgressBar } from '@/components/groupbuy';
import type { CampaignProduct } from '@/lib/api/groupbuy';

// TODO: Get from auth context
const MOCK_PHARMACY_ID = 'pharmacy-sample-001';
const MOCK_USER_ID = 'user-sample-001';

export function GroupbuyCampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [selectedProduct, setSelectedProduct] = useState<CampaignProduct | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const { data: campaign, isLoading: campaignLoading } = useGroupbuyCampaignDetail(campaignId || '');
  const { data: products, isLoading: productsLoading } = useCampaignProducts(campaignId || '');
  const participateMutation = useParticipateGroupbuy();

  const { label: remainingLabel, isExpired } = useRemainingTime(campaign?.endDate || '');

  const handleParticipate = (product: CampaignProduct) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleSubmitParticipation = async () => {
    if (!selectedProduct || !campaignId) return;

    try {
      await participateMutation.mutateAsync({
        campaignId,
        campaignProductId: selectedProduct.id,
        pharmacyId: MOCK_PHARMACY_ID,
        quantity,
        orderedBy: MOCK_USER_ID
      });

      // Close modal and show success
      setSelectedProduct(null);
      alert('공동구매 참여가 완료되었습니다.');
    } catch (error) {
      alert('참여 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  const isLoading = campaignLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/groupbuy">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <Card className="p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Link to="/groupbuy">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="font-medium text-lg mb-2">캠페인을 찾을 수 없습니다</h3>
          <p className="text-muted-foreground">삭제되었거나 잘못된 주소입니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/groupbuy">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            <GroupbuyStatusBadge status={campaign.status} />
          </div>
        </div>
      </div>

      {/* Campaign Info Card */}
      <Card className="p-6">
        {campaign.description && (
          <p className="text-muted-foreground mb-4">{campaign.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">기간</div>
              <div className="font-medium">
                {new Date(campaign.startDate).toLocaleDateString('ko-KR')} ~{' '}
                {new Date(campaign.endDate).toLocaleDateString('ko-KR')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">상품 수</div>
              <div className="font-medium">{products?.length || 0}개</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExpired ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <div>
              <div className="text-sm text-muted-foreground">남은 기간</div>
              <div className={`font-medium ${isExpired ? 'text-red-500' : ''}`}>
                {remainingLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        {products && products.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-2">전체 진행률</div>
            <ProgressBar
              current={products.reduce((sum, p) => sum + p.confirmedQuantity, 0)}
              target={products.reduce((sum, p) => sum + p.minTotalQuantity, 0)}
            />
          </div>
        )}
      </Card>

      {/* Products List */}
      <section>
        <h2 className="text-lg font-semibold mb-4">공동구매 상품</h2>
        {products && products.length > 0 ? (
          <div className="space-y-4">
            {products.map(product => (
              <GroupbuyProductCard
                key={product.id}
                product={product}
                onParticipate={handleParticipate}
                showActions={campaign.status === 'active'}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted-foreground">등록된 상품이 없습니다.</p>
          </Card>
        )}
      </section>

      {/* Participation Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">공동구매 참여</h3>

            <div className="mb-4">
              <div className="font-medium">
                {selectedProduct.productName || `상품 ${selectedProduct.productId}`}
              </div>
              {selectedProduct.supplierName && (
                <div className="text-sm text-muted-foreground">
                  {selectedProduct.supplierName}
                </div>
              )}
            </div>

            <div className="mb-4">
              <ProgressBar
                current={selectedProduct.confirmedQuantity}
                target={selectedProduct.minTotalQuantity}
                size="sm"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">수량</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                참여 수량을 입력해 주세요
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedProduct(null)}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitParticipation}
                disabled={participateMutation.isPending}
              >
                {participateMutation.isPending ? '처리중...' : '참여하기'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
