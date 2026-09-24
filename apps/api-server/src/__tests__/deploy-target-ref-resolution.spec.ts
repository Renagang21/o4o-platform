/**
 * 배포 대상(ref → service/image) 판정 정적 계약
 *   WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 §11-6 (2026-09-24 INCIDENT)
 *
 * 사고: Password Phase B-1 의 통제된 배포 창에서 검증된 SHA 를 태그
 * (`deploy/2026-09-24-phase-b1`)로 고정해 `deploy-admin.yml` 을 dispatch 했다.
 * 그런데 `Determine deployment target` step 이 `refs/heads/main` · `refs/heads/develop`
 * **두 분기만** 가지고 있어 태그 ref 에서는 **어떤 output 도 설정되지 않았다.**
 *   → `image_name` 이 빈 값 → Docker tag 가 `.../o4o-api/:<sha>` 로 조립 →
 *     `invalid reference format` 으로 build 실패.
 * Cloud Run 이전 단계라 운영 영향은 0 이었지만 **승인받은 배포 창 하나를 소모**했고,
 * `service_name` 도 함께 비어 있어 build 가 성공했다면 이름 없는 서비스 배포로 갈 구조였다.
 *
 * 그래서 이 spec 이 고정하는 것
 * -----------------------------
 *  A. `deploy-admin.yml` 은 `refs/tags/deploy/*` 를 **production 으로 명시 지원**한다.
 *  B. main / develop / deploy-tag **이외의 ref 는 hard fail** 이다 (빈 값으로 build 진행 금지).
 *  C. 판정 결과 4개 값(`service_name` · `image_name` · `api_url` · `app_origin`)은
 *     **빈 값 검사를 통과한 뒤에만** `$GITHUB_OUTPUT` 에 쓰인다.
 *  D. `deploy-api.yml` 은 ref 분기 없이 **정적 `env:`** 로 service/image 이름을 정한다
 *     — 같은 결함 계열이 생길 수 없는 형태이며, 그 성질을 유지한다.
 *
 * 고정하지 않는 것: 실제 bash 실행(거동은 배포 창에서 실측했다). 여기서는 파일 텍스트만 본다 —
 * DB · 네트워크 · 셸 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const ADMIN_WF = path.join(REPO, '.github', 'workflows', 'deploy-admin.yml');
const API_WF = path.join(REPO, '.github', 'workflows', 'deploy-api.yml');

const read = (p: string) => fs.readFileSync(p, 'utf-8');

/** 주석 줄 제거 — 판정은 "실행되는 줄"만 본다(사고 경위를 적은 주석은 위반이 아니다). */
const codeOnly = (src: string) =>
  src
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');

describe('배포 대상 ref 판정 계약 (deploy-admin / deploy-api)', () => {
  it('두 workflow 파일이 실재한다 (guard 가 빈 집합으로 통과하지 않는다)', () => {
    expect(fs.existsSync(ADMIN_WF)).toBe(true);
    expect(fs.existsSync(API_WF)).toBe(true);
    expect(read(ADMIN_WF).length).toBeGreaterThan(1000);
  });

  describe('A. deploy 태그는 production 으로 판정된다', () => {
    const code = codeOnly(read(ADMIN_WF));

    it('refs/tags/deploy/* 분기가 있다', () => {
      expect(code).toMatch(/refs\/tags\/deploy\/\*/);
    });

    it('그 분기가 production 서비스·이미지 이름을 정한다', () => {
      // production 값이 main 분기와 같은 블록에서 나온다(태그 전용 분기가 갈라지지 않는다).
      expect(code).toMatch(/SERVICE_NAME=o4o-admin-dashboard\b/);
      expect(code).toMatch(/IMAGE_NAME=admin-dashboard\b/);
      expect(code).toMatch(/APP_ORIGIN=https:\/\/admin\.neture\.co\.kr/);
    });

    it('main · develop 판정은 유지된다', () => {
      expect(code).toMatch(/refs\/heads\/main/);
      expect(code).toMatch(/refs\/heads\/develop/);
      expect(code).toMatch(/SERVICE_NAME=o4o-admin-dashboard-dev\b/);
    });
  });

  describe('B. 알 수 없는 ref 는 hard fail 이다', () => {
    const code = codeOnly(read(ADMIN_WF));

    it('판정 분기에 else + exit 1 이 있다', () => {
      // else 로 떨어지면 오류를 남기고 즉시 종료해야 한다 — 조용한 통과 금지.
      expect(code).toMatch(/else\b[\s\S]{0,400}?::error::[\s\S]{0,400}?exit 1/);
    });

    it('판정 step 이 set -e 계열로 시작한다 (중간 실패가 무시되지 않는다)', () => {
      expect(code).toMatch(/set -euo pipefail/);
    });
  });

  describe('C. 빈 값으로 build 까지 가지 않는다', () => {
    const code = codeOnly(read(ADMIN_WF));

    it('4개 값 모두 빈 값 검사를 통과한 뒤 GITHUB_OUTPUT 에 쓰인다', () => {
      expect(code).toMatch(/-z "\$value"/);
      expect(code).toMatch(/fail-closed/);
      for (const key of ['service_name', 'image_name', 'api_url', 'app_origin']) {
        expect(code).toMatch(new RegExp(`"${key}=\\$`));
      }
    });

    it('검사를 건너뛰고 이름을 직접 출력하는 옛 형태가 남아 있지 않다', () => {
      // 사고 당시 형태: `echo "image_name=admin-dashboard" >> $GITHUB_OUTPUT`
      // (분기 안에서 곧바로 출력 → 분기에 걸리지 않으면 값이 아예 없다)
      expect(code).not.toMatch(/echo "image_name=[a-z-]+" >> \$GITHUB_OUTPUT/);
      expect(code).not.toMatch(/echo "service_name=[a-z0-9-]+" >> \$GITHUB_OUTPUT/);
    });
  });

  describe('D. deploy-api 는 ref 분기 없이 정적 env 를 쓴다', () => {
    const code = codeOnly(read(API_WF));

    it('service/image 이름이 env 상수다', () => {
      expect(code).toMatch(/^\s*SERVICE_NAME:\s*o4o-core-api\s*$/m);
      expect(code).toMatch(/^\s*IMAGE_NAME:\s*api-server\s*$/m);
    });

    it('이름을 ref 로 분기해 정하지 않는다 (같은 결함 계열 유입 차단)', () => {
      expect(code).not.toMatch(/(SERVICE_NAME|IMAGE_NAME)=.*github\.ref/);
      expect(code).not.toMatch(/image_name=.*>>\s*\$GITHUB_OUTPUT/);
    });
  });
});
