import { createHash } from "node:crypto";
import { parse as parseHtml } from "node-html-parser";
import type { DataSource } from "typeorm";
import { NeturePharmacyError } from "../constants.js";
import { pickFallbackPage } from "../../../routes/o4o-store/utils/multilingual-locale.js";
import {
  consultationCopy,
  validConsultationLanguage,
  type ConsultationLocale,
} from "./consultation-copy.js";
import type { GuidanceSelector } from "./consultation-guidance.extension.js";
import type { ConsultationTranslator } from "./consultation-translator.js";
import type { StationAuthorization } from "./consultation-stations.js";
import type { ConsultationSupportSource } from "./consultation-support.extension.js";
import { StoreStaffSupportService } from "./store-staff-support.js";
import { readStoreProductAiContext } from '../../neture/product-description-intake/ai-context.service.js';
type Json = Record<string, unknown>;
import { approvedAiSupportSources } from './consultation-evidence.js';
import { ConsultationContextService, createConsultationContextPlanner } from './consultation-context.js';
export type GuidanceIntent =
  | "find-product"
  | "location"
  | "product-details"
  | "pharmacist";
export interface GuidanceCard {
  kind: "guidance" | "product" | "notice";
  title: string;
  text: string;
  language: string;
  requestedLanguage: string;
  publicKey?: string | null;
  source?: { title: string; language: string };
  fallbackUsed?: boolean;
  translated?: boolean;
}
export type GuidanceProof = {
  mode: string;
  requestedLanguage: string;
  intent: GuidanceIntent;
  productKind?: string;
  productId?: string;
  sourceVersion: string;
  card: GuidanceCard;
};
type Page = {
  id: string;
  locale: string;
  title: string;
  summary: string | null;
  contentFormat: string;
  content: Json;
  status: string;
  updatedAt: string;
};
type Material = {
  page: Page;
  publicKey: string;
  title: string;
  version: string;
  passages: Array<{ id: number; text: string }>;
};
// Digest key order is deliberately locale-independent UTF-16 order.
function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical((value as Json)[key])]),
    );
  return value;
}
// JSONB may reorder object keys. A stored proof must keep the same semantic digest.
const digest = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
const fail = (status: number, code: string, message: string): never => {
  throw new NeturePharmacyError(status, code, message);
};
export function consultationIntent(
  value: unknown,
  question: string,
): GuidanceIntent | null {
  if (value !== undefined && value !== "help")
    return [
      "find-product",
      "location",
      "product-details",
      "pharmacist",
    ].includes(String(value))
      ? (value as GuidanceIntent)
      : null;
  if (/약사|복용|복약|증상|처방|추천|pharmacist/i.test(question))
    return "pharmacist";
  if (/어디|위치|location/i.test(question)) return "location";
  if (/설명|자료|안내|정보|information|explain/i.test(question))
    return "product-details";
  if (/찾|search|find/i.test(question)) return "find-product";
  return null;
}
function plain(value: string) {
  // Reuse the API's existing parser instead of backtracking over malformed tags.
  const root = parseHtml(value);
  for (const node of root.querySelectorAll("script, style")) node.remove();
  return root.structuredText.replace(/\n/g, "\n\n").trim();
}

