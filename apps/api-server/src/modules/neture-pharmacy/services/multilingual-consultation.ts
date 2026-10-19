import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { createPharmacyFeatureService } from './member-paid-features.js';
import { CONSULTATION_LANGUAGES, type ConsultationLanguage } from './consultation-translation.extension.js';
import type { ConsultationTranslator } from './consultation-translator.js';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';

export const CONSULTATION_MODES = [
  { key: 'counter-pharmacist', label: '매대 약사 상담', feature: 'multilingual-consultation', professional: true },
  { key: 'floor-staff', label: '매장 직원 응대', feature: 'multilingual-staff-response', professional: false },
  { key: 'floor-pharmacist', label: '매장 약사 상담', feature: 'multilingual-pharmacist-consultation', professional: true },
] as const;
export type ConsultationMode = typeof CONSULTATION_MODES[number]['key'];
export const CONSULTATION_STAFF_PHRASES = [
  { key: 'welcome', text: '안녕하세요. 무엇을 도와드릴까요?' },
  { key: 'show-product', text: '찾으시는 상품 이름이나 사진을 보여 주세요.' },
  { key: 'follow-me', text: '상품 위치를 안내해 드리겠습니다. 저를 따라와 주세요.' },
  { key: 'check-stock', text: '해당 상품이 있는지 확인해 드리겠습니다. 잠시 기다려 주세요.' },
  { key: 'pharmacist', text: '약 선택과 복용에 관한 질문은 약사에게 연결해 드리겠습니다.' },
  { key: 'wait', text: '약사가 상담할 수 있도록 잠시 기다려 주세요.' },
] as const;

export interface ConsultationDependencies {
  translate: ConsultationTranslator;
  professional: (userId: string, organizationId: string) => Promise<boolean>;
}

/** No transcript storage. Business/payment and employee permissions remain in the common resolver. */
export class MultilingualConsultationService {
  private readonly features;
  constructor(private readonly db: DataSource, private readonly deps: ConsultationDependencies) {
    this.features = createPharmacyFeatureService(db);
  }

  async context(userId: string, organizationId: string) {
    const access = await this.features.resolve(userId, organizationId);
    const professional = await this.deps.professional(userId, organizationId);
    return { organizationId, languages: CONSULTATION_LANGUAGES, phrases: CONSULTATION_STAFF_PHRASES,
      modes: CONSULTATION_MODES.map(mode => ({ ...mode,
        entitled: access.features.some(feature => feature.key === mode.feature && feature.allowed === true),
        allowed: access.features.some(feature => feature.key === mode.feature && feature.allowed === true) && (!mode.professional || professional),
      })) };
  }

  private async authorize(userId: string, organizationId: string, mode: typeof CONSULTATION_MODES[number]) {
    try {
      const access = await resolveStoreAccessLevel(this.db, userId, 'kpa', organizationId);
      if (access.level === 'none' || access.organizationId !== organizationId) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '이 약국의 이용 권한을 확인해 주세요.');
      if (access.level === 'owner' && !await roleAssignmentService.hasAnyRole(userId, ['platform:super_admin']) &&
        await getNetureMainMembershipStatus(this.db, userId) !== 'active') throw new NeturePharmacyError(403, 'NETURE_MEMBERSHIP_REQUIRED', '회원 이용 상태를 확인해 주세요.');
      const pharmacies = await this.db.query(`SELECT status FROM neture_pharmacy_memberships WHERE organization_id=$1`, [organizationId]);
      if (pharmacies.length !== 1 || pharmacies[0].status !== 'active') throw new NeturePharmacyError(403, 'PHARMACY_ACCESS_REQUIRED', '내 매장 승인을 확인해 주세요.');
      await this.features.require(userId, organizationId, mode.feature);
      if (mode.professional && !await this.deps.professional(userId, organizationId)) {
        throw new NeturePharmacyError(403, 'PHARMACIST_CONFIRMATION_REQUIRED', '약사 상담 사용 확인이 필요합니다.');
      }
    } catch (error) {
      if (error instanceof NeturePharmacyError) throw error;
      throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '상담 이용 자격을 확인하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  async translate(userId: string, organizationId: string, input: Record<string, unknown>) {
    const mode = CONSULTATION_MODES.find(item => item.key === input.mode);
    if (!mode || !CONSULTATION_LANGUAGES.some(language => language.key === input.language) ||
      typeof input.direction !== 'string' || !['to-customer', 'to-staff'].includes(input.direction)) {
      throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_INPUT', '상담 방식과 언어를 확인해 주세요.');
    }
    let text: string;
    if (mode.key === 'floor-staff' && input.direction === 'to-customer') {
      const phrase = CONSULTATION_STAFF_PHRASES.find(item => item.key === input.phrase);
      if (!phrase || input.text !== undefined) throw new NeturePharmacyError(400, 'STAFF_PHRASE_REQUIRED', '직원 응대는 안내 문구를 선택해 주세요.');
      text = phrase.text;
    } else {
      if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 1000) {
        throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_INPUT', '번역할 문장을 1,000자 이내로 입력해 주세요.');
      }
      text = input.text.trim();
    }
    await this.authorize(userId, organizationId, mode);
    const language = input.language as ConsultationLanguage;
    const output = await this.deps.translate({ text, source: input.direction === 'to-customer' ? 'ko' : language,
      target: input.direction === 'to-customer' ? language : 'ko' }, {
      actorId: userId, organizationId,
      authorize: async () => { await this.authorize(userId, organizationId, mode); return true; },
    });
    // A removed invitation, expired feature or revoked professional confirmation cannot yield a late result.
    await this.authorize(userId, organizationId, mode);
    if (!output || typeof output.translation !== 'string' || !output.translation.trim() || output.translation.length > 4000) {
      throw new NeturePharmacyError(503, 'CONSULTATION_TRANSLATION_UNAVAILABLE', '번역 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
    }
    return { organizationId, mode: mode.key, direction: input.direction, language, source: text, translation: output.translation };
  }
}
