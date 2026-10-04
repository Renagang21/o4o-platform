/**
 * WO-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1
 *   (이전: WO-O4O-SIGNAGE-PLAYER-WEB-DEPLOYMENT-ADOPTION-AND-PRODUCTION-SMOKE-V1 §30 채택 계약)
 *
 * signage-player-web 배포 **은퇴** 계약의 정적 회귀 방지.
 *
 * 이 앱의 유일한 재생 route 는 익명 401 · telemetry endpoint 부재로 동작하지 않았고,
 * 정본 재생 경로는 Tablet ScreenSet(각 web 앱 내부)이다 — O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.
 * Cloud Run 서비스는 삭제됐다. 배포 경로가 하나라도 되살아나면 다음 배포가 서비스를 재생성한다.
 *
 * 이 spec 이 막는 회귀:
 *  1. deploy-web-services.yml 에 player deploy job · output · dispatch 선택지가 다시 생기는 것
 *  2. 자동 배포 판정 registry(detect-affected WEB_SERVICES) · risk 매핑(deploy-risk WEB_CLOUD_RUN)에 다시 들어가는 것
 *
 * 앱 소스(services/signage-player-web)는 이번 WO 범위에서 지우지 않았다 — 소스 존재 ≠ 배포 대상.
 * 실제 배포/네트워크에 접근하지 않는 순수 정적 검사다.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const WORKFLOW = path.join(ROOT, '.github/workflows/deploy-web-services.yml');
const DETECTOR = path.join(ROOT, 'scripts/ci/detect-affected.mjs');
const RISK = path.join(ROOT, 'scripts/ci/deploy-risk.mjs');

const read = (p: string) => fs.readFileSync(p, 'utf8');

const SERVICE_NAME = 'signage-player-web';

describe('STATIC CONTRACT: signage-player-web 배포 은퇴', () => {
  it('deploy-web-services.yml 에 player deploy job · gcloud deploy · image 가 없다', () => {
    const wf = read(WORKFLOW);
    expect(wf).not.toContain('deploy-signage-player:');
    expect(wf).not.toContain(`gcloud run deploy ${SERVICE_NAME}`);
    expect(wf).not.toContain(`/${SERVICE_NAME}:`);
    expect(wf).not.toContain('services/signage-player-web/Dockerfile');
  });

  it('detect-changes output · dispatch 선택지에 signage-player 가 없다', () => {
    const wf = read(WORKFLOW);
    expect(wf).not.toContain('steps.changes.outputs.signage-player');
    expect(wf).not.toContain('needs.detect-changes.outputs.signage-player');
    expect(wf).not.toMatch(/description: 'Service to deploy \([^)]*signage-player/);
  });

  it('자동 배포 판정 registry 에 player 가 없다', () => {
    expect(read(DETECTOR)).not.toMatch(/key:\s*'signage-player'\s*,\s*dir:/);
  });

  it('risk 매핑(web key → Cloud Run 서비스)에 player 가 없다', () => {
    expect(read(RISK)).not.toContain(`'${SERVICE_NAME}'`);
  });
});
