import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
import { ModelControlService } from '../../../services/ai-management/model-controls.js';
import { consultationRuntimeSchema } from '../../../services/ai-management/consultation-runtime.js';
import { consultationCopy, validConsultationLanguage, type ConsultationLocale } from './consultation-copy.js';
import { consultationIntent, type ConsultationGuidanceService } from './consultation-guidance.js';
import type { ConsultationTranslator } from './consultation-translator.js';
import { CONSULTATION_SCREEN_LANGUAGES } from './multilingual-consultation.js';
import { consultationTabletsSchema } from './consultation-tablets.js';
import type { StoreStaffSupportService } from './store-staff-support.js';

/**
 * 소비자 태블릿(키오스크). 직원 로그인 없이 기기 자격으로 쓴다.
 * - 기기 자격은 매장 경영자가 만든 연결 코드로 1회 발급하고, 매 요청마다 등록한 경영자의 현재 권한 ·
 *   매장 태블릿 목록 등록 여부를 다시 확인한다(경영자 권한 · 목록에서 빠지면 즉시 차단).
 * - 답변은 근무자 수준(상품 찾기 · 위치 · 매장이 게시한 소비자용 제품 설명 · 약사 연결)만 쓴다.
 *   약사 판단 지원 · 전문 참고 자료는 쓰지 않는다. 복용 · 증상 · 약 선택 질문은 약사 연결 안내로 바꾼다.
 * - 질문 · 답변을 저장하지 않는다. 기존 store_consultation_stations 행을 기기 등록에만 쓴다(schema 변경 없음).
 */
export const KIOSK_MODE = 'consumer-kiosk';
/** 키오스크가 빌려 쓰는 근무자 상담 방식(이용 자격 · 결제 구조를 그대로 따른다). */
export const KIOSK_STAFF_MODES = ['floor-staff', 'counter-staff'] as const;
type Json = Record<string, unknown>;
type Row = { id: string; organization_id: string; station_key: string; name: string; operator_user_id: string | null };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const uuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const fail = (status: number, code: string, message: string): never => { throw new NeturePharmacyError(status, code, message); };
export const kioskStationKey = (tabletId: string) => `kiosk-${tabletId}`;

export interface KioskDependencies {
  requireMode: (actor: string, org: string, mode: string) => Promise<void>;
  /** 상품 검색 이용 자격(store-staff-support). 기존 근무자 상품 검색 · 키오스크 위치 · 설명 안내와 같은 검사다. */
  requireProductSupport: (actor: string, org: string) => Promise<void>;
  guidance: Pick<ConsultationGuidanceService, 'prepare'>;
  products: Pick<StoreStaffSupportService, 'products'>;
  translate: ConsultationTranslator;
}

export class ConsultationKioskService {
  constructor(private readonly db: DataSource, private readonly deps: KioskDependencies) {}

  private async consumerTablet(org: string, tabletId: unknown) {
    const [row] = await this.db.query(`SELECT o.metadata->'consultationTablets' AS tablets FROM organizations o
      WHERE o.id=$1 AND EXISTS(SELECT 1 FROM neture_pharmacy_memberships m WHERE m.organization_id=o.id AND m.status='active')`, [org]);
    const parsed = consultationTabletsSchema.safeParse(row?.tablets ?? []);
    const tablet = parsed.success ? parsed.data.find(item => item.id === tabletId && item.role === 'consumer') : undefined;
    if (!tablet) fail(404, 'KIOSK_NOT_REGISTERED', '등록된 소비자 태블릿을 확인해 주세요.');
    return tablet!;
  }
  /** 근무자 방식 중 지금 쓸 수 있는 첫 방식. 없으면 마지막 거부 사유를 그대로 돌려준다. */
  private async staffMode(actor: string, org: string) {
    let denial: unknown;
    for (const mode of KIOSK_STAFF_MODES) {
      try { await this.deps.requireMode(actor, org, mode); return mode; } catch (error) { denial = error; }
    }
    throw denial;
  }
  private async owner(actor: string, org: string) {
    const access = await resolveStoreAccessLevel(this.db, actor, 'kpa', org);
    if (access.level !== 'owner' || access.memberRole !== 'owner' || access.organizationId !== org ||
      await getNetureMainMembershipStatus(this.db, actor) !== 'active')
      fail(403, 'STORE_OWNER_REQUIRED', '매장 경영자가 소비자 태블릿을 연결할 수 있습니다.');
  }

