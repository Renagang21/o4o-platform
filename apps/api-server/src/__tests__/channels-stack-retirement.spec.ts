/**
 * CMS Channel 축 은퇴 — dead-reference guard + schema 보존 guard
 *
 * WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1
 *
 * 판정: RETIRE (runtime) / RETAIN (schema)
 *
 * 근거 (선행 감사 CHECK-O4O-SIGNAGE-CHANNEL-STACK-REDUCTION-AND-SIMPLE-VIDEO-PLAYBACK-AUDIT-V1,
 * 프로덕션 read-only 실측):
 *   1) channels 0행 · channel_heartbeats 0행 · channel_playback_logs 0행.
 *   2) 실제 매장 영상 재생은 Tablet ScreenSet 축에서 일어난다 —
 *      store_tablets.current_screen_set_id -> store_tablet_screen_sets
 *      -> store_tablet_screen_blocks(block_type='idle_media').config.items[].url
 *      프로덕션 idle_media 35블록 중 21블록이 YouTube URL 을 담고 있다.
 *   3) 축 A 는 그 경로를 전혀 경유하지 않는다(중간 객체).
 *
 * 이 guard 가 지키는 두 방향:
 *   A. 은퇴한 runtime 진입점(route/admin UI/player)이 되살아나지 않는다.
 *   B. table 을 아직 drop 하지 않았으므로 entity 등록과 migration 은 반드시 남아 있어야 한다.
 *      (entity 를 지우면 TypeORM metadata 와 실제 schema 가 어긋난다.)
 *
 * 되살리려면 이 spec 을 먼저 고치고, 그때 "왜 Tablet ScreenSet 축으로 부족한가"를 근거로 대야 한다.
 *
 * 주의 — 이름이 같지만 은퇴 대상이 아닌 축(오인 제거 금지):
 *   - organization_channels / organization_product_channels (매장 판매채널)
 *   - external_channel_product_links (외부 판매채널)
 *   - /api/v1/store/channel-products (매장 채널 상품)
 *   - /api/signage/:serviceKey/* (Signage 축 — 별도 판정)
 */

import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');
const exists = (rel: string) => fs.existsSync(path.join(REPO_ROOT, rel));

