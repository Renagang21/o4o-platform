/**
 * POP V2 Document Service — 저장 / 재편집 / 복제 / 보관
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 정본 계약: docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md
 *
 * 기존 POP 은 "만들면 끝"이었다 — 목록도 재편집도 없었고 그것이 실사용 0 의 구조적 원인이다.
 * 이 서비스가 POP 을 **관리 가능한 문서**로 만든다.
 *
 * 불변식
 *   I1 Source-Required   — sources 가 비면 저장을 거부한다(DB CHECK 와 이중 방어).
 *   I2 원본 불변         — fields 만 갱신한다. source 원장에 write 하는 경로가 없다.
 *   I3 Output-Append-Only— 출력 이력은 store_execution_assets 에 append 하고
 *                          Document 에는 마지막 산출물 포인터만 남긴다.
 *   경계                 — 모든 조회·수정에 organization_id 를 건다 (Boundary Guard Rule 1·3).
 */

import type { DataSource } from 'typeorm';
import {
  StorePopDocument,
  type PopV2ContentType,
  type PopV2Fields,
  type PopV2Kind,
  type PopV2Layout,
  type PopV2Source,
  type PopV2Status,
} from '../../routes/o4o-store/entities/store-pop-document.entity.js';

export class PopV2ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PopV2ValidationError';
  }
}

export interface PopV2DocumentInput {
  title: string;
  popKind: PopV2Kind;
  contentType?: PopV2ContentType | null;
  sources: PopV2Source[];
  fields: PopV2Fields;
  templateId: string;
  layout: PopV2Layout;
  qrCodeId?: string | null;
  status?: PopV2Status;
}

const VALID_ORIGINS = new Set([
  'direct',
  'snapshot',
  'library',
  'local',
  'store_pop',
  'spd',
  'listing',
]);

const VALID_CONTENT_TYPES = new Set([
  'health-info',
  'consult',
  'seasonal',
  'store-guide',
  'campaign',
  'general',
]);

/** I1 을 애플리케이션 층에서도 강제한다 — DB CHECK 는 최후 방어선이지 유일 방어선이 아니다. */
function assertValid(input: PopV2DocumentInput): void {
  if (!input.title?.trim()) {
    throw new PopV2ValidationError('POP 제목이 필요합니다.', 'POP_TITLE_REQUIRED');
  }
  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new PopV2ValidationError(
      'POP 은 기존 콘텐츠 소스를 최소 1개 참조해야 합니다.',
      'POP_SOURCE_REQUIRED',
    );
  }
  for (const s of input.sources) {
    if (!s || !VALID_ORIGINS.has(s.origin) || !s.id) {
      throw new PopV2ValidationError('알 수 없는 콘텐츠 소스입니다.', 'POP_SOURCE_INVALID');
    }
  }
  if (input.popKind !== 'product' && input.popKind !== 'content') {
    throw new PopV2ValidationError('POP 종류가 올바르지 않습니다.', 'POP_KIND_INVALID');
  }
  if (input.popKind === 'content') {
    if (!input.contentType || !VALID_CONTENT_TYPES.has(input.contentType)) {
      throw new PopV2ValidationError(
        '일반 콘텐츠 POP 은 유형을 선택해야 합니다.',
        'POP_CONTENT_TYPE_REQUIRED',
      );
    }
  }
  if (input.layout !== 'A4' && input.layout !== 'A5') {
    throw new PopV2ValidationError('지원하지 않는 용지 규격입니다.', 'POP_LAYOUT_INVALID');
  }
  if (!input.templateId?.trim()) {
    throw new PopV2ValidationError('템플릿을 선택해 주세요.', 'POP_TEMPLATE_REQUIRED');
  }
}

function normalizeFields(f: Partial<PopV2Fields> | undefined): PopV2Fields {
  return {
    title: f?.title ?? '',
    bullets: Array.isArray(f?.bullets) ? f!.bullets.filter((b) => !!b) : [],
    shortText: f?.shortText ?? '',
    longText: f?.longText ?? '',
    imageUrl: f?.imageUrl ?? null,
  };
}

export async function listPopDocuments(
  ds: DataSource,
  organizationId: string,
  opts: { status?: PopV2Status | 'all'; limit?: number } = {},
): Promise<StorePopDocument[]> {
  const repo = ds.getRepository(StorePopDocument);
  const where: Record<string, unknown> = { organizationId };
  // 기본 목록은 보관함을 감춘다. 보관 POP 은 status=archived 로 명시 조회한다.
  if (!opts.status || opts.status === 'all') {
    return repo
      .createQueryBuilder('d')
      .where('d.organization_id = :organizationId', { organizationId })
      .andWhere(opts.status === 'all' ? '1=1' : "d.status <> 'archived'")
      .orderBy('d.updated_at', 'DESC')
      .take(opts.limit ?? 100)
      .getMany();
  }
  where.status = opts.status;
  return repo.find({
    where: where as any,
    order: { updatedAt: 'DESC' },
    take: opts.limit ?? 100,
  });
}