function passages(page: Page) {
  const body =
    typeof page.content?.html === "string"
      ? plain(page.content.html)
      : typeof page.content?.text === "string"
        ? plain(page.content.text)
        : "";
  const raw = [page.summary ? plain(page.summary) : "", body]
    .filter(Boolean)
    .join("\n\n");
  return [
    ...new Set(
      raw
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean),
    ),
  ]
    .filter((p) => p.length <= 1200)
    .slice(0, 24)
    .map((text, index) => ({ id: index + 1, text }));
}
export class ConsultationGuidanceService {
  private readonly products: StoreStaffSupportService;
  constructor(
    private readonly db: DataSource,
    private readonly authorize: StationAuthorization,
    private readonly requireProducts: (
      actor: string,
      org: string,
    ) => Promise<void>,
    private readonly select: GuidanceSelector,
    private readonly translate: ConsultationTranslator,
  ) {
    this.products = new StoreStaffSupportService(db);
  }
  private async access(
    actor: string,
    org: string,
    mode: string,
    products = true,
  ) {
    await this.authorize(actor, org, mode);
    if (products) await this.requireProducts(actor, org);
  }
  private async material(
    org: string,
    kind: string,
    id: string,
    language: string,
  ): Promise<Material | null> {
    const [group] = await this.db.query(
      `SELECT id,title,default_locale AS "defaultLocale",public_key AS "publicKey",updated_at AS "updatedAt" FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND target_kind=$2 AND target_id=$3 AND status<>'archived' AND public_key IS NOT NULL AND EXISTS(SELECT 1 FROM store_multilingual_product_content_pages p WHERE p.group_id=store_multilingual_product_content_groups.id AND p.status='published') ORDER BY updated_at DESC LIMIT 1`,
      [org, kind, id],
    );
    if (!group) return null;
    const pages: Page[] = await this.db.query(
      `SELECT id,locale,title,summary,content_format AS "contentFormat",content,status,updated_at AS "updatedAt" FROM store_multilingual_product_content_pages WHERE group_id=$1 AND status='published' ORDER BY is_default DESC,sort_order ASC,locale ASC`,
      [group.id],
    );
    const page = pickFallbackPage(pages, language, group.defaultLocale);
    if (!page) return null;
    return {
      page,
      publicKey: group.publicKey,
      title: group.title,
      passages: passages(page),
      version: digest({ group, page }),
    };
  }
  async prepare(actor: string, org: string, input: Json) {
    if (
      typeof input.mode !== "string" ||
      !validConsultationLanguage(input.language)
    )
      fail(400, "INVALID_GUIDANCE", "상담 방식과 언어를 확인해 주세요.");
    const mode = String(input.mode),
      language = String(input.language),
      question =
        typeof input.question === "string" ? input.question.trim() : "";
    if (question.length > 1000)
      fail(400, "INVALID_GUIDANCE", "질문은 1,000자 이내로 입력해 주세요.");
    const intent = consultationIntent(input.intent, question),
      copy = consultationCopy(language);
    await this.access(actor, org, mode, intent !== "pharmacist");
    if (!intent)
      return { state: "clarify", intent: null, message: copy.purposeQuestion };
    if (intent === "pharmacist") {
      const card: GuidanceCard = {
        kind: "notice",
        title: copy.notice,
        text: copy.pharmacist,
        language,
        requestedLanguage: language,
      };
      return {
        state: "ready",
        intent,
        card,
        proof: {
          mode,
          requestedLanguage: language,
          intent,
          card,
          sourceVersion: digest(card),
        } satisfies GuidanceProof,
      };
    }
    if (!input.productId || !input.productKind)
      return { state: "clarify", intent, message: copy.productQuestion };
    const product = await this.products.product(
      org,
      input.productKind,
      input.productId,
    );
    const identity = {
      productKind: String(input.productKind),
      productId: String(input.productId),
    };
    if (intent === "location" || intent === "find-product") {
      const card: GuidanceCard = {
        kind: "product",
        title: product.name,
        text: product.location
          ? `${copy.location}: ${product.location}`
          : copy.missingLocation,
        language,
        requestedLanguage: language,
        publicKey: product.publicKey,
      };
      const locationVersion = digest(product);
      const canTranslate =
        language !== "ko" && /[가-힣]/.test(product.location || "");
      if (input.translateMaterial === true && canTranslate) {
        const authorize = async () => {
          await this.access(actor, org, mode);
          if (
            digest(
              await this.products.product(
                org,
                identity.productKind,
                identity.productId,
              ),
            ) !== locationVersion
          )
            fail(
              409,
              "GUIDANCE_SOURCE_CHANGED",
              "상품 위치가 변경되었습니다. 다시 준비해 주세요.",
            );
          return true;
        };
        const output = await this.translate(
          {
            text: `상품 위치: ${product.location}`,
            source: "ko",
            target: language as Exclude<ConsultationLocale, "ko">,
          },
          { actorId: actor, organizationId: org, authorize },
        );
        await authorize();
        card.text = output.translation;
        card.translated = true;
        card.source = { title: product.name, language: "ko" };
      }
      await this.access(actor, org, mode);
      return {
        state: "ready",
        canTranslate,
        intent,
        product,
        card,
        proof: {
          mode,
          requestedLanguage: language,
          intent,
          ...identity,
          card,
          sourceVersion: digest(product),
        } satisfies GuidanceProof,
      };
    }
    const material = await this.material(
      org,
      identity.productKind,
      identity.productId,
      language,
    );
    if (!material || !material.passages.length)
      return {
        state: "empty",
        intent,
        product,
        message: material
          ? "이 자료는 원문 화면에서 확인해 주세요."
          : copy.noMaterial,
        publicKey: material?.publicKey ?? product.publicKey,
      };
    const captured = material;
    const authorize = async () => {
      await this.access(actor, org, mode);
      await this.products.product(
        org,
        identity.productKind,
        identity.productId,
      );
      const current = await this.material(
        org,
        identity.productKind,
        identity.productId,
        language,
      );
      if (current?.version !== captured.version)
        fail(
          409,
          "GUIDANCE_SOURCE_CHANGED",
          "게시 자료가 변경되었습니다. 현재 자료로 다시 준비해 주세요.",
        );
      return true;
    };
    const sourceVersion = digest({ product, material: captured.version });
    let chosen = material.passages.slice(0, 1);
    // Translation preserves the already reviewed excerpt without another AI call.
    if (input.selection !== undefined) {
      const selection = input.selection as {
        sourceVersion?: unknown;
        passageIds?: unknown;
      };
      if (!selection || selection.sourceVersion !== sourceVersion)
        fail(
          409,
          "GUIDANCE_SOURCE_CHANGED",
          "게시 자료가 변경되었습니다. 현재 자료로 다시 준비해 주세요.",
        );
      const ids = selection.passageIds;
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        ids.length > 3 ||
        new Set(ids).size !== ids.length ||
        ids.some(
          (id) =>
            !Number.isSafeInteger(id) ||
            !material.passages.some((p) => p.id === id),
        )
      )
        fail(
          400,
          "INVALID_GUIDANCE_SELECTION",
          "게시 자료의 문단을 다시 선택해 주세요.",
        );
      chosen = (ids as number[]).map(
        (id) => material.passages.find((p) => p.id === id)!,
      );
    }
    if (input.useAi === true) {
      if (!question)
        fail(
          400,
          "GUIDANCE_QUESTION_REQUIRED",
          "관련 자료를 추릴 질문을 입력해 주세요.",
        );
      const ids = await this.select(
        { question, productName: product.name, passages: material.passages },
        {
          actorId: actor,
          organizationId: org,
          materialId: material.page.id,
          authorize,
        },
      );
      await authorize();
      if (ids.some((id) => !material!.passages.some((p) => p.id === id)))
        fail(
          503,
          "GUIDANCE_AI_UNAVAILABLE",
          "AI 결과를 확인하지 못했습니다. 게시 자료로 계속해 주세요.",
        );
      chosen = ids.map((id) => material!.passages.find((p) => p.id === id)!);
      if (!chosen.length)
        return {
          state: "empty",
          intent,
          product,
          message:
            "질문에 맞는 게시 문단을 찾지 못했습니다. 원문을 확인하거나 질문을 바꿔 주세요.",
          publicKey: material.publicKey,
        };
    }
    let text = chosen.map((p) => p.text).join("\n\n"),
      actualLanguage = material.page.locale,
      translated = false;
    if (input.translateMaterial === true && actualLanguage !== language) {
      if (actualLanguage !== "ko" || language === "ko" || text.length > 1000)
        fail(
          400,
          "GUIDANCE_TRANSLATION_UNAVAILABLE",
          "이 자료는 바로 번역할 수 없습니다. 표시된 원문 언어로 확인해 주세요.",
        );
      const output = await this.translate(
        {
          text,
          source: "ko",
          target: language as Exclude<ConsultationLocale, "ko">,
        },
        { actorId: actor, organizationId: org, authorize },
      );
      text = output.translation;
      actualLanguage = language;
      translated = true;
    }
    await authorize();
    const card: GuidanceCard = {
      kind: "guidance",
      title: product.name,
      text,
      language: actualLanguage,
      requestedLanguage: language,
      publicKey: captured.publicKey,
      source: { title: captured.page.title, language: captured.page.locale },
      fallbackUsed: actualLanguage !== language,
      translated,
    };
    return {
      state: "ready",
      intent,
      product,
      card,
      canTranslate:
        captured.page.locale === "ko" &&
        language !== "ko" &&
        text.length <= 1000,
      aiSelected: input.useAi === true,
      selection: { sourceVersion, passageIds: chosen.map((p) => p.id) },
      proof: {
        mode,
        requestedLanguage: language,
        intent,
        ...identity,
        card,
        sourceVersion,
      } satisfies GuidanceProof,
    };
  }
  async verify(actor: string, org: string, proof: GuidanceProof) {
    await this.access(actor, org, proof.mode, proof.intent !== "pharmacist");
    if (proof.intent === "pharmacist") {
      if (digest(proof.card) !== proof.sourceVersion)
        fail(409, "GUIDANCE_SOURCE_CHANGED", "안내를 다시 준비해 주세요.");
      return;
    }
    const product = await this.products.product(
      org,
      proof.productKind,
      proof.productId,
    );
    const version =
      proof.intent === "product-details"
        ? digest({
            product,
            material: (
              await this.material(
                org,
                String(proof.productKind),
                String(proof.productId),
                proof.requestedLanguage,
              )
            )?.version,
          })
        : digest(product);
    if (version !== proof.sourceVersion)
      fail(
        409,
        "GUIDANCE_SOURCE_CHANGED",
        "상품 또는 게시 자료가 변경되었습니다. 현재 자료로 다시 준비해 주세요.",
      );
  }

  async verifySupportSource(actor: string, org: string, mode: string, raw: unknown) {
    const proof = raw as Json | null;
    if (!proof || typeof proof !== 'object' || Array.isArray(proof) || proof.mode !== mode ||
      Object.keys(proof).some(key => !['mode', 'productKind', 'productId', 'sourceVersion'].includes(key)) ||
      typeof proof.sourceVersion !== 'string' || !/^[a-f0-9]{64}$/.test(proof.sourceVersion))
      fail(409, 'GUIDANCE_SOURCE_CHANGED', '판단 지원의 현재 근거를 다시 확인해 주세요.');
    const current = await this.supportMaterial(actor, org, { mode, productKind: proof.productKind, productId: proof.productId });
    if (proof.sourceVersion !== current.sourceVersion)
      fail(409, 'GUIDANCE_SOURCE_CHANGED', '상품 또는 상담 근거가 변경되었습니다. 현재 자료로 다시 준비해 주세요.');
    await current.authorize();
  }

  async searchSupportProducts(actor: string, org: string, input: Json) {
    if (!['counter-pharmacist', 'floor-pharmacist'].includes(String(input.mode)))
      fail(403, 'PHARMACIST_CONFIRMATION_REQUIRED', '약사 상담의 사용 확인이 필요합니다.');
    const authorize = async () => { await this.access(actor, org, String(input.mode)); return true; };
    return new ConsultationContextService(this.db, createConsultationContextPlanner(this.db))
      .search(input, { actorId: actor, organizationId: org, authorize });
  }

  async supportMaterial(actor: string, org: string, input: Json) {
    if (input.mode !== 'counter-pharmacist' && input.mode !== 'floor-pharmacist')
      fail(403, 'PHARMACIST_CONFIRMATION_REQUIRED', '약사 상담 방식과 사용 확인이 필요합니다.');
    const mode = String(input.mode);
    await this.access(actor, org, mode);
    const productId = typeof input.productId === 'string' ? input.productId : '';
    const productKind = typeof input.productKind === 'string' ? input.productKind : '';
    const product = await this.products.product(org, productKind, productId);
    const read = () => this.material(org, productKind, productId, 'ko');
    const material = await read();
    const readAi = () => input.productKind === 'listing'
      ? readStoreProductAiContext(this.db, org, productId, 'ko') : Promise.resolve(null);
    const ai = await readAi();
    const sourceVersion = digest({ product, material: material?.version ?? null, ai });
    const authorize = async () => {
      await this.access(actor, org, mode);
      const current = await this.products.product(org, input.productKind, input.productId);
      if (digest({ product: current, material: (await read())?.version ?? null, ai: await readAi() }) !== sourceVersion)
        fail(409, 'GUIDANCE_SOURCE_CHANGED', '상품 또는 게시 자료가 변경되었습니다. 현재 근거로 다시 준비해 주세요.');
      return true;
    };
    const sources: ConsultationSupportSource[] = (material?.passages ?? []).slice(0, 10).map(passage => ({
      id: `p${passage.id}`, kind: 'product-fact', title: `${material!.page.title} · ${material!.page.locale}`,
      text: passage.text,
    }));
    // Only approved, typed B2B sections enter this existing request. Never consume STORE/QR,
    // unpublished candidates or a legacy HTML body as proven product facts.
    sources.unshift(...approvedAiSupportSources(ai, typeof input.question === 'string' ? input.question : ''));
    return { productName: product.name as string, sources, sourceVersion, authorize };
  }
}