  /** 경영자 화면: 소비자 태블릿의 연결 코드(10분). 다시 만들면 이전 코드는 무효가 된다. */
  async pairing(actor: string, org: string, input: Json) {
    await this.owner(actor, org);
    const tablet = await this.consumerTablet(org, input.tabletId);
    await this.staffMode(actor, org);
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = randomBytes(5).toString('hex').toUpperCase();
      try {
        await this.db.query(`INSERT INTO store_consultation_stations
          (id,organization_id,station_key,name,operator_user_id,mode,language,active,epoch,pairing_hash,pairing_expires_at)
          VALUES($1,$2,$3,$4,$5,$6,'ko',true,$7,$8,now()+interval '10 minutes')
          ON CONFLICT(organization_id,station_key) DO UPDATE SET name=EXCLUDED.name,operator_user_id=EXCLUDED.operator_user_id,
          mode=EXCLUDED.mode,active=true,pairing_hash=EXCLUDED.pairing_hash,pairing_expires_at=EXCLUDED.pairing_expires_at,
          version=store_consultation_stations.version+1,updated_at=now()
          WHERE store_consultation_stations.mode=EXCLUDED.mode`,
          [randomUUID(), org, kioskStationKey(tablet.id), tablet.name, actor, KIOSK_MODE, randomUUID(), hash(code)]);
        const [saved] = await this.db.query(
          'SELECT id FROM store_consultation_stations WHERE organization_id=$1 AND station_key=$2 AND mode=$3 AND pairing_hash=$4',
          [org, kioskStationKey(tablet.id), KIOSK_MODE, hash(code)]);
        if (!saved) fail(409, 'KIOSK_KEY_IN_USE', '소비자 태블릿 연결을 준비하지 못했습니다. 태블릿을 다시 추가해 주세요.');
        return { code: `${code.slice(0, 5)}-${code.slice(5)}`, expiresAt: new Date(Date.now() + 600_000).toISOString() };
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    return fail(503, 'PAIRING_UNAVAILABLE', '연결 코드를 만들지 못했습니다. 다시 시도해 주세요.');
  }

  /** 키오스크: 연결 코드로 기기 자격 발급. 같은 태블릿의 이전 기기 자격은 대체된다. */
  async claim(input: Json) {
    const code = typeof input.code === 'string' ? input.code.replace(/[-\s]/g, '').toUpperCase() : '';
    if (!/^[A-F0-9]{10}$/.test(code)) fail(400, 'INVALID_PAIRING_CODE', '연결 코드를 확인해 주세요.');
    const [row]: Row[] = await this.db.query(`SELECT id,organization_id,station_key,name,operator_user_id FROM store_consultation_stations
      WHERE pairing_hash=$1 AND pairing_expires_at>now() AND mode=$2`, [hash(code), KIOSK_MODE]);
    if (!row?.operator_user_id) fail(404, 'INVALID_PAIRING_CODE', '연결 코드가 만료되었거나 잘못되었습니다.');
    await this.authorizeRow(row!);
    const token = randomBytes(32).toString('hex');
    const result = await this.db.query(`UPDATE store_consultation_stations SET device_hash=$2,device_seen_at=now(),pairing_hash=NULL,
      pairing_expires_at=NULL,version=version+1,updated_at=now() WHERE id=$1 AND pairing_hash=$3 AND pairing_expires_at>now() AND mode=$4 RETURNING id,name`,
      [row!.id, hash(token), hash(code), KIOSK_MODE]);
    const updated = (Array.isArray(result[0]) ? result[0] : result)[0];
    if (!updated) fail(404, 'INVALID_PAIRING_CODE', '이미 사용되었거나 만료된 연결 코드입니다.');
    return { id: updated.id as string, name: updated.name as string, token };
  }

  private async authorizeRow(row: Row) {
    if (!row.operator_user_id) fail(403, 'CONSULTATION_ACCESS_REVOKED', '매장에 소비자 태블릿 이용 상태를 확인해 주세요.');
    const tabletId = row.station_key.startsWith('kiosk-') ? row.station_key.slice(6) : '';
    const tablet = await this.consumerTablet(row.organization_id, tabletId);
    return { actor: row.operator_user_id!, org: row.organization_id, mode: await this.staffMode(row.operator_user_id!, row.organization_id),
      speechLanguages: tablet.speechLanguages ?? null };
  }
  /** 기기 요청마다 기기 자격 · 태블릿 등록 · 등록 경영자의 현재 권한을 확인한다. */
  async device(input: Json) {
    if (!uuid(input.id) || typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token))
      fail(401, 'DEVICE_NOT_CONNECTED', '소비자 화면을 다시 연결해 주세요.');
    const [row]: Row[] = await this.db.query(`SELECT id,organization_id,station_key,name,operator_user_id FROM store_consultation_stations
      WHERE id=$1 AND device_hash=$2 AND mode=$3`, [input.id, hash(String(input.token)), KIOSK_MODE]);
    if (!row) fail(401, 'DEVICE_NOT_CONNECTED', '소비자 화면 연결이 해제되었습니다.');
    const access = await this.authorizeRow(row!);
    const authorize = async () => { const current = await this.authorizeRow(row!); return current.actor === access.actor && current.mode === access.mode; };
    return { ...access, name: row!.name, authorize };
  }

