/**
 * WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1
 *
 * 공용 fulfillment 원장의 서비스 경계 SSOT 검증.
 * 핵심 계약은 **"미표기 주문 = neture"** 이며, 이는 `COALESCE(..., 'neture')` 로 표현된다.
 */
import {
  NETURE_FULFILLMENT_SERVICE_KEY,
  netureOrderServiceScopeSql,
  checkoutOrderServiceScopeSql,
} from '../fulfillment-service-scope.js';

describe('NETURE_FULFILLMENT_SERVICE_KEY', () => {
  it("레거시 기본값은 'neture' 다", () => {
    expect(NETURE_FULFILLMENT_SERVICE_KEY).toBe('neture');
  });
});

describe('netureOrderServiceScopeSql — neture_orders 축', () => {
  it('컬럼(service_key) 을 쓴다 — jsonb 추출이 아니다', () => {
    const sql = netureOrderServiceScopeSql('o', '$2');
    expect(sql).toContain('o.service_key');
    expect(sql).not.toContain('metadata');
  });

  it("미표기(NULL) 를 'neture' 로 해석한다 (레거시 호환)", () => {
    expect(netureOrderServiceScopeSql('o', '$2')).toBe("COALESCE(o.service_key, 'neture') = $2");
  });

  it('alias 와 파라미터 자리를 그대로 반영한다', () => {
    expect(netureOrderServiceScopeSql('no2', '$5')).toBe("COALESCE(no2.service_key, 'neture') = $5");
  });

  it('값을 SQL 에 직접 끼워넣지 않는다 — 비교 대상은 항상 바인딩 파라미터', () => {
    const sql = netureOrderServiceScopeSql('o', '$2');
    const bind = sql.split('=')[1].trim();
    expect(bind).toMatch(/^\$\d+$/);
  });
});

describe('checkoutOrderServiceScopeSql — checkout_orders 축', () => {
  it("metadata.serviceKey 를 쓴다 (checkout_orders 기존 규약)", () => {
    const sql = checkoutOrderServiceScopeSql('co', '$2');
    expect(sql).toContain("co.metadata->>'serviceKey'");
  });

  it("미표기를 'neture' 로 해석한다", () => {
    expect(checkoutOrderServiceScopeSql('co', '$2')).toBe(
      "COALESCE(co.metadata->>'serviceKey', 'neture') = $2",
    );
  });

  it('비교 대상은 바인딩 파라미터다', () => {
    const bind = checkoutOrderServiceScopeSql('co', '$3').split('=').pop()!.trim();
    expect(bind).toBe('$3');
  });
});

describe('두 축의 계약 일관성', () => {
  it('같은 기본값 규칙을 쓴다 — 소스가 달라도 미표기는 neture', () => {
    expect(netureOrderServiceScopeSql('o', '$2')).toContain("'neture'");
    expect(checkoutOrderServiceScopeSql('co', '$2')).toContain("'neture'");
  });

  it('Pharmacy-Hub 로 조회하면 두 축 모두 pharmacy-hub 만 매칭하는 형태다', () => {
    // 실제 값 비교는 DB 가 하지만, 조건이 파라미터 1개에만 의존함을 고정한다
    for (const sql of [netureOrderServiceScopeSql('o', '$2'), checkoutOrderServiceScopeSql('co', '$2')]) {
      expect((sql.match(/\$\d+/g) ?? []).length).toBe(1);
    }
  });
});
