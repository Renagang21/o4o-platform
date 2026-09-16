/**
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 — Supplier Workspace 재정렬 · 제공 경로 계약 테스트
 *
 * 검증 축 (WO §15 · §16):
 *   1. Supplier → Service Operator 대상 서비스 = canonical catalog 파생 (kpa-branch / cafe24-b2b / neture 임의 포함 0)
 *   2. cms 물리 serviceKey 매핑 (kpa-society → 'kpa', 그 외 canonical 그대로)
 *   3. Supplier → Store Hub = `supplier-library` Hub source adapter (is_public 재사용 · store workspace 없는 서비스는 빈 응답)
 *   4. 제공(handoff) 수신 계약 재사용 — KPA 는 cms + kpa_approval_requests 2 INSERT, 그 외 서비스는 cms 1 INSERT
 *   5. 라이브러리 원장 → cms type 매핑
 *
 * 순수 단위 테스트 — DB 접속 없음 (dataSource / queryRunner mock).
 */
import { HUB_SOURCE_DOMAIN_LABELS } from '@o4o/types';
import { O4O_SERVICES } from '../config/service-catalog.js';
import {
  listSupplierContentHandoffTargets,
  getSupplierContentHandoffTarget,
  isSupplierContentHandoffTarget,
  toCmsServiceKey,
} from '../modules/neture/constants/supplier-content-handoff-targets.js';
import { toCmsContentType } from '../modules/neture/services/supplier-library-handoff.service.js';
import { HubContentQueryService } from '../modules/hub-content/hub-content.service.js';
import { SupplierContentService } from '../routes/kpa/services/supplier-content.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. 제공 대상 서비스 = canonical catalog
// ─────────────────────────────────────────────────────────────────────────────

