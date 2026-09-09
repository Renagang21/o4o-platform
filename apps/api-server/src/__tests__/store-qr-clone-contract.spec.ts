/**
 * WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §8·§18
 *
 * "같은 콘텐츠로 QR 추가"(clone) 계약을 회귀 고정한다.
 *
 * 이 동선이 없으면 매장은 같은 QR 이미지를 복사해 여러 곳에 붙이고,
 * 그러면 위치별 스캔 귀속이 **영구히** 불가능해진다(DESIGN §9-2).
 */
import { cloneStoreQrCode } from '../services/store/store-qr.service.js';

const ORG = '9c87f46b-57a1-4afe-80bd-60782c49ce96';
const SRC_ID = '16c33e61-20b8-4027-9a64-5c122d271a17';

const SOURCE = {
  id: SRC_ID,
  organizationId: ORG,
  title: '혈당관리 안내',
  description: '설명',
  slug: 'blood-sugar-guide',
  landingType: 'page',
  landingTargetId: 'target-1',
  libraryItemId: 'lib-1',
  contentSource: 'STORE_DIRECT',
  consultationCtaEnabled: true,
  consultationCtaLabel: '상담 요청',
  isActive: true,
};

/** repository stub — findOne 은 호출 순서로 (source, slug 충돌) 을 구분한다. */
function makeDs(opts: { source?: any; slugTaken?: string[] } = {}) {
  const saved: any[] = [];
  const repo = {
    findOne: jest.fn(async ({ where }: any) => {
      if (where?.id) return where.id === SRC_ID && where.organizationId === ORG ? (opts.source ?? SOURCE) : null;
      if (where?.slug) return (opts.slugTaken ?? []).includes(where.slug) ? { id: 'clash' } : null;
      return null;
    }),
    create: jest.fn((x: any) => x),
    save: jest.fn(async (x: any) => {
      const row = { ...x, id: `new-${saved.length + 1}` };
      saved.push(row);
      return row;
    }),
  };
  const ds: any = { saved, repo, getRepository: () => repo, query: jest.fn(async () => []) };
  return ds;
}

describe('§8 clone — Target 축을 그대로 복제한다', () => {
  it('landing_type · target · library · contentSource · CTA 를 복제한다', async () => {
    const ds = makeDs();
    const r = await cloneStoreQrCode(ds, ORG, SRC_ID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.qr).toMatchObject({
      organizationId: ORG,
      landingType: 'page',
      landingTargetId: 'target-1',
      libraryItemId: 'lib-1',
      contentSource: 'STORE_DIRECT',
      consultationCtaEnabled: true,
      consultationCtaLabel: '상담 요청',
      isActive: true,
    });
  });

  it('slug 는 새로 발급한다 — 원본과 다르다 (주소 불변 원칙: 기존 QR 은 그대로)', async () => {
    const ds = makeDs();
    const r = await cloneStoreQrCode(ds, ORG, SRC_ID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.qr.slug).not.toBe(SOURCE.slug);
    expect(r.data.qr.slug.startsWith('blood-sugar-guide-')).toBe(true);
  });

  it('slug 충돌 시 다른 후보로 재시도한다', async () => {
    const ds = makeDs({ slugTaken: [] });
    // 첫 후보를 항상 충돌시키고 두 번째를 허용한다.
    let first = true;
    ds.repo.findOne = jest.fn(async ({ where }: any) => {
      if (where?.id) return SOURCE;
      if (where?.slug) {
        if (first) { first = false; return { id: 'clash' }; }
        return null;
      }
      return null;
    });
    const r = await cloneStoreQrCode(ds, ORG, SRC_ID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.qr.slug).toContain('-1');
  });

  it('제목은 기본값으로 원본 + (추가), 지정하면 그 값', async () => {
    const ds = makeDs();
    const a = await cloneStoreQrCode(ds, ORG, SRC_ID);
    expect(a.ok && a.data.qr.title).toBe('혈당관리 안내 (추가)');
    const b = await cloneStoreQrCode(ds, ORG, SRC_ID, { title: '  상담대용 QR ' });
    expect(b.ok && b.data.qr.title).toBe('상담대용 QR');
  });

  it('스캔 이력·배치는 복제하지 않는다 (새 인스턴스는 0에서 시작)', async () => {
    const ds = makeDs();
    await cloneStoreQrCode(ds, ORG, SRC_ID);
    const sqls = (ds.query.mock.calls as any[]).map((c) => String(c[0]));
    expect(sqls.some((s) => /store_qr_scan_events/i.test(s))).toBe(false);
    expect(sqls.some((s) => /store_qr_placements/i.test(s))).toBe(false);
  });

  it('screen_set QR 은 복제하지 않는다 — 화면당 QR 1개 UNIQUE 를 지킨다', async () => {
    const ds = makeDs({ source: { ...SOURCE, landingType: 'screen_set' } });
    const r = await cloneStoreQrCode(ds, ORG, SRC_ID);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('SCREEN_SET_QR_NOT_CLONEABLE');
    expect(ds.repo.save).not.toHaveBeenCalled();
  });

  it('타 조직 QR 은 404 이고 아무것도 만들지 않는다', async () => {
    const ds = makeDs();
    const r = await cloneStoreQrCode(ds, 'other-org', SRC_ID);
    expect(r.ok).toBe(false);
    expect(ds.repo.save).not.toHaveBeenCalled();
  });
});
