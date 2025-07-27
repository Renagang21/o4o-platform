import { FC, useState, useEffect, useCallback } from 'react';
import { 
  Link2, QrCode, MessageSquare, Image, 
  Download, Copy, Check, Smartphone, Monitor 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareButtons } from '@/components/common/ShareButtons';
import { generateReferralLink, generateQRCodeUrl, referralMessageTemplates } from '@/utils/referralUtils';
import toast from 'react-hot-toast';

interface ReferralToolkitProps {
  referralCode: string;
  userName?: string;
}

export const ReferralToolkit: FC<ReferralToolkitProps> = ({
  referralCode,
  userName = '회원'
}) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('kakao');
  const [qrSize, setQrSize] = useState('200');
  const [copiedMessage, setCopiedMessage] = useState(false);

  // 제품 목록 (실제로는 API에서 가져옴)
  const products = [
    { id: 'best-seller', name: '베스트셀러 이어폰', price: 89000 },
    { id: 'new-arrival', name: '신상품 스마트워치', price: 259000 },
    { id: 'promotion', name: '프로모션 키보드', price: 79000 }
  ];

  const baseUrl = window.location.origin;
  const referralLink = generateReferralLink(baseUrl, referralCode, selectedProduct);
  const qrCodeUrl = generateQRCodeUrl(referralLink, parseInt(qrSize));

  // 메시지 템플릿 생성
  const getMessageTemplate = () => {
    const productName = selectedProduct 
      ? products.find(p => p.id === selectedProduct)?.name || '상품'
      : 'O4O Platform';

    switch (messageTemplate) {
      case 'kakao':
        return referralMessageTemplates.kakao(productName, referralCode);
      case 'sms':
        return referralMessageTemplates.sms(productName, referralCode, referralLink);
      case 'email':
        const emailTemplate = referralMessageTemplates.email(productName, referralCode, referralLink);
        return `제목: ${emailTemplate.subject}\n\n${emailTemplate.body}`;
      case 'custom':
        return customMessage || `${userName}님이 ${productName}을(를) 추천합니다!\n추천 코드: ${referralCode}\n${referralLink}`;
      default:
        return '';
    }
  };

  // 메시지 복사
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(getMessageTemplate());
      setCopiedMessage(true);
      toast.success('메시지가 복사되었습니다!');
      setTimeout(() => setCopiedMessage(false), 3000);
    } catch (error) {
      toast.error('메시지 복사에 실패했습니다.');
    }
  };

  // QR 코드 다운로드
  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `referral_qr_${referralCode}.png`;
    link.click();
  };

  // 배너 이미지 다운로드 (실제로는 Canvas API로 생성)
  const downloadBanner = (type: 'mobile' | 'desktop') => {
    // 간단한 구현을 위해 알림만 표시
    toast.success(`${type === 'mobile' ? '모바일' : '데스크탑'} 배너 다운로드 준비 중...`);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="links" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="links">링크 생성</TabsTrigger>
          <TabsTrigger value="qrcode">QR 코드</TabsTrigger>
          <TabsTrigger value="messages">메시지</TabsTrigger>
          <TabsTrigger value="banners">배너</TabsTrigger>
        </TabsList>

        {/* 링크 생성 탭 */}
        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-modern-primary" />
                맞춤형 추천 링크
              </CardTitle>
              <CardDescription>
                제품별로 특화된 추천 링크를 생성하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>추천할 제품 선택 (선택사항)</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 상품 추천" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체 상품 추천</SelectItem>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.price.toLocaleString()}원
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>생성된 추천 링크</Label>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="font-mono text-sm" />
                  <Button
                    variant={"outline" as const}
                    size={"icon" as const}
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      toast.success('링크가 복사되었습니다!');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <ShareButtons
                  url={referralLink}
                  title={selectedProduct ? products.find(p => p.id === selectedProduct)?.name : 'O4O Platform 특별 혜택!'}
                  description={`추천 코드 ${referralCode}로 특별한 혜택을 받으세요!`}
                  referralCode={referralCode}
                  showLabels={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR 코드 탭 */}
        <TabsContent value="qrcode" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-modern-primary" />
                QR 코드 생성
              </CardTitle>
              <CardDescription>
                오프라인 공유를 위한 QR 코드를 생성하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>QR 코드 크기</Label>
                    <Select value={qrSize} onValueChange={setQrSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="150">150 x 150</SelectItem>
                        <SelectItem value="200">200 x 200</SelectItem>
                        <SelectItem value="300">300 x 300</SelectItem>
                        <SelectItem value="400">400 x 400</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>포함된 정보</Label>
                    <div className="p-3 bg-modern-bg-tertiary rounded-lg text-sm space-y-1">
                      <p>• 추천 코드: {referralCode}</p>
                      <p>• 연결 페이지: {selectedProduct ? '제품 상세' : '메인 페이지'}</p>
                      <p>• 추적 가능: 클릭 및 전환</p>
                    </div>
                  </div>

                  <Button onClick={downloadQRCode} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    QR 코드 다운로드
                  </Button>
                </div>

                <div className="flex items-center justify-center">
                  <div className="p-4 bg-white rounded-lg shadow-lg">
                    <img src={qrCodeUrl} alt="추천 QR 코드" className="w-full h-auto" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 메시지 탭 */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-modern-primary" />
                공유 메시지 템플릿
              </CardTitle>
              <CardDescription>
                플랫폼별 최적화된 메시지를 사용하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>메시지 템플릿</Label>
                <Select value={messageTemplate} onValueChange={setMessageTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kakao">카카오톡</SelectItem>
                    <SelectItem value="sms">문자 메시지</SelectItem>
                    <SelectItem value="email">이메일</SelectItem>
                    <SelectItem value="custom">직접 작성</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>메시지 내용</Label>
                <Textarea
                  value={messageTemplate === 'custom' ? customMessage : getMessageTemplate()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomMessage(e.target.value)}
                  rows={8}
                  readOnly={messageTemplate !== 'custom'}
                  className={messageTemplate !== 'custom' ? 'bg-modern-bg-tertiary' : ''}
                />
              </div>

              <Button onClick={copyMessage} className="w-full">
                {copiedMessage ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    복사되었습니다!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    메시지 복사
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 배너 탭 */}
        <TabsContent value="banners" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-modern-primary" />
                추천 배너 이미지
              </CardTitle>
              <CardDescription>
                블로그나 SNS에 사용할 수 있는 배너를 다운로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-modern-border-primary">
                  <CardContent className="p-6">
                    <div className="aspect-[16/9] bg-modern-bg-tertiary rounded-lg mb-4 flex items-center justify-center">
                      <Monitor className="w-16 h-16 text-modern-text-tertiary" />
                    </div>
                    <h4 className="font-medium mb-2">데스크탑 배너</h4>
                    <p className="text-sm text-modern-text-secondary mb-4">
                      1200 x 675px • 블로그, 웹사이트용
                    </p>
                    <Button 
                      variant={"outline" as const} 
                      className="w-full"
                      onClick={() => downloadBanner('desktop')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-modern-border-primary">
                  <CardContent className="p-6">
                    <div className="aspect-[9/16] bg-modern-bg-tertiary rounded-lg mb-4 flex items-center justify-center mx-auto w-32">
                      <Smartphone className="w-16 h-16 text-modern-text-tertiary" />
                    </div>
                    <h4 className="font-medium mb-2">모바일 배너</h4>
                    <p className="text-sm text-modern-text-secondary mb-4">
                      1080 x 1920px • 인스타그램 스토리용
                    </p>
                    <Button 
                      variant={"outline" as const} 
                      className="w-full"
                      onClick={() => downloadBanner('mobile')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};