describe('Supplier → Service Operator handoff targets (WO §10)', () => {
  const targets = listSupplierContentHandoffTargets();
  const keys = targets.map((t) => t.key);

  it('operatorWorkspaceEnabled + standard workspace 인 서비스만 포함한다', () => {
    for (const t of targets) {
      const svc = O4O_SERVICES.find((s) => s.key === t.key);
      expect(svc).toBeDefined();
      expect(svc!.workspace.operatorWorkspaceEnabled).toBe(true);
      expect(svc!.workspace.workspaceMode).toBe('standard');
    }
  });

  it('kpa-society · k-cosmetics · pharmacy-hub 가 대상이다', () => {
    expect(keys).toEqual(expect.arrayContaining(['kpa-society', 'k-cosmetics', 'pharmacy-hub']));
  });

  it('neture(special) · kpa-branch(none) · cafe24-b2b(undecided) 는 임의 포함되지 않는다', () => {
    expect(keys).not.toContain('neture');
    expect(keys).not.toContain('kpa-branch');
    expect(keys).not.toContain('cafe24-b2b');
    expect(getSupplierContentHandoffTarget('kpa-branch')).toBeUndefined();
    expect(getSupplierContentHandoffTarget('cafe24-b2b')).toBeUndefined();
    expect(getSupplierContentHandoffTarget('neture')).toBeUndefined();
  });

  it('카탈로그에 없는 키 · 빈 키는 대상이 아니다', () => {
    expect(getSupplierContentHandoffTarget('')).toBeUndefined();
    expect(getSupplierContentHandoffTarget('kpa')).toBeUndefined(); // 물리 cms 키는 canonical 키가 아니다
    expect(isSupplierContentHandoffTarget(undefined)).toBe(false);
  });

  it('cms 물리 serviceKey: kpa-society → kpa, 그 외 canonical 그대로', () => {
    expect(toCmsServiceKey('kpa-society')).toBe('kpa');
    expect(toCmsServiceKey('k-cosmetics')).toBe('k-cosmetics');
    expect(toCmsServiceKey('pharmacy-hub')).toBe('pharmacy-hub');
    expect(getSupplierContentHandoffTarget('kpa-society')!.cmsServiceKey).toBe('kpa');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Supplier → Store Hub = supplier-library adapter
// ─────────────────────────────────────────────────────────────────────────────

describe('Supplier → Store Hub via supplier-library source adapter (WO §8)', () => {
  const row = {
    id: 'item-1',
    title: '제품 안내서',
    description: '설명',
    file_url: 'https://cdn.example/a.png',
    file_name: 'a.png',
    mime_type: 'image/png',
    category: '안내',
    content_type: 'media',
    supplier_id: 'sup-1',
    created_at: new Date('2026-09-16T00:00:00Z'),
    supplier_name: '네뚜레 공급사',
  };

  function makeService(rows: any[] = [row]) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('COUNT(*)')) return [{ total: rows.length }];
      return rows;
    });
    return { service: new HubContentQueryService({ query } as any), query };
  }

  it('HubSourceDomain 라벨에 supplier-library 가 등록되어 있다', () => {
    expect(HUB_SOURCE_DOMAIN_LABELS['supplier-library']).toBe('공급자 콘텐츠 라이브러리');
  });

  it('store workspace 서비스에서 is_public 행을 supplier producer 로 노출한다', async () => {
    const { service, query } = makeService();
    const res = await service.getContents({ serviceKey: 'kpa-society', sourceDomain: 'supplier-library' });
    expect(res.success).toBe(true);
    expect(res.pagination.total).toBe(1);
    expect(res.data[0]).toMatchObject({
      id: 'item-1',
      sourceDomain: 'supplier-library',
      producer: 'supplier',
      thumbnailUrl: 'https://cdn.example/a.png',
      creatorName: '네뚜레 공급사',
      fileUrl: 'https://cdn.example/a.png',
      mimeType: 'image/png',
    });
    // is_public 재사용 — schema 변경 없음
    expect(query.mock.calls[0][0]).toMatch(/is_public = true/);
    expect(query.mock.calls[0][0]).not.toMatch(/service_key/);
  });

  it('producer 가 supplier 가 아니면 빈 응답 (DB 미접근)', async () => {
    const { service, query } = makeService();
    const res = await service.getContents({ serviceKey: 'kpa-society', sourceDomain: 'supplier-library', producer: 'operator' });
    expect(res.data).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('store workspace 가 없는 서비스(neture · kpa-branch)는 빈 응답 (DB 미접근)', async () => {
    for (const serviceKey of ['neture', 'kpa-branch']) {
      const { service, query } = makeService();
      const res = await service.getContents({ serviceKey, sourceDomain: 'supplier-library' });
      expect(res.data).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    }
  });

  it('mixed(sourceDomain 없음) 목록에는 이번 단계에서 편입하지 않는다', async () => {
    const { query } = makeService();
    const service = new HubContentQueryService({ query } as any);
    await service.getContents({ serviceKey: 'kpa-society' });
    const sqls = query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes('neture_supplier_library_items'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. handoff 수신 계약 재사용 (SupplierContentService.submit)
// ─────────────────────────────────────────────────────────────────────────────

describe('SupplierContentService.submit — serviceKey 별 INSERT 계약 (WO §9)', () => {
  function makeQr() {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO cms_contents')) return [{ id: 'cms-1', title: 'T', status: 'pending' }];
      if (sql.includes('INSERT INTO kpa_approval_requests')) return [{ id: 'ar-1', status: 'pending' }];
      return [];
    });
    const qr = {
      query,
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    return { qr, service: new SupplierContentService({ createQueryRunner: () => qr } as any) };
  }
  const user = { id: 'u1', name: '공급자', email: 'x@example.com' };

  it('serviceKey 미지정(기존 KPA 경로) → cms + kpa_approval_requests 2 INSERT, serviceKey=kpa', async () => {
    const { qr, service } = makeQr();
    const res = await service.submit('u1', user, { title: '테스트 자료' });
    expect(res.data.approvalRequestId).toBe('ar-1');
    expect(res.data.serviceKey).toBe('kpa');
    const inserts = qr.query.mock.calls.filter((c) => String(c[0]).includes('INSERT'));
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1][0]).toBe('kpa');
    expect(qr.commitTransaction).toHaveBeenCalled();
  });

  it('serviceKey=k-cosmetics → cms 1 INSERT 만, approvalRequestId=null', async () => {
    const { qr, service } = makeQr();
    const res = await service.submit('u1', user, { title: '테스트 자료', serviceKey: 'k-cosmetics' });
    expect(res.data.approvalRequestId).toBeNull();
    expect(res.data.serviceKey).toBe('k-cosmetics');
    const inserts = qr.query.mock.calls.filter((c) => String(c[0]).includes('INSERT'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0][0]).toMatch(/INSERT INTO cms_contents/);
    expect(inserts[0][1][0]).toBe('k-cosmetics');
    // 수신 계약 불변: pending · authorRole=supplier
    expect(inserts[0][0]).toMatch(/'pending', 'supplier'/);
  });

  it('제목 검증 실패는 트랜잭션을 열지 않는다', async () => {
    const { qr, service } = makeQr();
    const res = await service.submit('u1', user, { title: 'a', serviceKey: 'k-cosmetics' });
    expect(res.error.code).toBe('INVALID_TITLE');
    expect(qr.connect).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. 원장 → cms type 매핑
// ─────────────────────────────────────────────────────────────────────────────

describe('toCmsContentType (library item → cms type)', () => {
  it('document → article', () => {
    expect(toCmsContentType({ contentType: 'document', mimeType: null })).toBe('article');
  });
  it('image mime → image', () => {
    expect(toCmsContentType({ contentType: 'media', mimeType: 'image/jpeg' })).toBe('image');
  });
  it('그 외 파일 → link', () => {
    expect(toCmsContentType({ contentType: 'media', mimeType: 'application/pdf' })).toBe('link');
    expect(toCmsContentType({})).toBe('link');
  });
});
