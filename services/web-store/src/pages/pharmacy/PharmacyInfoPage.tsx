import { PharmacyBusinessInfo } from '@o4o/account-ui';
import { AddressSearch } from '@o4o/ui';
import { getPharmacyInfo, updatePharmacyInfo } from '../../api/pharmacyInfo';
import { colors, shadows, borderRadius } from '../../styles/theme';

/** Service API, theme and route guards stay in this service. */
export function PharmacyInfoPage() {
  return <PharmacyBusinessInfo loadInfo={getPharmacyInfo} saveInfo={updatePharmacyInfo}
    theme={{ colors, shadows, borderRadius }} AddressSearch={AddressSearch}
    renderUnavailable={(state, retry, error) => <section className="mx-auto max-w-3xl space-y-4 p-6" aria-label="매장 정보">
      <h1 className="text-xl font-semibold">매장 정보</h1>
      <p role="alert">{(error as { code?: string } | null)?.code === 'PHARMACIST_QUALIFICATION_REQUIRED'
        ? '가입 정보의 약사 자격 연결을 확인해야 합니다. 운영자에게 연결 상태 확인을 요청해 주세요.'
        : state === 'missing' ? '연결된 매장 정보를 확인하지 못했습니다. 가입 승인 상태를 확인해 주세요.'
          : '매장 정보를 불러오지 못했습니다. 다시 시도해 주세요.'}</p>
      <button type="button" onClick={retry} className="min-h-11 rounded border bg-white px-4">다시 시도</button>
      <a href="/contact" className="ml-3 inline-flex min-h-11 items-center underline">운영자 문의</a>
    </section>} />;
}
