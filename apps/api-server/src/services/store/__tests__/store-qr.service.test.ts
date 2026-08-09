/**
 * store-qr.service 계약 테스트
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1
 *
 * 이 service 는 KPA · GlycoPharm · K-Cosmetics · Pharmacy-Hub **4개 서비스**가 공유한다.
 * 기존 controller 구현을 위임 전환하면서 계약이 바뀌지 않았음을 고정하는 것이 목적이다.
 * (배포 전 회귀 근거 — 이 축에는 그동안 테스트가 없었다.)
 *
 * DB 는 붙이지 않는다. dataSource.query / getRepository 만 흉내내어
 * **분기·상태코드·저장 값**을 검증한다.
 */

import {
  resolvePublicQrLanding,
  createStoreQrCode,
  updateStoreQrCode,
  deactivateStoreQrCode,
  type QrFailure,
} from '../store-qr.service';

// content_hub 사본 가드는 별도 WO 의 계약이다 — 여기서는 "그대로 통과"만 고정한다.
jest.mock('../../../routes/o4o-store/services/qr-content-hub-copy.service.js', () => ({
  ensureStoreCopyForPageTarget: jest.fn(async (_ds: unknown, input: any) => ({
    libraryItemId: input.libraryItemId ?? null,
    landingTargetId: input.landingTargetId ?? null,
  })),
}));

jest.mock('../../../routes/o4o-store/services/store-asset-derivation.service.js', () => ({
  recordDerivations: jest.fn(async () => undefined),
}));

jest.mock('../../../routes/platform/store-public/store-public-screen-set-resolve.js', () => ({
  resolveScreenSetSections: jest.fn(async () => null),
}));

jest.mock('../../../routes/platform/store-public/store-public-tablet-content-source.js', () => ({
  createStoreContentSourceAdapter: jest.fn(() => ({})),
}));

const ORG = '11111111-1111-4111-8111-111111111111';
const OTHER_ORG = '22222222-2222-4222-8222-222222222222';

/** 호출 순서대로 응답을 돌려주는 최소 DataSource 스텁. */
function makeDataSource(opts: {
  queryResults?: any[][];
  repo?: Partial<{
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  }>;
}) {
  const queue = [...(opts.queryResults ?? [])];
  const query = jest.fn(async () => (queue.length ? queue.shift() : []));
  const repo = {
    findOne: opts.repo?.findOne ?? jest.fn(async () => null),
    create: opts.repo?.create ?? jest.fn((v: any) => ({ ...v })),
    save: opts.repo?.save ?? jest.fn(async (v: any) => ({ id: 'saved-id', ...v })),
  };
  return {
    ds: { query, getRepository: () => repo } as any,
    query,
    repo,
  };
}

