import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { neturePharmacyApi } from '../../api/neturePharmacy';
import { PharmacyPage } from './shared';

/** Direct URLs are checked against the selected pharmacy's server-owned business memberships. */
export default function CarePharmToolsPage() {
  const { organizationId } = useUnifiedStore();
  return <Tools key={organizationId ?? 'none'} organizationId={organizationId} />;
}
function Tools({ organizationId }: { organizationId: string | null }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!organizationId) return;
    let alive = true;
    setAllowed(null); setError('');
    neturePharmacyApi.getStoreContext().then(context => {
      if (context.organizationId !== organizationId) throw new Error('Store scope mismatch');
      if (alive) setAllowed(context.semiFranchiseKeys.includes('carepharm'));
    }).catch(() => { if (alive) setError('만성질환관리 이용 상태를 확인하지 못했습니다.'); });
    return () => { alive = false; };
  }, [organizationId, retry]);
  return <PharmacyPage title="만성질환관리" description="이 약국이 가입·승인받은 만성질환관리 서비스의 업무 공간입니다.">
    {!organizationId ? <p>약국을 먼저 선택해 주세요.</p> : error ? <><p role="alert">{error}</p><button onClick={() => setRetry(n => n + 1)}>다시 확인</button></> : allowed === null ? <p role="status">이용 상태를 확인하고 있습니다…</p> : !allowed ? <div><p>만성질환관리 서비스 가입 승인 후 이용할 수 있습니다.</p><Link to="/store/pharmacy/semi-franchises">협력사업 서비스 · 가입 상태 확인</Link></div> : <div className="space-y-6">
      <nav aria-label="만성질환관리 약국 업무" className="flex flex-wrap gap-4 text-emerald-700">
        <Link to="/store/pharmacy/supply?source=sf%3Acarepharm">공급 상품</Link>
        <Link to="/store/pharmacy/contents?business=carepharm">사업 자료 가져오기</Link>
        <Link to="/store/pharmacy/orders?business=carepharm">주문 내역</Link>
      </nav>
      <section className="rounded-xl border p-5"><h2 className="text-lg font-semibold">CGM 서비스</h2><p className="mt-3 text-gray-600">서비스 이용을 준비하고 있습니다. 이용 안내가 제공되면 이곳에서 확인할 수 있습니다.</p></section>
      <section className="rounded-xl border p-5"><h2 className="text-lg font-semibold">무료혈당기</h2><p className="mt-3 text-gray-600">소비자가 전달한 코드로 혈당기를 제공하는 업무입니다. 현재 접수 준비 중입니다.</p></section>
    </div>}
  </PharmacyPage>;
}
