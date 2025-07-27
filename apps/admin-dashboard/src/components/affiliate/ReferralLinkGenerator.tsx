import { useState, useEffect } from 'react';
import { Link2, QrCode, Copy, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareButtons } from '@/components/common/ShareButtons';
import { generateReferralLink, generateQRCodeUrl } from '@/utils/referralUtils';
import toast from 'react-hot-toast';

interface ReferralLinkGeneratorProps {
  referralCode: string;
  userName?: string;
}

export const ReferralLinkGenerator: FC<ReferralLinkGeneratorProps> = ({
  referralCode,
  userName = '회원',
}) => {
  const [linkType, setLinkType] = useState<'main' | 'product'>('main');
  const [productId, setProductId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // 링크 생성
  useEffect(() => {
    const baseUrl = window.location.origin;
    const link = generateReferralLink(
      baseUrl,
      referralCode,
      linkType === 'product' ? productId : undefined
    );
    setGeneratedLink(link);
  }, [referralCode, linkType, productId]);

  // 링크 복사
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('추천 링크가 복사되었습니다!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  const qrCodeUrl = generateQRCodeUrl(generatedLink);

  return (
    <div className="space-y-6">
      {/* 추천 코드 표시 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-modern-primary" />
            내 추천 코드
          </CardTitle>
          <CardDescription>
            이 코드를 공유하여 추천 수수료를 받으세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-modern-bg-tertiary rounded-lg">
            <p className="text-3xl font-bold text-modern-primary mb-2">
              {referralCode}
            </p>
            <p className="text-sm text-modern-text-secondary">
              {userName}님의 전용 추천 코드
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 추천 링크 생성기 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-modern-primary" />
            추천 링크 생성
          </CardTitle>
          <CardDescription>
            공유할 추천 링크를 생성하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 링크 타입 선택 */}
          <div className="space-y-2">
            <Label>링크 타입</Label>
            <Select value={linkType} onValueChange={(value: any) => setLinkType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">메인 페이지</SelectItem>
                <SelectItem value="product">특정 상품</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 상품 ID 입력 (상품 링크인 경우) */}
          {linkType === 'product' && (
            <div className="space-y-2">
              <Label>상품 ID</Label>
              <Input
                placeholder="상품 ID를 입력하세요"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              />
            </div>
          )}

          {/* 생성된 링크 */}
          <div className="space-y-2">
            <Label>생성된 추천 링크</Label>
            <div className="flex gap-2">
              <Input
                value={generatedLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-modern-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* QR 코드 표시 */}
          {showQR && (
            <div className="flex justify-center p-4 bg-modern-bg-tertiary rounded-lg">
              <img
                src={qrCodeUrl}
                alt="추천 링크 QR 코드"
                className="w-48 h-48"
              />
            </div>
          )}

          {/* 소셜 공유 버튼 */}
          <div className="space-y-2">
            <Label>소셜 미디어로 공유</Label>
            <div className="p-4 bg-modern-bg-tertiary rounded-lg">
              <ShareButtons
                url={generatedLink}
                title="O4O Platform 특별 혜택!"
                description={`추천 코드 ${referralCode}로 가입하고 특별한 혜택을 받으세요!`}
                referralCode={referralCode}
                size="default"
                showLabels={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용 가이드 */}
      <Card>
        <CardHeader>
          <CardTitle>추천 링크 사용 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-modern-primary/10 text-modern-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-modern-text-primary">추천 링크 생성</p>
                <p className="text-sm text-modern-text-secondary mt-1">
                  위에서 원하는 타입의 추천 링크를 생성하세요. 메인 페이지나 특정 상품 페이지로 연결할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-modern-primary/10 text-modern-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-modern-text-primary">링크 공유</p>
                <p className="text-sm text-modern-text-secondary mt-1">
                  카카오톡, 페이스북, 네이버 밴드 등 소셜 미디어로 공유하거나, 링크를 복사하여 직접 전달하세요.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-modern-primary/10 text-modern-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-modern-text-primary">수수료 적립</p>
                <p className="text-sm text-modern-text-secondary mt-1">
                  추천 링크를 통해 가입한 사용자가 구매를 완료하면, 정해진 수수료율에 따라 수수료가 적립됩니다.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-modern-warning/10 border border-modern-warning/20 rounded-lg">
            <p className="text-sm text-modern-warning font-medium mb-1">주의사항</p>
            <ul className="text-sm text-modern-text-secondary space-y-1">
              <li>• 본인의 추천 코드로는 가입할 수 없습니다</li>
              <li>• 허위 또는 부정한 방법으로 추천 시 자격이 정지될 수 있습니다</li>
              <li>• 추천 수수료는 구매 확정 후 지급됩니다</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};