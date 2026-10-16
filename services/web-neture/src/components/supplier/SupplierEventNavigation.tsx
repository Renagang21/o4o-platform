import { NavLink, useSearchParams } from 'react-router-dom';

/** 대상별 이벤트 원장과 승인은 유지하고, 공급자에게는 한 업무 안에서 진입을 제공한다. */
export default function SupplierEventNavigation() {
  const [params] = useSearchParams();
  const offer = params.get('offer') ?? params.get('supplierProductId');
  const targets = [
    { path: '/supplier/event-offers', label: '서비스 이벤트', productKey: 'supplierProductId' },
    { path: '/supplier/semi-franchise-events', label: '약국 협력사업 이벤트', productKey: 'offer' },
  ];
  return <nav aria-label="이벤트 대상" className="mb-5 flex flex-wrap gap-2 text-sm">
    {targets.map(t => {
      const query = new URLSearchParams();
      if (offer) query.set(t.productKey, offer);
      if (params.get('returnTo')) query.set('returnTo', params.get('returnTo')!);
      return <NavLink key={t.path} to={`${t.path}?${query}`} className={({ isActive }) => `rounded-lg border px-3 py-2 ${isActive ? 'bg-purple-700 text-white' : 'bg-white text-purple-700'}`}>{t.label}</NavLink>;
    })}
  </nav>;
}
