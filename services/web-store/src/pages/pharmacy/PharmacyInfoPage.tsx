import { PharmacyBusinessInfo } from '@o4o/account-ui';
import { AddressSearch } from '@o4o/ui';
import { useCallback, useState } from 'react';
import type { PharmacyInfoData } from '../../api/pharmacyInfo';
import { getPharmacyInfo, updatePharmacyInfo } from '../../api/pharmacyInfo';
import { colors, shadows, borderRadius } from '../../styles/theme';

/** Service API, theme and route guards stay in this service. */
export function PharmacyInfoPage() {
  const [retry, setRetry] = useState(0);
  const [example, setExample] = useState<PharmacyInfoData['demoExample']>();
  const load = useCallback(async () => {
    const data = await getPharmacyInfo();
    setExample(data?.demoExample);
    return data;
  }, []);
  return <>
    <h1 className="mb-3 text-xl font-semibold">매장 정보</h1>
    {example && <section aria-label="Demo 약국 가상 정보" className="mb-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
      <h2 className="font-semibold">Demo 약국 가상 정보 · 체험용</h2>
      <p>실제 매장 등록·면허 승인·증빙을 대체하지 않습니다. 아래 예시는 저장되는 매장 정보와 별도입니다.</p>
      <dl className="grid gap-2 sm:grid-cols-2">{Object.entries({ 약국명: example.name, 대표자: example.representativeName, 사업자번호: example.businessNumber, 면허번호: example.licenseNumber, 주소: example.address, 업태: example.businessType, 종목: example.businessItem }).map(([label,value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd>{value}</dd></div>)}</dl>
      <a href="/samples/demo-pharmacy-business.svg" download className="inline-flex min-h-11 items-center underline">체험용 사업자등록증 예시 받기</a>
    </section>}
    <PharmacyBusinessInfo key={retry} loadInfo={load} saveInfo={updatePharmacyInfo}
      unavailable={<section role="alert" className="space-y-3 rounded-lg border p-4"><p>연결된 매장 정보를 확인하지 못했습니다. 별도 매장 신청 없이 회원 등록 상태와 매장 연결을 확인하시기 바랍니다.</p><button type="button" className="min-h-11 rounded-lg border px-3" onClick={() => { setExample(undefined); setRetry(value => value + 1); }}>매장 정보 다시 확인</button></section>}
      theme={{ colors, shadows, borderRadius }} AddressSearch={AddressSearch} />
  </>;
}
