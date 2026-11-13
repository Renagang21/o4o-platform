import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { createPharmacyFeatureService } from './member-paid-features.js';
import { CONSULTATION_LANGUAGES, type ConsultationLanguage } from './consultation-translation.extension.js';
import type { ConsultationTranslator } from './consultation-translator.js';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import { ModelControlService } from '../../../services/ai-management/model-controls.js';
import { consultationRuntimeSchema } from '../../../services/ai-management/consultation-runtime.js';
import { consultationReuseKey } from './consultation-reuse.js';

export const CONSULTATION_MODES = [
  { key: 'counter-pharmacist', label: '약사 상담', feature: 'multilingual-consultation', professional: true },
  { key: 'counter-staff', label: '근무자 상담', feature: 'multilingual-staff-response', professional: false },
  { key: 'floor-staff', label: '근무자 상담', feature: 'multilingual-staff-response', professional: false },
  { key: 'floor-pharmacist', label: '약사 상담', feature: 'multilingual-pharmacist-consultation', professional: true },
] as const;
export type ConsultationMode = typeof CONSULTATION_MODES[number]['key'];
export const CONSULTATION_SCREEN_LANGUAGES = [{ key: 'ko', label: '한국어' }, ...CONSULTATION_LANGUAGES];
export const CONSULTATION_STAFF_PHRASES = [
  { key: 'welcome', text: '안녕하세요. 무엇을 도와드릴까요?' },
  { key: 'show-product', text: '찾으시는 상품 이름이나 사진을 보여 주세요.' },
  { key: 'follow-me', text: '상품 위치를 안내해 드리겠습니다. 저를 따라와 주세요.' },
  { key: 'check-stock', text: '해당 상품이 있는지 확인해 드리겠습니다. 잠시 기다려 주세요.' },
  { key: 'pharmacist', text: '약 선택과 복용에 관한 질문은 약사에게 연결해 드리겠습니다.' },
  { key: 'wait', text: '약사가 상담할 수 있도록 잠시 기다려 주세요.' },
] as const;

function consultationText(mode: typeof CONSULTATION_MODES[number], input: Record<string, unknown>) {
    let text: string;
    // 근무자 태블릿은 자유 문장 · 음성도 쓴다(2026-11-13 사용자 결정). 안내 문구 선택도 계속 받는다.
    if (mode.key === 'floor-staff' && input.direction === 'to-customer' && input.phrase !== undefined) {
      const phrase = CONSULTATION_STAFF_PHRASES.find(item => item.key === input.phrase);
      if (!phrase || input.text !== undefined) throw new NeturePharmacyError(400, 'STAFF_PHRASE_REQUIRED', '직원 응대는 안내 문구를 선택해 주시기 바랍니다.');
      text = phrase.text;
    } else {
      if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 1000) {
        throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_INPUT', '번역할 문장을 1,000자 이내로 입력해 주시기 바랍니다.');
      }
      text = input.text.trim();
    }
    return text;
}

export interface ConsultationDependencies {
  selectGuidance?: import('./consultation-guidance.extension.js').GuidanceSelector;
  supportConsultation?: import('./consultation-support.extension.js').ConsultationSupportRunner;
  translate: ConsultationTranslator;
}

/** No transcript storage. Business/payment and employee permissions remain in the common resolver. */
export class MultilingualConsultationService {
  private readonly features;
  constructor(private readonly db: DataSource, private readonly deps: ConsultationDependencies) {
    this.features = createPharmacyFeatureService(db);
  }

  async context(userId: string, organizationId: string) {
    const access = await this.features.resolve(userId, organizationId);
    const settings = await new ModelControlService(this.db).read();
    return { organizationId, runtime: consultationRuntimeSchema.parse(settings.consultation ?? {}), languages: CONSULTATION_SCREEN_LANGUAGES, phrases: CONSULTATION_STAFF_PHRASES,
      supportAllowed: access.features.some(feature => feature.key === 'store-staff-support' && feature.storeAllowed === true),
      modes: CONSULTATION_MODES.map(mode => {
        // 상담은 매장 단위 이용 자격으로 판단한다(약국 경영자 = 약사). 누가 어느 태블릿을 쓰는지는 경영자가 매장에서 정한다.
        const granted = access.features.some(feature => feature.key === mode.feature && feature.storeAllowed === true);
        return { ...mode, entitled: granted, allowed: granted };
      }) };
  }

