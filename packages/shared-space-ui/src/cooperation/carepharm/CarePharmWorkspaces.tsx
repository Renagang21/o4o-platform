import { Link, useSearchParams } from 'react-router-dom';

/** Public orientation only; member data and Store entry retain their existing guards. */
export function CarePharmWorkspaces() {
  const [params] = useSearchParams();
  const store = params.get('store');
  const storeSearch = store ? `?store=${encodeURIComponent(store)}` : '';
  return <section aria-labelledby="carepharm-workspaces-heading" className="space-y-5">
    <h2 id="carepharm-workspaces-heading" className="text-xl font-semibold text-slate-900">함께 나누는 공간, 우리 약국에서 활용하는 공간</h2>
    <div className="grid gap-4 md:grid-cols-2">
      <article className="min-w-0 rounded-2xl border border-teal-100 bg-teal-50 p-5 sm:p-6">
        <p className="text-sm font-semibold text-teal-800">CarePharm 협업체 공간</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">운영 소식과 회원의 경험을 나눕니다</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">참여 신청과 승인, 공지 확인, 회원자료 열람, 제품·공급조건·자료 활용에 관한 문의와 약국 운영 사례를 함께 나누는 곳입니다.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-teal-800">
          <Link className="inline-flex min-h-11 items-center underline" to={'/my/participation' + storeSearch}>참여 신청 · 상태</Link>
          <Link className="inline-flex min-h-11 items-center underline" to={'/communities/business%3Acarepharm/forum' + storeSearch}>회원 커뮤니티</Link>
          <Link className="inline-flex min-h-11 items-center underline" to={'/materials' + storeSearch}>회원자료 보기</Link>
        </div>
      </article>
      <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-sm font-semibold text-teal-800">가입 승인된 약국의 내 매장</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">제품과 자료를 우리 약국에 활용합니다</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">공급가격과 조건을 확인해 발주하고, 회원자료를 내 매장 사본으로 가져와 편집합니다. 자료를 POP·블로그에 활용하고 제품·매장 콘텐츠의 정보 QR을 관리합니다.</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">각 약국은 CarePharm에서 가입 승인을 받은 뒤 같은 내 매장에서 업무를 이용합니다.</p>
        <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline" to={'/tools' + storeSearch}>내 매장 업무 · 이용 안내</Link>
      </article>
    </div>
  </section>;
}
