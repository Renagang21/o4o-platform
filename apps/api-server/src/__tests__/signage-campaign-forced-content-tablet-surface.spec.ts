/**
 * WO-O4O-SIGNAGE-CAMPAIGN-FORCED-CONTENT-TABLET-SURFACE-DELIVERY-FIX-V1
 *
 * 결함: `ContentApprovalService.createCampaignForcedContent()` 가
 *   `signage_forced_content` INSERT 에서 `target_surface` 를 생략해 DB default
 *   `'signage'` 로 저장됐다. canonical Tablet idle resolver
 *   (`routes/platform/store-public/store-public-tablet-idle-resolve.ts`) 는
 *   `fc.target_surface IN ('tablet_idle','both')` 만 읽으므로 승인된 캠페인이
 *   태블릿 대기화면에 영원히 도달하지 않았다.
 *
 * 고정하는 계약:
 *   W1) 캠페인 승인 write → target_surface 가 태블릿 도달 값 + tablet_duration_seconds 지정
 *   W2) targetServices 개수만큼 row · 각 row 의 service_key 는 해당 서비스
 *   R1) Tablet idle reader 는 'tablet_idle','both' 만 읽는다 (완화 금지)
 *   R2) 'signage' 는 tablet 에 노출되지 않는다
 *   E1) writer 값 ∈ reader 허용 집합  (writer/reader 정합 — 본 결함의 본질)
 *   M1) 운영자 수동 경로 default 는 'signage' 로 불변 (기존 사이니지 콘텐츠 회귀 방지)
 *   B1) forced content 경계는 service_key — organization_id 컬럼을 쓰지 않는다
 *   L1) 캠페인 row 의 lifecycle(is_active/start_at/end_at) 이 reader 조건과 일치
 *
 * DB 는 붙이지 않는다. write 는 QueryRunner 를 흉내내 SQL/파라미터를 포획하고,
 * read 계약은 resolver 원본 SQL 을 직접 읽어 고정한다 (reader 를 mock 이 아니라
 * 실제 소스로 검증하므로 순환 검증이 되지 않는다).
 */

import fs from 'fs';
import path from 'path';
import { ContentApprovalService } from '../routes/kpa/services/content-approval.service.js';

const API_SERVER_SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(API_SERVER_SRC, rel), 'utf-8');

const RESOLVER_REL = 'routes/platform/store-public/store-public-tablet-idle-resolve.ts';
const TABLET_ROUTES_REL = 'routes/platform/store-tablet.routes.ts';
const FORCED_CONTROLLER_REL = 'routes/signage/controllers/forced-content.controller.ts';

/** resolver / routes 원본에서 실제 허용 surface 집합을 추출한다 */
function extractAllowedSurfaces(src: string): Set<string> {
  const out = new Set<string>();
  const re = /target_surface\s+IN\s*\(([^)]*)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    for (const raw of m[1].split(',')) {
      const v = raw.trim().replace(/^'|'$/g, '');
      if (v) out.add(v);
    }
  }
  return out;
}

interface Captured {
  sql: string;
  params: any[];
}

/** 승인 트랜잭션을 실행하고 signage_forced_content INSERT 를 포획한다 */
async function approveCampaign(payload: Record<string, any>): Promise<Captured[]> {
  const captured: Captured[] = [];

  const qr = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (/INSERT\s+INTO\s+signage_forced_content/i.test(sql)) {
        captured.push({ sql, params });
      }
      return [];
    }),
  };

  const requestId = '11111111-1111-4111-8111-111111111111';
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      if (/FROM\s+kpa_approval_requests/i.test(sql)) {
        return [
          {
            id: requestId,
            status: 'pending',
            entity_type: 'signage_campaign_request',
            payload,
          },
        ];
      }
      return [];
    }),
    createQueryRunner: () => qr,
  } as any;

  const svc = new ContentApprovalService(dataSource);
  const result = await svc.approve(requestId, { id: '22222222-2222-4222-8222-222222222222' });
  expect(result.error).toBeUndefined();
  expect(qr.commitTransaction).toHaveBeenCalled();
  return captured;
}