  private async authorize(userId: string, organizationId: string, mode: typeof CONSULTATION_MODES[number]) {
    try {
      const access = await resolveStoreAccessLevel(this.db, userId, 'kpa', organizationId);
      if (access.level === 'none' || access.organizationId !== organizationId) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '이 약국의 이용 권한을 확인해 주시기 바랍니다.');
      if (access.level === 'owner' && !await roleAssignmentService.hasAnyRole(userId, ['platform:super_admin']) &&
        await getNetureMainMembershipStatus(this.db, userId) !== 'active') throw new NeturePharmacyError(403, 'NETURE_MEMBERSHIP_REQUIRED', '회원 이용 상태를 확인해 주시기 바랍니다.');
      const pharmacies = await this.db.query(`SELECT status FROM neture_pharmacy_memberships WHERE organization_id=$1`, [organizationId]);
      if (pharmacies.length !== 1 || pharmacies[0].status !== 'active') throw new NeturePharmacyError(403, 'PHARMACY_ACCESS_REQUIRED', '내 매장 승인을 확인해 주시기 바랍니다.');
      // 상담(2026-11-13 사용자 결정): 약국 경영자는 약사이므로 승인된 약국이면 약사 · 근무자 상담을 쓸 수 있다.
      // 계정별 약사 자격 · 매장 약사 확인 · 근무자별 허용(직원 초대는 매장 관리용)을 요구하지 않는다.
      // 어느 태블릿을 약사 · 근무자용으로 쓸지는 경영자가 매장에서 정한다. 매장 소속 · 회원 · 약국 승인 확인은 위에서 그대로 한다.
      await this.features.requireStore(organizationId, mode.feature);
    } catch (error) {
      if (error instanceof NeturePharmacyError) throw error;
      throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '상담 이용 자격을 확인하지 못했습니다. 다시 시도해 주시기 바랍니다.');
    }
  }

  async requireMode(userId: string, organizationId: string, key: string) {
    const mode = CONSULTATION_MODES.find(item => item.key === key);
    if (!mode) throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_INPUT', '상담 방식을 확인해 주시기 바랍니다.');
    await this.authorize(userId, organizationId, mode);
  }

  async translate(userId: string, organizationId: string, input: Record<string, unknown>) {
    const mode = CONSULTATION_MODES.find(item => item.key === input.mode);
    if (!mode || !CONSULTATION_SCREEN_LANGUAGES.some(language => language.key === input.language) ||
      typeof input.direction !== 'string' || !['to-customer', 'to-staff'].includes(input.direction)) {
      throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_INPUT', '상담 방식과 언어를 확인해 주시기 바랍니다.');
    }
    const text = consultationText(mode, input);
    await this.authorize(userId, organizationId, mode);
    const auto = input.direction === 'to-staff' && input.detectLanguage === true &&
      consultationRuntimeSchema.parse((await new ModelControlService(this.db).read()).consultation ?? {}).detectLanguage;
    if (input.language === 'ko' && !auto) return { organizationId, mode: mode.key, direction: input.direction, language: 'ko', source: text, translation: text };
    const language = input.language as ConsultationLanguage | 'ko';
    const source = auto ? 'auto' : language;
    const output = await this.deps.translate({ text, source: input.direction === 'to-customer' ? 'ko' : source,
      target: input.direction === 'to-customer' ? language : 'ko' }, {
      actorId: userId, organizationId,
      reuseKey: consultationReuseKey(input,userId,organizationId,{ direction: input.direction, language, auto }),
      authorize: async () => { await this.authorize(userId, organizationId, mode); return true; },
    });
    // A removed invitation, expired feature or revoked professional confirmation cannot yield a late result.
    await this.authorize(userId, organizationId, mode);
    if (!output || typeof output.translation !== 'string' || !output.translation.trim() || output.translation.length > 4000) {
      throw new NeturePharmacyError(503, 'CONSULTATION_TRANSLATION_UNAVAILABLE', '번역 결과를 확인하지 못했습니다. 다시 시도해 주시기 바랍니다.');
    }
    if (auto && !CONSULTATION_SCREEN_LANGUAGES.some(item => item.key === output.detectedLanguage))
      throw new NeturePharmacyError(422, 'CONSULTATION_LANGUAGE_UNCERTAIN', '입력 언어를 확인하지 못했습니다. 고객 언어를 직접 선택해 주시기 바랍니다.');
    return { organizationId, mode: mode.key, direction: input.direction, language, source: text, translation: output.translation,
      ...(auto && output.detectedLanguage ? { detectedLanguage: output.detectedLanguage, initialStationLanguage: input.stationLanguage } : {}) };
  }
}
