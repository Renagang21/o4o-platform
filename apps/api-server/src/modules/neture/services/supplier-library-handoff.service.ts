/**
 * Supplier Library Handoff Service — Supplier → Service Operator 제공
 *
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 (2026-09-16)
 *
 * 계약 (ROLE-WORKSPACE-ARCHITECTURE §2-1 · WO §9):
 *   Supplier content(neture_supplier_library_items) → Service 선택 → 제공 → Supplier 책임 종료.
 *   이후 검토 · 수정 · 복사 · 발행은 해당 서비스 운영자의 업무다.
 *
 * 구현:
 *   - 원장은 그대로(새 원장 없음). 제공 = 기존 수신 계약 `SupplierContentService.submit` 재사용
 *     (cms_contents authorRole='supplier' status='pending' serviceKey=<서비스 물리 키>,
 *      KPA 만 kpa_approval_requests 추가). 상태 기계 · 전송 엔진 · lineage 없음.
 *   - 대상 서비스는 `listSupplierContentHandoffTargets()` (canonical catalog) 만 허용한다.
 *   - 특정 매장 대상 제공 없음 (WO §11).
 */

import type { DataSource } from 'typeorm';
import { NetureLibraryService } from './neture-library.service.js';
import { SupplierContentService } from '../../../routes/kpa/services/supplier-content.service.js';
import { getSupplierContentHandoffTarget } from '../constants/supplier-content-handoff-targets.js';

export interface HandoffUser {
  id: string;
  name?: string;
  email?: string;
}

export type HandoffResult =
  | { data: { contentId: string; serviceKey: string; cmsServiceKey: string; approvalRequestId: string | null; title: string } }
  | { error: { status: number; code: string; message: string } };

/** 원장 content_type → cms type. 문서는 article, 이미지 파일은 image, 그 외 파일은 link. */
export function toCmsContentType(item: { contentType?: string | null; mimeType?: string | null }): 'article' | 'image' | 'link' {
  if (item.contentType === 'document') return 'article';
  if (typeof item.mimeType === 'string' && item.mimeType.startsWith('image/')) return 'image';
  return 'link';
}

export class SupplierLibraryHandoffService {
  private readonly library: NetureLibraryService;
  private readonly submission: SupplierContentService;

  constructor(dataSource: DataSource) {
    this.library = new NetureLibraryService(dataSource);
    this.submission = new SupplierContentService(dataSource);
  }

  async handoff(supplierId: string, user: HandoffUser, itemId: string, serviceKey: string): Promise<HandoffResult> {
    const target = getSupplierContentHandoffTarget(String(serviceKey ?? '').trim());
    if (!target) {
      return { error: { status: 400, code: 'INVALID_HANDOFF_TARGET', message: '제공할 수 없는 서비스입니다' } };
    }

    const item = await this.library.getByIdForSupplier(itemId, supplierId);
    if (!item) {
      return { error: { status: 404, code: 'ITEM_NOT_FOUND', message: '자료를 찾을 수 없습니다' } };
    }

    const contentType = toCmsContentType(item);
    const body =
      contentType === 'article' && Array.isArray(item.blocks) && item.blocks.length > 0
        ? JSON.stringify(item.blocks)
        : undefined;

    const result = await this.submission.submit(user.id, user, {
      title: item.title,
      summary: item.description ?? undefined,
      body,
      imageUrl: contentType === 'image' ? item.fileUrl || undefined : undefined,
      linkUrl: item.fileUrl || undefined,
      contentType,
      serviceKey: target.cmsServiceKey,
    });

    if (result.error) return { error: result.error };
    return {
      data: {
        contentId: result.data.contentId,
        serviceKey: target.key,
        cmsServiceKey: target.cmsServiceKey,
        approvalRequestId: result.data.approvalRequestId ?? null,
        title: result.data.title,
      },
    };
  }
}
