import { PharmacyBusinessInfo } from '@o4o/account-ui';
import { AddressSearch } from '@o4o/ui';
import { getPharmacyInfo, updatePharmacyInfo } from '../../api/pharmacyInfo';
import { colors, shadows, borderRadius } from '../../styles/theme';

/** Service API, theme and route guards stay in this service. */
export function PharmacyInfoPage() {
  return <PharmacyBusinessInfo loadInfo={getPharmacyInfo} saveInfo={updatePharmacyInfo}
    theme={{ colors, shadows, borderRadius }} AddressSearch={AddressSearch} />;
}
