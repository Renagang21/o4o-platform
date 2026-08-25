/**
 * K-Cosmetics Payment Controller — 은퇴 (410)
 *
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
 *
 *   원 출처: `WO-O4O-COSMETICS-PAYMENTCORE-INTEGRATION-V1` — 소비자가 매장을 상대로 O4O 안에서
 *   결제하는 **매장 소비자 결제(STORE_SALE_PAYMENT)** 경로였다.
 *   `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §2-3 · §2-5 · §3 위반.
 *
 *   `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1` 이 `POST /prepare` ·
 *   `POST /confirm` 을 410 으로 차단하면서 그 아래 PaymentCore/Toss 로직을
 *   `no-unreachable` 로 보존해 두었으나, 본 WO 에서 **도달 불가능한 producer 를 제거**한다.
 *
 *   `GET /order/:orderId` (Toss widget 렌더링용 결제정보 조회) 도 함께 은퇴한다.
 *   prepare/confirm 이 없는 이상 결제창을 띄울 대상이 없고,
 *   프론트엔드 호출자는 repo 전수 조사 결과 **0건**이다.
 *
 *   보호 대상(미변경): Pharmacy-Hub B2B 결제(`/pharmacy-hub/store-owner/payments/*`),
 *   Neture B2B 결제(`/neture/b2b/payments/*`) — 매장이 **구매자**인 B2B 축.
 *
 *   경로 자체는 404 가 아닌 **410 (Gone)** 으로 남겨 은퇴 사실을 명시한다.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

const RETIRED = {
  success: false,
  code: 'STORE_SALE_PAYMENT_DEPRECATED',
  message:
    '매장 소비자 결제는 O4O에서 제공하지 않습니다. 현장 결제는 매장의 POS, 온라인 판매는 외부 판매채널을 이용해 주세요.',
} as const;

export function createCosmeticsPaymentController(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _dataSource: DataSource,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _requireAuth: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  const gone = (_req: Request, res: Response) => res.status(410).json(RETIRED);

  router.post('/prepare', gone);
  router.post('/confirm', gone);
  router.get('/order/:orderId', gone);

  return router;
}
