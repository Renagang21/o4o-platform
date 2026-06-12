/**
 * HubEventOffersPage — K-Cosmetics 이벤트 오퍼 (StoreHub 진입점)
 *
 * WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1:
 *   공통 EventOffersHubList(@o4o/store-ui-core) 위임. service api(listActive) + 장바구니 담기 + accent 주입.
 *   (이벤트 오퍼 → 장바구니 → /store-hub/cart → checkout_orders(buyer). participate API 는 legacy 유지.)
 */

import { toast } from '@o4o/error-handling';
import { EventOffersHubList } from '@o4o/store-ui-core';
import { cosmeticsEventOfferApi, type EnrichedEventOffer } from '@/api/eventOffer';
import { storeCartApi } from '@/api/storeCart';
import { CART_SERVICE_KEY, buildEventOfferCartPayload } from '@/utils/eventOfferCart';

export function HubEventOffersPage() {
  return (
    <EventOffersHubList<EnrichedEventOffer>
      accent="pink"
      listActive={(page, limit) => cosmeticsEventOfferApi.listActive(page, limit)}
      addToCart={async (offer, qty) => {
        try {
          await storeCartApi.addItem(CART_SERVICE_KEY, buildEventOfferCartPayload(offer, qty));
          toast.success(`"${offer.productName}" 장바구니에 담았습니다.`);
        } catch (err: any) {
          toast.error(err?.response?.data?.error?.message || err?.message || '장바구니에 담지 못했습니다.');
          throw err;
        }
      }}
    />
  );
}

export default HubEventOffersPage;
