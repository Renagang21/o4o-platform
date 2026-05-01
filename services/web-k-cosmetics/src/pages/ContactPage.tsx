/**
 * ContactPage - 문의
 * WO-KCOS-HOME-UI-V1
 * WO-O4O-KCOS-AUTH-DESIGN-POLISH-V1: inline style → Tailwind, hex → theme, Card 적용
 */

import { PageSection, PageContainer, Card } from '@o4o/ui';

export function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-6 text-center mb-12">
        <h1 className="text-3xl font-bold mb-3 mt-0">문의</h1>
        <p className="text-base text-slate-400 m-0">
          궁금한 점이 있으시면 연락해 주세요
        </p>
      </section>

      <PageSection last>
        <PageContainer>
          {/* Contact Cards */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 mb-12">
            <Card className="p-7">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-0">일반 문의</h3>
              <p className="text-sm text-slate-500 mb-5 mt-0 leading-relaxed">
                플랫폼 이용 및 서비스에 관한 일반 문의
              </p>
              <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 leading-loose">
                <p className="m-0"><strong>이메일:</strong> info@k-cosmetics.site</p>
                <p className="m-0"><strong>전화:</strong> 1577-2779</p>
              </div>
            </Card>

            <Card className="p-7">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-0">파트너 문의</h3>
              <p className="text-sm text-slate-500 mb-5 mt-0 leading-relaxed">
                매장 파트너 가입 및 제휴 관련 문의
              </p>
              <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 leading-loose">
                <p className="m-0"><strong>이메일:</strong> partner@k-cosmetics.site</p>
                <p className="m-0"><strong>전화:</strong> 1577-2779</p>
              </div>
            </Card>

            <Card className="p-7">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-0">관광객/가이드 문의</h3>
              <p className="text-sm text-slate-500 mb-5 mt-0 leading-relaxed">
                단체 관광 및 가이드 파트너십 문의
              </p>
              <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 leading-loose">
                <p className="m-0"><strong>이메일:</strong> tour@k-cosmetics.site</p>
                <p className="m-0"><strong>전화:</strong> 1577-2779</p>
              </div>
            </Card>
          </div>

          {/* Notice */}
          <div className="bg-amber-50 rounded-xl p-6 mb-6 border border-amber-200">
            <h3 className="text-base font-semibold text-amber-800 mb-3 mt-0">안내사항</h3>
            <p className="text-sm text-slate-700 mb-2 mt-0 leading-relaxed">
              개별 매장의 상품, 가격, 결제, 배송에 관한 문의는 해당 매장에 직접 연락해 주세요.
            </p>
            <p className="text-sm text-slate-700 mb-0 mt-0 leading-relaxed">
              K-Cosmetics.site는 매장 정보 제공 플랫폼이며, 직접 판매를 하지 않습니다.
            </p>
          </div>

          {/* Company Info */}
          <Card className="p-6 text-center">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 mt-0">운영 회사 정보</h3>
            <div className="text-xs text-slate-400 leading-loose">
              <p className="m-0">㈜쓰리라이프존</p>
              <p className="m-0">사업자등록번호: 108-86-02873</p>
              <p className="m-0">서울시 강남구</p>
            </div>
          </Card>
        </PageContainer>
      </PageSection>
    </div>
  );
}
