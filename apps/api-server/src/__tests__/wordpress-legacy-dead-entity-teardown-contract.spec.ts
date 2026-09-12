/**
 * WO-O4O-WORDPRESS-LEGACY-ENTITY-ROUTE-SERVICE-FINAL-TEARDOWN-V1
 *
 * production 테이블이 없고 코드 소비자(import·string relation)가 0 이던 WordPress 계열
 * dead TypeORM entity 8개(파일 7개)를 제거한 것을 고정한다.
 *
 * 제거 대상은 **registration 외 소비 0** 이 확인된 것만이다:
 *   Category · Tag · Theme · ThemeInstallation · ReusableBlock · BlockPattern · CustomizerPreset · WidgetArea
 *
 * 보존 대상(같은 census 에서 소비자 존재/보호 계약으로 남긴 것)도 함께 단언해
 * 이번 teardown 이 범위를 넘지 않았음을 고정한다.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const API = join(__dirname, '..', '..');
const entitiesSrc = readFileSync(join(API, 'src', 'database', 'entities.ts'), 'utf-8');
const stripComments = (s: string) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const reg = stripComments(entitiesSrc);

const REMOVED = ['Category', 'Tag', 'Theme', 'ThemeInstallation', 'ReusableBlock', 'BlockPattern', 'CustomizerPreset', 'WidgetArea'];
const REMOVED_FILES = ['Category', 'Tag', 'Theme', 'ReusableBlock', 'BlockPattern', 'CustomizerPreset', 'WidgetArea'];

describe('WordPress legacy dead entity teardown', () => {
  it('제거된 entity 파일이 존재하지 않는다', () => {
    for (const f of REMOVED_FILES) {
      expect(existsSync(join(API, 'src', 'entities', `${f}.ts`))).toBe(false);
    }
  });

  it('entities.ts 에 제거된 클래스의 import 가 없다', () => {
    for (const c of REMOVED_FILES) {
      expect(reg).not.toMatch(new RegExp(`from '\\.\\./entities/${c}\\.js'`));
    }
  });

  it('entities.ts registry 배열에 제거된 클래스 등록이 없다', () => {
    for (const c of REMOVED) {
      expect(reg).not.toMatch(new RegExp(`^\\s*${c},\\s*$`, 'm'));
    }
  });

  it('보존 대상(소비자 존재·보호 계약)은 그대로 등록돼 있다', () => {
    // TemplatePart = settingsService 소비 / FormPreset·ViewPreset·TemplatePreset = CPT-ACF canonical(보호)
    for (const keep of ['TemplatePart', 'FormPreset', 'ViewPreset', 'TemplatePreset']) {
      expect(reg).toMatch(new RegExp(`^\\s*${keep},\\s*$`, 'm'));
    }
  });
});