  async context(input: Json) {
    const device = await this.device(input);
    await this.db.query('UPDATE store_consultation_stations SET device_seen_at=now() WHERE id=$1 AND mode=$2', [input.id, KIOSK_MODE]);
    const runtime = consultationRuntimeSchema.parse((await new ModelControlService(this.db).read()).consultation ?? {});
    // 이 키오스크의 자동 감지 후보(없으면 관리자 기본). 화면은 이 언어를 앞에 둔다.
    return { name: device.name, languages: CONSULTATION_SCREEN_LANGUAGES,
      runtime: { ...runtime, speechLanguages: device.speechLanguages ?? runtime.speechLanguages } };
  }

  /** 소비자 언어 → 한국어. 한국어는 그대로. 'auto' 는 관리자 설정이 허용할 때만 감지한다. */
  private async korean(device: Awaited<ReturnType<ConsultationKioskService['device']>>, text: unknown, language: unknown) {
    if (typeof text !== 'string' || !text.trim() || text.length > 300) fail(400, 'INVALID_KIOSK_INPUT', '내용을 300자 이내로 입력해 주세요.');
    const words = String(text).trim();
    const auto = language === 'auto' &&
      consultationRuntimeSchema.parse((await new ModelControlService(this.db).read()).consultation ?? {}).detectLanguage;
    if (!auto && !validConsultationLanguage(language)) fail(400, 'INVALID_LANGUAGE', '언어를 선택해 주세요.');
    if (language === 'ko') return { korean: words, language: 'ko' as ConsultationLocale };
    const output = await this.deps.translate({ text: words, source: auto ? 'auto' : language as Exclude<ConsultationLocale, 'ko'>, target: 'ko' },
      { actorId: device.actor, organizationId: device.org, authorize: device.authorize });
    if (!await device.authorize()) fail(409, 'CONSULTATION_CHANGED', '매장 상담 설정이 변경되었습니다. 다시 시도해 주세요.');
    const detected = auto ? output.detectedLanguage : language;
    if (!output?.translation?.trim() || !validConsultationLanguage(detected))
      fail(422, 'CONSULTATION_LANGUAGE_UNCERTAIN', '언어를 확인하지 못했습니다. 언어를 직접 선택해 주세요.');
    return { korean: output.translation.trim(), language: detected as ConsultationLocale };
  }
  private referral(language: ConsultationLocale) {
    const copy = consultationCopy(language);
    return { state: 'ready', intent: 'pharmacist', card: { kind: 'notice', title: copy.notice, text: copy.pharmacist, language, requestedLanguage: language } };
  }
  /** 이 질문을 약사 연결로 넘겨야 하는가 — 기존 직원 안내와 같은 서버 판정. */
  private needsPharmacist(korean: string, original: string) {
    return consultationIntent(undefined, korean) === 'pharmacist' || consultationIntent(undefined, original) === 'pharmacist';
  }