describe('A. runtime 진입점 은퇴 — 되살아나지 않는다', () => {
  const RETIRED_FILES = [
    // api-server route
    'apps/api-server/src/routes/channels/channels.routes.ts',
    'apps/api-server/src/routes/channels/index.ts',
    'apps/api-server/src/routes/admin/channel-playback-logs.routes.ts',
    'apps/api-server/src/routes/admin/channel-heartbeat.routes.ts',
    'apps/api-server/src/routes/admin/channel-ops.routes.ts',
    // admin UI
    'apps/admin-dashboard/src/lib/channels.ts',
    'apps/admin-dashboard/src/pages/cms/channels/ChannelList.tsx',
    'apps/admin-dashboard/src/pages/cms/channels/ChannelFormModal.tsx',
    'apps/admin-dashboard/src/pages/cms/channels/ChannelContentsPreview.tsx',
    'apps/admin-dashboard/src/pages/channels/ops/ChannelOpsDashboard.tsx',
    // player — 축 A 전용 렌더 클러스터 전체
    'services/signage-player-web/src/pages/ChannelPlayerPage.tsx',
    'services/signage-player-web/src/api/channels.ts',
    'services/signage-player-web/src/api/content-render-kind.ts',
    'services/signage-player-web/src/components/ContentRenderer.tsx',
    'services/signage-player-web/src/components/EmptyState.tsx',
    'services/signage-player-web/src/components/InactiveState.tsx',
    'services/signage-player-web/src/components/ErrorState.tsx',
    'services/signage-player-web/src/components/LoadingState.tsx',
    // 위 클러스터만 검사하던 raw-source spec (축 A 와 함께 은퇴)
    'apps/api-server/src/__tests__/signage-player-content-render-kind.spec.ts',
  ];

  it.each(RETIRED_FILES)('은퇴 파일이 없다: %s', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('register-routes 는 channel route factory 를 import 하지 않는다', () => {
    const src = read('apps/api-server/src/bootstrap/register-routes.ts');
    expect(src).not.toMatch(/^import .*createChannelRoutes/m);
    expect(src).not.toMatch(/^import .*createAdminPlaybackLogRoutes/m);
    expect(src).not.toMatch(/^import .*createAdminHeartbeatRoutes/m);
    expect(src).not.toMatch(/^import .*createAdminChannelOpsRoutes/m);
  });

  it('register-routes 는 은퇴 4개 경로를 mount 하지 않는다', () => {
    const src = read('apps/api-server/src/bootstrap/register-routes.ts');
    expect(src).not.toContain("app.use('/api/v1/channels'");
    expect(src).not.toContain("app.use('/api/v1/admin/channel-playback-logs'");
    expect(src).not.toContain("app.use('/api/v1/admin/channels/heartbeat'");
    expect(src).not.toContain("app.use('/api/v1/admin/channels/ops'");
  });

  it('admin route/menu 에 /admin/cms/channels 진입점이 없다', () => {
    const routes = read('apps/admin-dashboard/src/routes/content.routes.tsx');
    expect(routes).not.toContain('path="/admin/cms/channels"');
    expect(routes).not.toContain('path="/admin/cms/channels/ops"');
    const menu = read('apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx');
    expect(menu).not.toContain("path: '/admin/cms/channels'");
    expect(menu).not.toContain("path: '/admin/cms/channels/ops'");
  });

  it('player 에 /player/channels/* route 가 없다', () => {
    const app = read('services/signage-player-web/src/App.tsx');
    expect(app).not.toContain('path="/player/channels/:channelId"');
    expect(app).not.toContain('path="/player/channels/code/:code"');
    expect(app).not.toContain('ChannelPlayerPage');
  });

  // WO-O4O-POST-RETIREMENT-MAIN-BASELINE-HOUSEKEEPING-V1:
  //   은퇴 후에도 admin ops-metrics 가 Channel/ChannelHeartbeat repository 로
  //   테이블을 직접 읽고 있었다(route 은퇴 검색으로는 안 잡히는 entity 직접 소비).
  //   "테이블이 보존됐다"는 사실이 runtime 접근 허가가 아니다.
  it('admin ops-metrics 가 Channel entity 를 runtime 으로 읽지 않는다', () => {
    const src = read('apps/api-server/src/routes/admin/ops-metrics.routes.ts');
    expect(src).not.toMatch(/getRepository\(\s*Channel\s*\)/);
    expect(src).not.toMatch(/getRepository\(\s*ChannelHeartbeat\s*\)/);
    expect(src).not.toMatch(/getRepository\(\s*ChannelPlaybackLog\s*\)/);
    // import 자체도 남기지 않는다(주석 설명은 허용).
    expect(src).not.toMatch(/^import\s*\{[^}]*Channel[^}]*\}\s*from/m);
  });

  it('어떤 runtime 소스도 Channel entity repository 를 획득하지 않는다', () => {
    const ROOTS = ['apps/api-server/src/routes', 'apps/api-server/src/services', 'apps/api-server/src/controllers'];
    const offenders: string[] = [];
    const walk = (abs: string, rel: string) => {
      for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
        const a = path.join(abs, e.name);
        const r = rel + '/' + e.name;
        if (e.isDirectory()) { walk(a, r); continue; }
        if (!e.name.endsWith('.ts')) continue;
        const body = fs.readFileSync(a, 'utf-8');
        if (/getRepository\(\s*(Channel|ChannelHeartbeat|ChannelPlaybackLog)\s*\)/.test(body)) offenders.push(r);
      }
    };
    for (const root of ROOTS) {
      const abs = path.join(REPO_ROOT, root);
      if (fs.existsSync(abs)) walk(abs, root);
    }
    expect(offenders).toEqual([]);
  });

  it('남은 소비처가 /api/v1/channels 를 더 이상 호출하지 않는다', () => {
    const CALLERS = [
      'apps/admin-dashboard/src/routes/content.routes.tsx',
      'services/signage-player-web/src/App.tsx',
      'services/signage-player-web/src/components/player/PlayerController.tsx',
    ];
    for (const rel of CALLERS) {
      expect(read(rel)).not.toContain('/api/v1/channels');
    }
  });
});

