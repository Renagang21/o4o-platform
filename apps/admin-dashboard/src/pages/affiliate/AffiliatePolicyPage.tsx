import { Shield, AlertCircle, DollarSign, Calendar, Users, FileText, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const AffiliatePolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-modern-text-primary mb-4">
          O4O Platform 추천인 정책
        </h1>
        <p className="text-lg text-modern-text-secondary">
          함께 성장하는 파트너십을 위한 가이드라인
        </p>
      </div>

      {/* 중요 공지 */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>법적 준수 사항</AlertTitle>
        <AlertDescription>
          O4O Platform은 한국 법률에 따라 단일 단계 추천 시스템만을 운영합니다.
          다단계(MLM) 구조는 일체 허용되지 않습니다.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="commission">커미션</TabsTrigger>
          <TabsTrigger value="rules">규정</TabsTrigger>
          <TabsTrigger value="guide">가이드</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-modern-primary" />
                추천인 프로그램 소개
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O4O Platform 추천인 프로그램은 여러분의 소셜 네트워크를 통해 
                플랫폼을 알리고 함께 성장할 수 있는 기회를 제공합니다.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
                  <div className="text-3xl font-bold text-modern-primary mb-2">5%</div>
                  <p className="text-sm text-modern-text-secondary">기본 커미션율</p>
                </div>
                <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
                  <div className="text-3xl font-bold text-modern-success mb-2">25일</div>
                  <p className="text-sm text-modern-text-secondary">월 정산일</p>
                </div>
                <div className="text-center p-4 bg-modern-bg-tertiary rounded-lg">
                  <div className="text-3xl font-bold text-modern-warning mb-2">1단계</div>
                  <p className="text-sm text-modern-text-secondary">추천 단계 제한</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <h4 className="font-medium">프로그램 특징</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-modern-success mt-0.5">✓</span>
                    <span>소셜 미디어를 통한 간편한 공유</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-modern-success mt-0.5">✓</span>
                    <span>투명한 성과 추적 시스템</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-modern-success mt-0.5">✓</span>
                    <span>월 1회 정기 정산</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-modern-success mt-0.5">✓</span>
                    <span>전용 대시보드 제공</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>참여 자격</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-modern-primary/10 text-modern-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium">O4O Platform 회원</p>
                    <p className="text-sm text-modern-text-secondary">
                      정식 회원 가입 및 이메일 인증 완료
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-modern-primary/10 text-modern-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium">추천인 약관 동의</p>
                    <p className="text-sm text-modern-text-secondary">
                      추천인 프로그램 이용약관 및 개인정보 처리방침 동의
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-modern-primary/10 text-modern-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium">정산 정보 등록</p>
                    <p className="text-sm text-modern-text-secondary">
                      계좌 정보 또는 포인트 수령 방법 등록
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 커미션 탭 */}
        <TabsContent value="commission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-modern-primary" />
                커미션 정책
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-modern-border-primary">
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">구분</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">커미션율</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">지급 조건</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-modern-border-primary">
                      <td className="py-3 px-2">기본 상품</td>
                      <td className="py-3 px-2 font-medium">5%</td>
                      <td className="py-3 px-2 text-sm">구매 확정 후</td>
                    </tr>
                    <tr className="border-b border-modern-border-primary">
                      <td className="py-3 px-2">프리미엄 상품</td>
                      <td className="py-3 px-2 font-medium">7%</td>
                      <td className="py-3 px-2 text-sm">구매 확정 후</td>
                    </tr>
                    <tr className="border-b border-modern-border-primary">
                      <td className="py-3 px-2">이벤트 상품</td>
                      <td className="py-3 px-2 font-medium">최대 10%</td>
                      <td className="py-3 px-2 text-sm">별도 공지</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  커미션은 주문 금액(배송비, 할인 제외)을 기준으로 계산됩니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">커미션 지급 프로세스</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-modern-primary" />
                    <span className="text-sm">추천 링크를 통한 구매 발생</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-modern-primary" />
                    <span className="text-sm">구매 확정 (배송 완료 후 7일)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-modern-primary" />
                    <span className="text-sm">커미션 승인 (관리자 검토)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-modern-primary" />
                    <span className="text-sm">월말 정산 (매월 25일)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>정산 안내</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-modern-bg-tertiary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-modern-primary" />
                    <h5 className="font-medium">정산 일정</h5>
                  </div>
                  <ul className="space-y-1 text-sm text-modern-text-secondary">
                    <li>• 정산 기준일: 매월 말일</li>
                    <li>• 지급일: 익월 25일</li>
                    <li>• 최소 정산 금액: 10,000원</li>
                  </ul>
                </div>
                <div className="p-4 bg-modern-bg-tertiary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-modern-primary" />
                    <h5 className="font-medium">세금 처리</h5>
                  </div>
                  <ul className="space-y-1 text-sm text-modern-text-secondary">
                    <li>• 소득세: 20%</li>
                    <li>• 지방소득세: 2%</li>
                    <li>• 세금계산서 발행 가능</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 규정 탭 */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-modern-error" />
                금지 행위
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>경고</AlertTitle>
                <AlertDescription>
                  아래 행위 적발 시 추천인 자격이 즉시 정지되며, 
                  미지급 커미션은 몰수됩니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="p-3 border border-modern-error/20 rounded-lg">
                  <p className="font-medium text-modern-error mb-1">허위/과장 광고</p>
                  <p className="text-sm text-modern-text-secondary">
                    제품이나 서비스에 대한 거짓 정보 유포, 과장된 효과 홍보
                  </p>
                </div>
                <div className="p-3 border border-modern-error/20 rounded-lg">
                  <p className="font-medium text-modern-error mb-1">스팸 활동</p>
                  <p className="text-sm text-modern-text-secondary">
                    무분별한 메시지 발송, 게시판 도배, 원치 않는 광고
                  </p>
                </div>
                <div className="p-3 border border-modern-error/20 rounded-lg">
                  <p className="font-medium text-modern-error mb-1">자기 추천</p>
                  <p className="text-sm text-modern-text-secondary">
                    본인 또는 가족 계정을 통한 자기 추천 행위
                  </p>
                </div>
                <div className="p-3 border border-modern-error/20 rounded-lg">
                  <p className="font-medium text-modern-error mb-1">부정 거래</p>
                  <p className="text-sm text-modern-text-secondary">
                    가짜 주문, 결제 후 의도적 취소, 리워드 악용
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계약 해지</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h5 className="font-medium">자발적 해지</h5>
                <ul className="space-y-1 text-sm text-modern-text-secondary">
                  <li>• 30일 전 사전 통보</li>
                  <li>• 미지급 커미션은 최종 정산일에 지급</li>
                  <li>• 추천 코드 즉시 비활성화</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h5 className="font-medium">강제 해지 사유</h5>
                <ul className="space-y-1 text-sm text-modern-text-secondary">
                  <li>• 금지 행위 위반</li>
                  <li>• 6개월 이상 활동 없음</li>
                  <li>• 회원 탈퇴</li>
                  <li>• 법적 문제 발생</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 가이드 탭 */}
        <TabsContent value="guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-modern-primary" />
                추천 성공 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium mb-2">1. 타겟 설정</h5>
                  <p className="text-sm text-modern-text-secondary">
                    관심사가 비슷한 지인이나 커뮤니티를 대상으로 시작하세요.
                    진정성 있는 추천이 가장 효과적입니다.
                  </p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">2. 콘텐츠 작성</h5>
                  <p className="text-sm text-modern-text-secondary">
                    실제 사용 경험을 바탕으로 솔직한 리뷰를 작성하세요.
                    사진이나 동영상을 활용하면 더욱 효과적입니다.
                  </p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">3. 채널 활용</h5>
                  <p className="text-sm text-modern-text-secondary">
                    카카오톡, 페이스북, 네이버 밴드 등 다양한 채널을 활용하세요.
                    각 채널의 특성에 맞는 메시지를 작성하는 것이 중요합니다.
                  </p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">4. 성과 분석</h5>
                  <p className="text-sm text-modern-text-secondary">
                    대시보드에서 어떤 채널이 효과적인지 분석하고,
                    성과가 좋은 방법에 집중하세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>자주 묻는 질문</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-1">Q. 추천 링크의 유효 기간은?</p>
                  <p className="text-sm text-modern-text-secondary">
                    A. 추천 링크는 클릭 후 30일간 유효합니다.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Q. 여러 제품을 추천할 수 있나요?</p>
                  <p className="text-sm text-modern-text-secondary">
                    A. 네, 제품별로 개별 추천 링크를 생성할 수 있습니다.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Q. 커미션은 언제 확정되나요?</p>
                  <p className="text-sm text-modern-text-secondary">
                    A. 구매자가 상품을 수령하고 7일 후 구매 확정 시 커미션이 확정됩니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 문의 섹션 */}
      <Card className="bg-modern-bg-tertiary">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-medium mb-2">추가 문의사항이 있으신가요?</h3>
          <p className="text-sm text-modern-text-secondary mb-4">
            추천인 프로그램에 대한 자세한 내용은 고객센터로 문의해주세요.
          </p>
          <Button>
            고객센터 문의하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliatePolicyPage;