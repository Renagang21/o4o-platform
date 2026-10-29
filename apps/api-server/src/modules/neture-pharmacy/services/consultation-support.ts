import { NeturePharmacyError } from '../constants.js';
import type { ConsultationGuidanceService } from './consultation-guidance.js';
import { validateConsultationSupport, type ConsultationSupportRunner, type ConsultationSupportSource } from './consultation-support.extension.js';

/** Preserve the existing runner's 18k total/5k per-source contract, reserving the checked user reference. */
function boundSources(input: ConsultationSupportSource[]): ConsultationSupportSource[] {
  const reference = input.find(source => source.id === 'r1');
  let remaining = 18000 - (reference?.text.length ?? 0);
  const sources: ConsultationSupportSource[] = [];
  for (const source of input.filter(item => item.id !== 'r1').slice(0, reference ? 25 : 26)) {
    if (!remaining) break;
    const text = source.text.slice(0, Math.min(5000, remaining)).trim();
    if (!text) continue;
    remaining -= text.length;
    sources.push({ ...source, text, title: source.title + (text.length < source.text.length ? ' · 일부' : '') });
  }
  if (sources.length + (reference ? 1 : 0) < input.length && sources.length) sources[sources.length - 1].title += ' · 일부 근거 생략';
  return reference ? [...sources, reference] : sources;
}

/** Transient pharmacist draft. Reusable content is saved only through the existing reviewed editors. */
export class ConsultationSupportService {
  constructor(private readonly guidance: ConsultationGuidanceService, private readonly run: ConsultationSupportRunner) {}
  async prepare(actor: string, org: string, input: Record<string, unknown>) {
    const context = await this.guidance.supportMaterial(actor, org, input);
    if (input.verifyOnly === true) {
      if (input.sourceVersion !== context.sourceVersion)
        throw new NeturePharmacyError(409, 'GUIDANCE_SOURCE_CHANGED', '상품 또는 게시 자료가 변경되었습니다. 현재 근거로 다시 준비해 주세요.');
      await context.authorize();
      return { state: 'verified', sourceVersion: context.sourceVersion };
    }
    if (typeof input.question !== 'string' || !input.question.trim() || input.question.length > 1000)
      throw new NeturePharmacyError(400, 'CONSULTATION_QUESTION_REQUIRED', '확인할 질문을 1,000자 이내로 입력해 주세요.');
    let sources: ConsultationSupportSource[] = [...context.sources];
    if (input.reference !== undefined) {
      const ref = input.reference as { text?: unknown; source?: unknown; reviewed?: unknown } | null;
      if (!ref || typeof ref.text !== 'string' || !ref.text.trim() || ref.text.length > 5000 ||
        typeof ref.source !== 'string' || !ref.source.trim() || ref.source.length > 400 || ref.reviewed !== true)
        throw new NeturePharmacyError(400, 'CONSULTATION_REFERENCE_REQUIRED', '전문 참고자료의 내용·출처를 입력하고 확인해 주세요.');
      sources.push({ id: 'r1', kind: 'professional-reference', title: ref.source.trim(), text: ref.text.trim() });
    }
    sources = boundSources(sources);
    if (!sources.length) return { state: 'empty', message: '게시된 상품 자료가 없습니다. 상품 자료를 준비하거나 확인한 전문 참고자료를 추가해 주세요.' };
    try {
      const brief = await this.run({ productName: context.productName, question: input.question.trim(), sources },
        { actorId: actor, organizationId: org, authorize: context.authorize });
      await context.authorize();
      validateConsultationSupport(brief, sources);
      return { state: 'ready', brief, sourceVersion: context.sourceVersion,
        sources: sources.map(({ id, kind, title }) => ({ id, kind, title })) };
    } catch (error) {
      // Prefer a current access/source denial over a provider error after access changed.
      await context.authorize();
      throw error;
    }
  }
}