  /** 상품 이름 검색. 원문과 한국어 번역 둘 다로 찾는다(외국어 상표명 대비). 위치 · 설명은 선택 후에 준다. */
  async search(input: Json) {
    const device = await this.device(input);
    const { korean, language } = await this.korean(device, input.text, input.language);
    if (this.needsPharmacist(korean, String(input.text))) return { ...this.referral(language), language };
    await this.deps.requireProductSupport(device.actor, device.org);
    const terms = [...new Set([korean, String(input.text).trim()].map(term => term.slice(0, 80)))];
    const found = new Map<string, { kind: string; id: string; name: string }>();
    for (const term of terms)
      for (const item of await this.deps.products.products(device.org, term) as Array<{ kind: string; id: string; name: string }>)
        found.set(`${item.kind}:${item.id}`, { kind: item.kind, id: item.id, name: item.name });
    if (!await device.authorize()) fail(409, 'CONSULTATION_CHANGED', '매장 상담 설정이 변경되었습니다. 다시 시도해 주세요.');
    return { state: 'products', language, products: [...found.values()].slice(0, 20) };
  }

  /** 선택한 상품의 위치 또는 게시 제품 설명. 질문이 있으면 게시 문단 중 관련 문단을 AI 가 고른다. */
  async answer(input: Json) {
    const device = await this.device(input);
    if (!['location', 'product-details'].includes(String(input.intent))) fail(400, 'INVALID_KIOSK_INPUT', '안내 종류를 선택해 주세요.');
    let language = input.language as ConsultationLocale;
    let question = '';
    if (input.question !== undefined && input.question !== '') {
      const translated = await this.korean(device, input.question, input.language);
      if (this.needsPharmacist(translated.korean, String(input.question))) return { ...this.referral(translated.language), language: translated.language };
      question = translated.korean; language = translated.language;
    } else if (!validConsultationLanguage(language)) fail(400, 'INVALID_LANGUAGE', '언어를 선택해 주세요.');
    const request = { mode: device.mode, language, intent: input.intent, productKind: input.productKind, productId: input.productId,
      ...(question ? { question, useAi: true } : {}) };
    let prepared: Json;
    try {
      prepared = await this.deps.guidance.prepare(device.actor, device.org, { ...request, translateMaterial: true }) as Json;
    } catch (error) {
      // 긴 게시 자료는 바로 번역하지 않는다 — 게시된 원문 언어 그대로 보여 준다(fallbackUsed 표시).
      if (!(error instanceof NeturePharmacyError) || error.code !== 'GUIDANCE_TRANSLATION_UNAVAILABLE') throw error;
      prepared = await this.deps.guidance.prepare(device.actor, device.org, request) as Json;
    }
    if (!await device.authorize()) fail(409, 'CONSULTATION_CHANGED', '매장 상담 설정이 변경되었습니다. 다시 시도해 주세요.');
    // 기기에는 소비자에게 보여 줄 카드 · 안내 문구만 보낸다(직원용 증명 · 내부 식별 정보 제외).
    const card = prepared.card as Json | undefined;
    return { state: prepared.state, intent: prepared.intent, language,
      ...(card ? { card: { kind: card.kind, title: card.title, text: card.text, language: card.language, requestedLanguage: card.requestedLanguage,
        publicKey: card.publicKey ?? null, fallbackUsed: card.fallbackUsed === true, translated: card.translated === true } } : {}),
      ...(typeof prepared.message === 'string' ? { message: prepared.message } : {}) };
  }

  /** 약사 연결 안내(소비자가 직접 누른 경우). */
  async pharmacist(input: Json) {
    await this.device(input);
    if (!validConsultationLanguage(input.language)) fail(400, 'INVALID_LANGUAGE', '언어를 선택해 주세요.');
    return { ...this.referral(input.language as ConsultationLocale), language: input.language };
  }
}
