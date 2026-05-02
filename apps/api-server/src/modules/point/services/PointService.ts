/**
 * PointService — O4O Platform 공통 보상 진입점 (facade)
 *
 * WO-O4O-POINT-CORE-SEPARATION-V1
 *
 * 목적:
 *   기존 LMS 전용 CreditService를 플랫폼 공통 인터페이스로 승격하기 위한 1차 단계.
 *   본 클래스는 호출 의미 변경 없이 CreditService에 위임만 한다.
 *
 *   QuizService 등 feature 모듈은 이 facade만 호출하고, CreditService 직접 의존을
 *   제거한다. 향후 spend / wallet / supplier-cost 확장은 본 facade의 인터페이스를
 *   통해 점진적으로 도입된다.
 *
 * 설계 결정:
 *   - referenceKey, description은 required로 유지 — IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1
 *     의 dedup/감사 정책을 약화시키지 않기 위함. WO 샘플의 optional 시그니처를 그대로
 *     채택하면 dedup 보장이 무너짐.
 *   - sourceType은 CreditSourceType enum을 그대로 노출. 향후 PointSourceType으로
 *     리네이밍 시 enum 값(문자열)은 보존되므로 별도 마이그레이션 불필요.
 *   - 반환 타입은 CreditTransaction | null — 호출자가 dedup 결과를 그대로 검사할 수 있음.
 *
 * 이번 WO에서 하지 않는 것 (예고):
 *   - spend / refund / adjust
 *   - wallet 다중 분리 (서비스별 잔액)
 *   - supplier 비용 부담 추적
 *   - 운영자 수동 지급 API
 *   - DB 명명 리네이밍 (credit_balances → point_wallets 등)
 */

import type { CreditSourceType, CreditTransaction } from '../../credit/entities/CreditTransaction.js';
import { CreditService } from '../../credit/services/CreditService.js';

export interface GrantPointParams {
  userId: string;
  amount: number;
  sourceType: CreditSourceType;
  sourceId?: string;
  /** 중복 지급 방지 키. 동일 userId + 보상 이벤트에 결정성 있게 생성해야 함. */
  referenceKey: string;
  description: string;
}

export class PointService {
  private static instance: PointService;

  static getInstance(): PointService {
    if (!PointService.instance) {
      PointService.instance = new PointService();
    }
    return PointService.instance;
  }

  /**
   * 사용자에게 포인트 지급. 동일 referenceKey가 이미 존재하면 null 반환(dedup).
   *
   * 현재 구현: CreditService.earnCredit()로 위임 — 동작·DB·로그 모두 기존과 동일.
   */
  async grantPoint(params: GrantPointParams): Promise<CreditTransaction | null> {
    return CreditService.getInstance().earnCredit(
      params.userId,
      params.amount,
      params.sourceType,
      params.sourceId,
      params.referenceKey,
      params.description,
    );
  }
}