const basePayload = {
  mediaId: '33333333-3333-4333-8333-333333333333',
  mediaSourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  mediaSourceType: 'youtube',
  mediaEmbedId: 'abcdefghijk',
  mediaThumbnailUrl: null,
  title: '공급자 캠페인 A',
  targetServices: ['kpa-society'],
  startAt: '2026-09-01T00:00:00.000Z',
  endAt: '2026-09-30T00:00:00.000Z',
  note: null,
};

/** INSERT 의 컬럼 목록과 파라미터를 컬럼명 → 값 으로 매핑한다 */
function columnMap(c: Captured): Record<string, any> {
  const cols = c.sql
    .slice(c.sql.indexOf('(') + 1, c.sql.indexOf(')'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // VALUES 목록에서 리터럴(true)과 placeholder($n)를 순서대로 읽는다
  const valuesRaw = c.sql.slice(c.sql.toUpperCase().lastIndexOf('VALUES'));
  const inner = valuesRaw.slice(valuesRaw.indexOf('(') + 1, valuesRaw.indexOf(')'));
  const slots = inner.split(',').map((s) => s.trim());

  expect(slots.length).toBe(cols.length);

  const map: Record<string, any> = {};
  cols.forEach((col, i) => {
    const slot = slots[i];
    if (slot.startsWith('$')) {
      map[col] = c.params[Number(slot.slice(1)) - 1];
    } else {
      map[col] = slot; // 리터럴 (예: true)
    }
  });
  return map;
}

describe('WO-O4O-SIGNAGE-CAMPAIGN-FORCED-CONTENT-TABLET-SURFACE-DELIVERY-FIX-V1', () => {
  describe('R1/R2 — Tablet idle reader 계약 (완화 금지)', () => {
    const resolverSrc = read(RESOLVER_REL);

    it('resolver 의 모든 forced content 조회가 target_surface 를 필터한다', () => {
      const forcedQueries = resolverSrc
        .split(/dataSource\.query\(/)
        .slice(1)
        .filter((chunk) => /signage_forced_content/i.test(chunk.slice(0, 800)));

      // 선택(selection JOIN) + fallback 두 경로
      expect(forcedQueries.length).toBe(2);
      for (const q of forcedQueries) {
        expect(q.slice(0, 1200)).toMatch(/target_surface\s+IN\s*\('tablet_idle','both'\)/);
      }
    });

    it("허용 surface 집합은 정확히 tablet_idle · both 이며 signage 를 포함하지 않는다", () => {
      const allowed = extractAllowedSurfaces(resolverSrc);
      expect([...allowed].sort()).toEqual(['both', 'tablet_idle']);
      expect(allowed.has('signage')).toBe(false);
    });

    it('태블릿 선택 후보/상태 조회(store-tablet.routes)도 같은 집합을 쓴다', () => {
      const allowed = extractAllowedSurfaces(read(TABLET_ROUTES_REL));
      expect([...allowed].sort()).toEqual(['both', 'tablet_idle']);
    });
  });

  describe('W1/W2 — 캠페인 승인 writer', () => {
    it('target_surface 를 태블릿 도달 값으로, tablet_duration_seconds 를 함께 저장한다', async () => {
      const captured = await approveCampaign(basePayload);
      expect(captured).toHaveLength(1);

      const cols = columnMap(captured[0]);
      expect(cols.target_surface).toBe('both');
      expect(cols.tablet_duration_seconds).toBe(30);
    });

    it('targetServices 개수만큼 row 를 만들고 service_key 를 각각 저장한다', async () => {
      const captured = await approveCampaign({
        ...basePayload,
        targetServices: ['kpa-society', 'glycopharm'],
      });
      expect(captured).toHaveLength(2);
      expect(captured.map((c) => columnMap(c).service_key)).toEqual(['kpa-society', 'glycopharm']);
      // 서비스가 늘어도 surface 계약은 동일
      for (const c of captured) expect(columnMap(c).target_surface).toBe('both');
    });

    it('L1 — lifecycle/시간 값이 reader 조건(is_active, start_at~end_at)과 일치한다', async () => {
      const cols = columnMap((await approveCampaign(basePayload))[0]);
      expect(cols.is_active).toBe('true');
      expect(cols.start_at).toBe(basePayload.startAt);
      expect(cols.end_at).toBe(basePayload.endAt);
      expect(cols.source_type).toBe('youtube'); // resolver 는 youtube/vimeo 만 재생
    });

    it('B1 — forced content 경계는 service_key 다 (organization_id 를 쓰지 않는다)', async () => {
      const cols = columnMap((await approveCampaign(basePayload))[0]);
      expect(Object.keys(cols)).not.toContain('organization_id');
      expect(Object.keys(cols)).toContain('service_key');
    });

    it('campaign_request_id / media_id 추적 컬럼은 그대로 유지된다', async () => {
      const cols = columnMap((await approveCampaign(basePayload))[0]);
      expect(cols.media_id).toBe(basePayload.mediaId);
      expect(cols.campaign_request_id).toBe('11111111-1111-4111-8111-111111111111');
    });
  });

  describe('E1 — writer / reader 정합 (본 결함의 본질)', () => {
    it('캠페인이 저장하는 surface 값이 reader 허용 집합에 속한다', async () => {
      const allowed = extractAllowedSurfaces(read(RESOLVER_REL));
      const cols = columnMap((await approveCampaign(basePayload))[0]);
      expect(allowed.has(cols.target_surface)).toBe(true);
    });

    it("negative — DB default 'signage' 는 reader 허용 집합에 없다 (수정 전 동작)", () => {
      const allowed = extractAllowedSurfaces(read(RESOLVER_REL));
      expect(allowed.has('signage')).toBe(false);
    });

    it('negative — 다른 서비스를 대상으로 한 캠페인은 해당 service_key 로만 저장된다', async () => {
      const captured = await approveCampaign({ ...basePayload, targetServices: ['glycopharm'] });
      expect(captured.map((c) => columnMap(c).service_key)).toEqual(['glycopharm']);
      // kpa-society 태블릿(resolveServiceKeys → ['kpa','kpa-society'])에는 매칭되지 않는다
      expect(captured.map((c) => columnMap(c).service_key)).not.toContain('kpa-society');
    });
  });

  describe('M1 — 운영자 수동 경로 보호', () => {
    const controllerSrc = read(FORCED_CONTROLLER_REL);

    it("수동 create 의 default 는 'signage' 로 유지된다", () => {
      expect(controllerSrc).toMatch(
        /req\.body\.targetSurface === 'string' \? req\.body\.targetSurface : 'signage'/,
      );
    });

    it('허용 값 집합(VALID_TARGET_SURFACES)은 signage · tablet_idle · both 세 개다', () => {
      const m = controllerSrc.match(/VALID_TARGET_SURFACES\s*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const values = m![1]
        .split(',')
        .map((s) => s.trim().replace(/^'|'$/g, ''))
        .filter(Boolean);
      expect(values.sort()).toEqual(['both', 'signage', 'tablet_idle']);
    });

    it('캠페인 writer 가 쓰는 값은 이 허용 집합의 원소다', () => {
      const src = read('routes/kpa/services/content-approval.service.ts');
      const m = src.match(/CAMPAIGN_TARGET_SURFACE\s*=\s*'([a-z_]+)'/);
      expect(m).not.toBeNull();
      expect(['signage', 'tablet_idle', 'both']).toContain(m![1]);
    });
  });

  describe('회귀 경계 — Channel / retired signage stack 재도입 0', () => {
    it('수정 파일이 channel 축을 참조하지 않는다', () => {
      const src = read('routes/kpa/services/content-approval.service.ts');
      expect(src).not.toMatch(/channel_heartbeats|channel_playback_logs|\/api\/v1\/channels/);
    });
  });
});
