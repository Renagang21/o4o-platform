import { createPublicTabletClient } from "@o4o/store-ui-core/api/tablet";
export {
  TABLET_DEVICE_STORAGE_KEY,
  TABLET_DEVICE_TOKEN_HEADER,
} from "@o4o/store-ui-core/api/tablet";
export type {
  DeviceHeartbeat,
  InterestStatusDetail,
  InterestSubmitResult,
  PairingLookupResult,
  StoredTabletDevice,
  TabletDisplaySettings,
  TabletProduct,
} from "@o4o/store-ui-core/api/tablet";

/**
 * Tablet API Client — Public (no auth)
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 * WO-STORE-SLUG-UNIFICATION-V1: unified /api/v1/stores namespace
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Interest-based consultation flow
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request functions
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1: fetchTabletIdle 추가
 *
 * Calls /api/v1/stores/:slug/tablet/* endpoints directly.
 * No authentication required for tablet kiosk mode.
 */

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return `${base}/api/v1/stores`;
}

export const {
  fetchTabletProducts,
  submitTabletInterest,
  submitQrPageConsultation,
  checkTabletInterestStatus,
  fetchTabletIdle,
  fetchTabletSettings,
  fetchTabletScreen,
  loadStoredTabletDevice,
  saveStoredTabletDevice,
  clearStoredTabletDevice,
  pairingLookup,
  pairingClaim,
  deviceHeartbeat,
} = createPublicTabletClient({
  getApiBase,
  fetch: (input, init) => fetch(input, init),
});
