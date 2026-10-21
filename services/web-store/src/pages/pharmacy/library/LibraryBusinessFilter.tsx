import { StoreBusinessTabs } from '../../neture-pharmacy/StoreBusinessTabs';
import { useStoreBusinesses } from '../../neture-pharmacy/useStoreBusinesses';
import { useUnifiedStore } from '../../../contexts/StoreContext';

type Props = Readonly<{ value: string; onChange: (value: string) => void }>;

/** The filter applies to owned snapshots; current source access is checked separately. */
export function LibraryBusinessFilter(props: Props) {
  const { effectiveServiceKey } = useUnifiedStore();
  if (effectiveServiceKey !== 'kpa-society') return null;
  return <PharmacyBusinessFilter {...props} />;
}
function PharmacyBusinessFilter({ value, onChange }: Props) {
  const businesses = useStoreBusinesses();
  return <StoreBusinessTabs businesses={businesses} history value={value} onChange={onChange} />;
}
