import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestServiceHandoff } from '@o4o/auth-react';
import { cooperationDestination } from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { neturePharmacyApi, type SemiFranchiseContent } from '../../api/neturePharmacy';
import { api } from '../../lib/apiClient';
import { PharmacyPage, formatDate } from './shared';

const SUPPLY = '/store/pharmacy/supply?source=sf%3Acarepharm';
const MATERIALS = '/store/pharmacy/contents?business=carepharm';
const actionClass = 'inline-flex min-h-11 items-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50';

/** Each view and pending request belongs to one account, pharmacy, and service context. */
export default function CarePharmToolsPage() {
  const { user, isAuthenticated } = useAuth();
  const { organizationId, organizationName, effectiveServiceKey, stores } = useUnifiedStore();
  const accountId = isAuthenticated ? user?.id : undefined;
  const canEnterCommunity = ['owner', 'admin', 'manager'].includes(stores.find(store => store.organizationId === organizationId)?.memberRole ?? '');
  return <Tools key={`${accountId}:${organizationId}:${effectiveServiceKey}:${canEnterCommunity}`} organizationId={organizationId}
    organizationName={organizationName} accountId={accountId} canEnterCommunity={canEnterCommunity} />;
}

function Tools({ organizationId, organizationName, accountId, canEnterCommunity }: {
  organizationId: string | null; organizationName: string | null; accountId?: string; canEnterCommunity: boolean;
}) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [materials, setMaterials] = useState<SemiFranchiseContent[] | null>(null);
  const [materialsError, setMaterialsError] = useState('');
  const [moving, setMoving] = useState(false);
  const [entryError, setEntryError] = useState('');
  const mounted = useRef(true);
  const movePending = useRef(false);
  const moveVersion = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!organizationId || !accountId) return;
    let alive = true;
    moveVersion.current += 1; movePending.current = false; setMoving(false);
    setAllowed(null); setError(''); setMaterials(null); setMaterialsError(''); setEntryError('');
    void (async () => {
      try {
        const context = await neturePharmacyApi.getStoreContext();
        if (!alive) return;
        if (context.organizationId !== organizationId || !Array.isArray(context.semiFranchiseKeys)) throw new Error('Store scope mismatch');
        const active = context.semiFranchiseKeys.includes('carepharm');
        setAllowed(active);
        if (!active) return;
      } catch {
        if (alive) setError('만성질환관리 이용 상태를 확인하지 못했습니다.');
        return;
      }
      try {
        const result = await neturePharmacyApi.listContents({ sf: 'carepharm', page: 1, limit: 3 });
        if (!alive) return;
        if (!Array.isArray(result.items) || result.items.some(item => item.semiFranchiseKey !== 'carepharm')) throw new Error('Business scope mismatch');
        setMaterials(result.items.slice(0, 3));
      } catch {
        if (alive) setMaterialsError('회원자료를 불러오지 못했습니다.');
      }
    })();
    // Recheck on return and periodically; every destination also enforces server access.
    const refresh = () => { if (document.visibilityState === 'visible') setRetry(n => n + 1); };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { alive = false; moveVersion.current += 1; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [organizationId, accountId, retry]);

  const enterCommunity = async () => {
    if (movePending.current || !organizationId || !canEnterCommunity) return;
    const version = ++moveVersion.current;
    const isCurrent = () => mounted.current && moveVersion.current === version;
    movePending.current = true; setMoving(true); setEntryError('');
    try {
      const context = await neturePharmacyApi.getStoreContext();
      if (!isCurrent()) return;
      if (context.organizationId !== organizationId || !context.semiFranchiseKeys.includes('carepharm')) {
        setAllowed(false); setMaterials(null); return;
      }
      const destination = cooperationDestination('carepharm', 'community');
      const href = await requestServiceHandoff(api, { ...destination, returnPath: `${destination.returnPath}?store=${encodeURIComponent(organizationId)}` });
      if (isCurrent()) window.location.assign(href);
    } catch {
      if (isCurrent()) setEntryError('회원 커뮤니티로 이동하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (isCurrent()) { movePending.current = false; setMoving(false); }
    }
  };

  return <PharmacyPage title="만성질환관리" description="CarePharm에서 제공하는 제품과 자료를 우리 약국의 경영에 활용합니다."
    actions={organizationId && accountId && <button type="button" className={actionClass} onClick={() => setRetry(n => n + 1)}>새로고침</button>}>
    {!accountId ? <p>로그인 후 이용해 주세요.</p> : !organizationId ? <p>약국을 먼저 선택해 주세요.</p> : error ? <div role="alert"><p>{error}</p><button className={actionClass} onClick={() => setRetry(n => n + 1)}>다시 확인</button></div> : allowed === null ? <p role="status">이용 상태를 확인하고 있습니다…</p> : !allowed ? <div className="rounded-xl border bg-white p-6"><p>선택한 약국은 만성질환관리 서비스 가입 승인 후 이용할 수 있습니다.</p><Link className={`${actionClass} mt-4`} to="/store/pharmacy/semi-franchises">협력사업 서비스 · 가입 상태 확인</Link></div> : <div className="space-y-8">
      <section className="rounded-2xl bg-emerald-950 p-5 text-white sm:p-7">
        <p className="text-sm text-emerald-200">CarePharm · 가입 승인된 약국</p>
        <h2 className="mt-2 break-words text-xl font-semibold">{organizationName || '선택한 약국'}의 협업 업무</h2>
        <p className="mt-3 text-sm leading-6 text-emerald-100">제품과 자료의 활용은 내 매장에서, 협업체 소식과 회원 교류는 CarePharm에서 이어갑니다.</p>
      </section>

      <nav aria-label="만성질환관리 약국 업무" className="grid gap-4 lg:grid-cols-3">
        {[
          { title: '공급제품 · 발주', description: '협업체 공급가격과 조건을 확인하고 필요한 제품을 발주합니다.', to: SUPPLY, label: '공급제품 보기' },
          { title: '회원자료 활용', description: '게시된 자료를 내 매장 사본으로 가져와 우리 약국에 맞게 편집합니다.', to: MATERIALS, label: '회원자료 가져오기' },
          { title: '안내물 만들기', description: '회원자료를 POP·블로그에 활용하고, 제품·매장 콘텐츠의 정보 QR을 관리합니다.', to: '#carepharm-production', label: '제작 도구 보기' },
        ].map(item => <article key={item.title} className="min-w-0 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">{item.title}</h2><p className="mb-4 mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
          {item.to.startsWith('#') ? <a className={actionClass} href={item.to}>{item.label}</a> : <Link className={actionClass} to={item.to}>{item.label}</Link>}
        </article>)}
      </nav>

      <section aria-labelledby="carepharm-materials-heading" className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="carepharm-materials-heading" className="text-lg font-semibold">최근 회원자료</h2><Link className={actionClass} to={MATERIALS}>전체 회원자료</Link></div>
        {materialsError ? <div role="alert" className="mt-4"><p>{materialsError}</p><button className={`${actionClass} mt-3`} onClick={() => setRetry(n => n + 1)}>회원자료 다시 불러오기</button></div> : materials === null ? <p role="status" className="mt-4 text-sm">회원자료를 불러오고 있습니다…</p> : !materials.length ? <p className="mt-4 text-sm text-slate-500">아직 게시된 회원자료가 없습니다.</p> : <ul className="mt-4 divide-y">
          {materials.map(item => <li key={item.id} className="py-4">
            <Link className="block min-h-11 break-words font-medium text-emerald-800 underline" to={`${MATERIALS}&content=${encodeURIComponent(item.id)}`}>{item.title}</Link>
            {item.summary && <p className="mt-1 break-words text-sm leading-6 text-slate-600">{item.summary}</p>}
            <p className="mt-2 text-xs text-slate-500">게시 {formatDate(item.publishedAt)}</p>
          </li>)}
        </ul>}
      </section>

      <section id="carepharm-production" aria-labelledby="carepharm-production-heading" className="scroll-mt-24 rounded-xl border bg-white p-5">
        <h2 id="carepharm-production-heading" className="text-lg font-semibold">내 매장 안내물 제작</h2>
        <p className="my-3 text-sm leading-6 text-slate-600">회원자료를 가져온 뒤 내 자료함에서 편집하고 POP·블로그 제작에 활용하세요. 사본은 원본이 바뀌어도 자동으로 바뀌지 않습니다.</p>
        <p className="mb-4 text-sm leading-6 text-slate-600">정보 QR은 제품이나 매장에서 직접 만든 콘텐츠 등 지원되는 대상을 선택해 연결합니다.</p>
        <div className="flex flex-wrap gap-3">
          <Link className={actionClass} to="/store/library/contents">내 자료함 · 편집</Link>
          <Link className={actionClass} to="/store/marketing/pop-v2">POP 만들기</Link>
          <Link className={actionClass} to="/store/marketing/qr">정보 QR 관리</Link>
          <Link className={actionClass} to="/store/content/blog">블로그 만들기</Link>
        </div>
      </section>

      <section aria-labelledby="carepharm-cooperation-heading" className="rounded-xl border bg-slate-50 p-5">
        <h2 id="carepharm-cooperation-heading" className="text-lg font-semibold">협업체 소식 · 업무 문의</h2>
        <p className="my-3 text-sm leading-6 text-slate-600">운영 소식과 이용 안내는 협업체에서 확인하세요. 제품·공급조건·자료 활용에 관한 질문과 약국 운영 사례는 회원 커뮤니티에서 나눕니다.</p>
        <div className="flex flex-wrap gap-3">
          <a className={actionClass} href="https://carepharm.neture.co.kr/#news">CarePharm 공지·안내</a>
          {canEnterCommunity && <button type="button" className={actionClass} disabled={moving} onClick={() => void enterCommunity()}>{moving ? '이동 중…' : '회원 커뮤니티 · 문의'}</button>}
          <Link className={actionClass} to="/store/pharmacy/orders?business=carepharm">주문 내역</Link>
        </div>
        {entryError && <p role="alert" className="mt-4 text-sm text-red-700">{entryError}</p>}
      </section>
    </div>}
  </PharmacyPage>;
}
