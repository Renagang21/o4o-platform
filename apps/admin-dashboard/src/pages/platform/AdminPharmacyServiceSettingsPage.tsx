import { AdminPharmacyServiceSettingsPage as Settings } from "@o4o/operator-core-ui/modules/pharmacy-management";
import AdminCooperativePanel from "./AdminCooperativePanel";
const federation = <AdminCooperativePanel />;
/**
 * 매장별 상담 화면 배치(일반/대형) 설정은 2026-11-13 제거했다 — 매장 상담은 경영자가 등록하는 태블릿 목록으로 바뀌어
 * 그 값을 읽는 화면이 없다(WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1 3단계). 운영 DB 에 남은 값은 건드리지 않는다.
 */
export default function AdminPharmacyServiceSettingsPage() {
  return <Settings federationPanel={federation} />;
}