export async function getPopDocument(
  ds: DataSource,
  organizationId: string,
  id: string,
): Promise<StorePopDocument | null> {
  return ds.getRepository(StorePopDocument).findOne({ where: { id, organizationId } });
}

export async function createPopDocument(
  ds: DataSource,
  params: {
    organizationId: string;
    serviceKey: string;
    createdBy?: string | null;
    input: PopV2DocumentInput;
  },
): Promise<StorePopDocument> {
  assertValid(params.input);
  const repo = ds.getRepository(StorePopDocument);
  const doc = repo.create({
    organizationId: params.organizationId,
    serviceKey: params.serviceKey,
    title: params.input.title.trim(),
    popKind: params.input.popKind,
    contentType: params.input.popKind === 'content' ? params.input.contentType! : null,
    sources: params.input.sources,
    fields: normalizeFields(params.input.fields),
    templateId: params.input.templateId,
    layout: params.input.layout,
    qrCodeId: params.input.qrCodeId ?? null,
    status: params.input.status ?? 'draft',
    lastOutputAssetId: null,
    createdBy: params.createdBy ?? null,
  });
  return repo.save(doc);
}

/** 재편집 — fields / 템플릿 / 레이아웃 / QR / 제목만 바꾼다. source 원장은 건드리지 않는다(I2). */
export async function updatePopDocument(
  ds: DataSource,
  organizationId: string,
  id: string,
  input: PopV2DocumentInput,
): Promise<StorePopDocument | null> {
  assertValid(input);
  const repo = ds.getRepository(StorePopDocument);
  const doc = await repo.findOne({ where: { id, organizationId } });
  if (!doc) return null;

  doc.title = input.title.trim();
  doc.popKind = input.popKind;
  doc.contentType = input.popKind === 'content' ? input.contentType! : null;
  doc.sources = input.sources;
  doc.fields = normalizeFields(input.fields);
  doc.templateId = input.templateId;
  doc.layout = input.layout;
  doc.qrCodeId = input.qrCodeId ?? null;
  if (input.status) doc.status = input.status;
  return repo.save(doc);
}

/** 복제 — 항상 draft 로 시작한다. 산출물 포인터는 승계하지 않는다(I3). */
export async function duplicatePopDocument(
  ds: DataSource,
  organizationId: string,
  id: string,
  createdBy?: string | null,
): Promise<StorePopDocument | null> {
  const repo = ds.getRepository(StorePopDocument);
  const src = await repo.findOne({ where: { id, organizationId } });
  if (!src) return null;

  const copy = repo.create({
    organizationId: src.organizationId,
    serviceKey: src.serviceKey,
    title: `${src.title} (사본)`.slice(0, 255),
    popKind: src.popKind,
    contentType: src.contentType,
    sources: src.sources,
    fields: src.fields,
    templateId: src.templateId,
    layout: src.layout,
    qrCodeId: src.qrCodeId,
    status: 'draft',
    lastOutputAssetId: null,
    createdBy: createdBy ?? null,
  });
  return repo.save(copy);
}

/** 보관 / 복원. 삭제가 아니다 — 과거 POP 과 그 산출물 이력을 보존한다. */
export async function setPopDocumentArchived(
  ds: DataSource,
  organizationId: string,
  id: string,
  archived: boolean,
): Promise<StorePopDocument | null> {
  const repo = ds.getRepository(StorePopDocument);
  const doc = await repo.findOne({ where: { id, organizationId } });
  if (!doc) return null;
  doc.status = archived ? 'archived' : 'draft';
  return repo.save(doc);
}

/** I3 — 출력 후 마지막 산출물 포인터만 갱신한다. 이력 자체는 execution asset 이 갖는다. */
export async function markPopDocumentRendered(
  ds: DataSource,
  organizationId: string,
  id: string,
  assetId: string | null,
): Promise<void> {
  const repo = ds.getRepository(StorePopDocument);
  const doc = await repo.findOne({ where: { id, organizationId } });
  if (!doc) return;
  doc.lastOutputAssetId = assetId;
  if (doc.status === 'draft') doc.status = 'ready';
  await repo.save(doc);
}