describe('B. schema 는 보존한다 — table 을 아직 drop 하지 않았다', () => {
  it('세 entity 파일이 그대로 있다', () => {
    expect(exists('packages/cms-core/src/entities/Channel.entity.ts')).toBe(true);
    expect(exists('packages/cms-core/src/entities/ChannelHeartbeat.entity.ts')).toBe(true);
    expect(exists('packages/cms-core/src/entities/ChannelPlaybackLog.entity.ts')).toBe(true);
  });

  it('entities.ts 등록이 유지된다 (부분 해제 금지)', () => {
    const src = read('apps/api-server/src/database/entities.ts');
    for (const name of ['Channel', 'ChannelPlaybackLog', 'ChannelHeartbeat']) {
      expect(new RegExp('^\\s{2}' + name + ',\\s*$', 'm').test(src)).toBe(true);
    }
  });

  it('table 생성 migration 을 지우지 않았다', () => {
    const dir = 'apps/api-server/src/database/migrations';
    expect(exists(dir + '/1736600000000-CreateChannelsTable.ts')).toBe(true);
    expect(exists(dir + '/1736700000000-CreateChannelPlaybackLog.ts')).toBe(true);
    expect(exists(dir + '/1736710000000-CreateChannelHeartbeat.ts')).toBe(true);
  });

  // 오탐 방지 2가지:
  //   1) CreateXTable migration 의 down() 에 있는 DROP TABLE 은 정상이다 → up() 구간만 본다.
  //   2) 'organization_channels' 는 다른 축이다 → 부분문자열 매칭을 막는 경계를 둔다.
  const dropsAxisATableInUp = (body: string): boolean => {
    const upStart = body.search(/async\s+up\s*\(/);
    if (upStart < 0) return false;
    const downStart = body.search(/async\s+down\s*\(/);
    const up = body.slice(upStart, downStart > upStart ? downStart : undefined);
    return /DROP\s+TABLE[^;]*(?<![\w_])(channels|channel_heartbeats|channel_playback_logs)(?![\w_])/i.test(
      up
    );
  };

  it('이번 은퇴는 DROP TABLE migration 을 추가하지 않는다', () => {
    const dir = path.join(REPO_ROOT, 'apps/api-server/src/database/migrations');
    const offenders = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => dropsAxisATableInUp(fs.readFileSync(path.join(dir, f), 'utf-8')));
    expect(offenders).toEqual([]);
  });

  // 게이트 회귀: 오탐 0 / 미탐 0 을 규칙 자체로 검증한다.
  it('게이트 규칙 회귀 — 미탐 0 (up 에서 축 A table 을 drop 하면 반드시 잡는다)', () => {
    const offending = `
      export class X { public async up(q: QueryRunner) {
        await q.query('DROP TABLE IF EXISTS "channel_playback_logs"');
      } public async down(q: QueryRunner) {} }`;
    expect(dropsAxisATableInUp(offending)).toBe(true);
  });

  it('게이트 규칙 회귀 — 오탐 0 (down 의 DROP · 타 축 table 은 잡지 않는다)', () => {
    const normalCreate = `
      export class X { public async up(q: QueryRunner) {
        await q.query('CREATE TABLE "channels" (id uuid)');
      } public async down(q: QueryRunner) {
        await q.query('DROP TABLE "channels"');
      } }`;
    expect(dropsAxisATableInUp(normalCreate)).toBe(false);

    const otherAxis = `
      export class X { public async up(q: QueryRunner) {
        await q.query('DROP TABLE "organization_channels"');
      } public async down(q: QueryRunner) {} }`;
    expect(dropsAxisATableInUp(otherAxis)).toBe(false);
  });
});

describe('C. 이름이 같은 다른 축은 건드리지 않았다', () => {
  const UNTOUCHED = [
    'apps/api-server/src/modules/store-core/entities/organization-channel.entity.ts',
    'apps/api-server/src/modules/store-core/entities/organization-product-channel.entity.ts',
    'apps/api-server/src/modules/store-core/services/store-channel.service.ts',
    'apps/api-server/src/routes/o4o-store/controllers/store-channel-products.controller.ts',
    'apps/api-server/src/modules/external-sales/entities/external-channel-product-link.entity.ts',
    'packages/store-ui-core/src/components/channels/StoreChannelsView.tsx',
    'packages/operator-core-ui/src/modules/store-channels/OperatorStoreChannelsPage.tsx',
  ];

  it.each(UNTOUCHED)('별개 축 파일이 남아 있다: %s', (rel) => {
    expect(exists(rel)).toBe(true);
  });

  it('매장 판매채널 route 는 계속 등록된다', () => {
    const src = read('apps/api-server/src/bootstrap/register-routes.ts');
    expect(src).toContain("app.use('/api/v1/store/channel-products'");
  });

  it('Signage 축은 계속 등록된다 (별도 판정 대상)', () => {
    const src = read('apps/api-server/src/bootstrap/register-routes.ts');
    expect(src).toContain("app.use('/api/signage/:serviceKey/public'");
    expect(src).toContain("app.use('/api/signage/:serviceKey'");
  });

  it('cms_content_slots(웹 CMS 슬롯) 축은 손대지 않는다', () => {
    expect(exists('apps/admin-dashboard/src/pages/cms/slots')).toBe(true);
    const menu = read('apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx');
    expect(menu).toContain("path: '/admin/cms/slots'");
  });
});

describe('D. canonical 재생 경로가 문서로 고정돼 있다', () => {
  it('canonical baseline 문서가 존재한다', () => {
    expect(exists('docs/baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md')).toBe(true);
  });

  it('은퇴 근거가 코드 주석에 남아 있다 (왜 지웠는지 추적 가능)', () => {
    const src = read('apps/api-server/src/database/entities.ts');
    expect(src).toContain('O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md');
  });
});