describe('createStoreQrCode', () => {
  it('필수값·landingType 을 검증한다', async () => {
    const { ds } = makeDataSource({});

    const noTitle = (await createStoreQrCode(ds, ORG, { slug: 's', landingType: 'link' })) as QrFailure;
    expect(noTitle.status).toBe(400);
    expect(noTitle.code).toBe('VALIDATION_ERROR');

    const noSlug = (await createStoreQrCode(ds, ORG, { title: 't', landingType: 'link' })) as QrFailure;
    expect(noSlug.status).toBe(400);

    const badType = (await createStoreQrCode(ds, ORG, {
      title: 't',
      slug: 's',
      landingType: 'whatever',
    })) as QrFailure;
    expect(badType.code).toBe('VALIDATION_ERROR');
  });

  it('slug 가 전역에서 충돌하면 409 를 낸다', async () => {
    const { ds } = makeDataSource({
      repo: { findOne: jest.fn(async () => ({ id: 'existing' })) },
    });

    const result = (await createStoreQrCode(ds, ORG, {
      title: '안내',
      slug: 'taken',
      landingType: 'link',
      landingTargetId: 'https://example.com',
    })) as QrFailure;

    expect(result.status).toBe(409);
    expect(result.code).toBe('SLUG_CONFLICT');
  });

  it('screen_set 은 매장 소유 origin=store 세트만 대상이다 (없으면 404)', async () => {
    // 첫 query = screen set 조회 → 빈 결과
    const { ds } = makeDataSource({ queryResults: [[]] });

    const result = (await createStoreQrCode(ds, ORG, {
      title: '코너',
      slug: 'corner',
      landingType: 'screen_set',
      landingTargetId: '33333333-3333-4333-8333-333333333333',
    })) as QrFailure;

    expect(result.status).toBe(404);
    expect(result.code).toBe('SCREEN_SET_NOT_FOUND');
  });

  it('같은 screen_set 에 QR 이 이미 있으면 새로 만들지 않고 재사용한다', async () => {
    const setId = '33333333-3333-4333-8333-333333333333';
    const existingQr = { id: 'qr-1', slug: 'existing-slug', landingType: 'screen_set' };
    const { ds, repo, query } = makeDataSource({
      queryResults: [[{ id: setId, name: '코너' }], []],
      repo: { findOne: jest.fn(async () => existingQr) },
    });

    const result = await createStoreQrCode(ds, ORG, {
      title: '코너',
      slug: 'new-slug',
      landingType: 'screen_set',
      landingTargetId: setId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.reused).toBe(true);
    expect(result.data.qr).toBe(existingQr);
    // 신규 저장이 일어나지 않아야 한다 (이름 변경 ≠ 주소 변경).
    expect(repo.save).not.toHaveBeenCalled();
    // public_qr_slug 는 기존 QR 의 slug 로 동기화된다 (SSOT = store_qr_codes).
    const syncCall = query.mock.calls.find((c: any[]) =>
      String(c[0]).includes('public_qr_slug'),
    );
    expect(syncCall?.[1]).toEqual([existingQr.slug, setId, ORG]);
  });

  it('product QR 은 승인·활성 offer 가 아니면 400 을 낸다', async () => {
    const { ds } = makeDataSource({ queryResults: [[]] }); // productCheck 없음

    const result = (await createStoreQrCode(ds, ORG, {
      title: '상품',
      slug: 'p1',
      landingType: 'product',
      productId: '44444444-4444-4444-8444-444444444444',
    })) as QrFailure;

    expect(result.status).toBe(400);
    expect(result.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('상담 CTA 는 page 타입에서만 켜진다', async () => {
    const { ds, repo } = makeDataSource({});

    await createStoreQrCode(ds, ORG, {
      title: '외부',
      slug: 'ext',
      landingType: 'link',
      landingTargetId: 'https://example.com',
      consultationCtaEnabled: true,
      consultationCtaLabel: '문의',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG,
        landingType: 'link',
        consultationCtaEnabled: false,
        consultationCtaLabel: null,
      }),
    );
  });
});

describe('updateStoreQrCode', () => {
  it('없는 QR 은 404', async () => {
    const { ds } = makeDataSource({ repo: { findOne: jest.fn(async () => null) } });
    const result = (await updateStoreQrCode(ds, ORG, 'x', { title: 'a' })) as QrFailure;
    expect(result.status).toBe(404);
    expect(result.code).toBe('QR_NOT_FOUND');
  });

  it('page 가 아닌 QR 에서는 CTA 를 켤 수 없고 라벨도 비운다', async () => {
    const item: any = {
      id: 'q1',
      landingType: 'link',
      consultationCtaEnabled: true,
      consultationCtaLabel: '기존',
    };
    const { ds } = makeDataSource({
      repo: {
        findOne: jest.fn(async () => item),
        save: jest.fn(async (v: any) => v),
      },
    });

    const result = await updateStoreQrCode(ds, ORG, 'q1', {
      consultationCtaEnabled: true,
      consultationCtaLabel: '새 라벨',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.consultationCtaEnabled).toBe(false);
    expect(result.data.consultationCtaLabel).toBeNull();
  });

  it('slug 를 이미 쓰이는 값으로 바꾸면 409', async () => {
    const item: any = { id: 'q1', slug: 'old', landingType: 'page' };
    const findOne = jest
      .fn()
      .mockResolvedValueOnce(item) // 대상 조회
      .mockResolvedValueOnce({ id: 'other' }); // slug 충돌
    const { ds } = makeDataSource({ repo: { findOne } });

    const result = (await updateStoreQrCode(ds, ORG, 'q1', { slug: 'taken' })) as QrFailure;
    expect(result.status).toBe(409);
    expect(result.code).toBe('SLUG_CONFLICT');
  });
});

describe('deactivateStoreQrCode', () => {
  it('물리 삭제가 아니라 is_active=false 로 내린다', async () => {
    const item: any = { id: 'q1', isActive: true };
    const save = jest.fn(async (v: any) => v);
    const { ds } = makeDataSource({
      repo: { findOne: jest.fn(async () => item), save },
    });

    const result = await deactivateStoreQrCode(ds, ORG, 'q1');

    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('다른 매장 QR 은 404 (존재 여부를 흘리지 않는다)', async () => {
    const { ds, repo } = makeDataSource({ repo: { findOne: jest.fn(async () => null) } });
    const result = (await deactivateStoreQrCode(ds, OTHER_ORG, 'q1')) as QrFailure;
    expect(result.status).toBe(404);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'q1', organizationId: OTHER_ORG },
    });
  });
});

describe('resolvePublicQrLanding', () => {
  const scan = { deviceType: 'mobile', userAgent: 'ua', referer: null, ipHash: 'h' };

  it('없는 slug 는 404', async () => {
    const { ds } = makeDataSource({ queryResults: [[]] });
    const result = (await resolvePublicQrLanding(ds, 'nope', 'kpa', scan)) as QrFailure;
    expect(result.status).toBe(404);
    expect(result.code).toBe('QR_NOT_FOUND');
  });

  it('비활성 일반 QR 은 404', async () => {
    const { ds } = makeDataSource({
      queryResults: [[{ id: 'q', landingType: 'page', isActive: false }]],
    });
    const result = (await resolvePublicQrLanding(ds, 's', 'kpa', scan)) as QrFailure;
    expect(result.status).toBe(404);
  });

  it('비활성 screen_set QR 은 410 + 종료 안내 (slug 는 유지되어 복원 가능)', async () => {
    const { ds } = makeDataSource({
      queryResults: [[{ id: 'q', landingType: 'screen_set', isActive: false }]],
    });
    const result = (await resolvePublicQrLanding(ds, 's', 'kpa', scan)) as QrFailure;
    expect(result.status).toBe(410);
    expect(result.code).toBe('SCREEN_SET_INACTIVE');
  });

  it('활성 link QR 은 스캔 이벤트를 기록하고 랜딩 데이터를 돌려준다', async () => {
    const { ds, query } = makeDataSource({
      queryResults: [
        [{ id: 'q', landingType: 'link', landingTargetId: 'https://x', isActive: true, organizationId: ORG, slug: 's' }],
        [], // scan insert
        [{ slug: 'store-slug' }], // platform_store_slugs
      ],
    });

    const result = await resolvePublicQrLanding(ds, 's', 'pharmacy-hub', scan);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.storeSlug).toBe('store-slug');
    const insert = query.mock.calls.find((c: any[]) =>
      String(c[0]).includes('store_qr_scan_events'),
    );
    // 원문 IP 가 아니라 해시만 저장한다.
    expect(insert?.[1]).toContain('h');
  });

  // ── WO-O4O-STORE-QR-SCAN-EVENT-INSERT-TYPE-FIX-V1 회귀 가드 ──
  //
  // 이 INSERT 는 fire-and-forget 이라 실패해도 랜딩 응답이 200 으로 나간다.
  // 그래서 타입 결함(`inconsistent types deduced for parameter $6`)이 프로덕션에서
  // **한 번도 드러나지 않은 채** 전 서비스 스캔 집계를 0 으로 만들었다
  // (store_qr_scan_events 전체 0건 · 로그로 확인).
  // 응답만 보는 테스트로는 이 회귀를 잡을 수 없으므로 SQL 자체를 고정한다.

  function insertCallOf(query: jest.Mock) {
    return query.mock.calls.find((c: any[]) => String(c[0]).includes('INSERT INTO store_qr_scan_events'));
  }

  function landingDataSource() {
    return makeDataSource({
      queryResults: [
        [{ id: 'q', landingType: 'link', landingTargetId: 'https://x', isActive: true, organizationId: ORG, slug: 's' }],
        [],
        [{ slug: 'store-slug' }],
      ],
    });
  }

  it('스캔 INSERT 는 ip_hash 파라미터를 두 자리 모두 명시 캐스팅한다', async () => {
    const { ds, query } = landingDataSource();
    await resolvePublicQrLanding(ds, 's', 'kpa', scan);

    const sql = String(insertCallOf(query)?.[0] ?? '');
    // 값 목록과 중복 방지 비교 양쪽 — 한쪽만 캐스팅하면 타입이 다시 갈린다.
    expect(sql).toContain('$6::text');
    expect(sql).toMatch(/ip_hash\s*=\s*\$6::text/);
    // 캐스팅 없는 raw `$6` 이 남아 있으면 회귀다.
    expect(sql).not.toMatch(/\$6(?!::text)/);
  });

  it('스캔 INSERT 는 5초 중복 방지 조건을 유지한다', async () => {
    const { ds, query } = landingDataSource();
    await resolvePublicQrLanding(ds, 's', 'kpa', scan);

    const sql = String(insertCallOf(query)?.[0] ?? '');
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toMatch(/created_at\s*>\s*NOW\(\)\s*-\s*INTERVAL\s*'5 seconds'/);
    expect(sql).toMatch(/qr_code_id\s*=\s*\$2/);
  });

  it('스캔 INSERT 파라미터는 (org, qr, device, ua, referer, ipHash) 순서다', async () => {
    const { ds, query } = landingDataSource();
    await resolvePublicQrLanding(ds, 's', 'kpa', {
      deviceType: 'tablet',
      userAgent: 'UA/1.0',
      referer: 'https://ref',
      ipHash: 'hashed-ip',
    });

    expect(insertCallOf(query)?.[1]).toEqual([ORG, 'q', 'tablet', 'UA/1.0', 'https://ref', 'hashed-ip']);
  });

  it('스캔 INSERT 가 실패해도 랜딩 응답은 정상이다 (fire-and-forget)', async () => {
    const { ds } = landingDataSource();
    const original = ds.query;
    // INSERT 만 실패시키고 나머지 조회는 그대로 둔다.
    ds.query = jest.fn(async (sql: string, params?: unknown[]) => {
      if (String(sql).includes('INSERT INTO store_qr_scan_events')) {
        throw new Error('inconsistent types deduced for parameter $6');
      }
      return original(sql, params);
    });

    const result = await resolvePublicQrLanding(ds, 's', 'kpa', scan);

    expect(result.ok).toBe(true);
  });
});
