/** 자료 목록 + 총 건수. total 로 조회 범위(limit) 밖 존재 여부를 판단한다. */
export interface SupplierLibraryItemsResult {
  items: SupplierLibraryItem[];
  total: number;
}

export interface SupplierLibraryItem {
  id: string;
  supplierId: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  // ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1)
  producer?: string;
  visibility?: string;
  contentType?: string;
  metaStatus?: string;
  // document type (WO-NETURE-CONTENT-META-DOCUMENT-PATH-COMPLETION-V1)
  blocks?: Record<string, unknown>[] | null;
}

// WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 — Supplier → Service Operator 제공
export interface SupplierLibraryHandoffTarget {
  key: string;
  name: string;
  nameKo: string;
}

export interface SupplierLibraryHandoffResult {
  contentId: string;
  serviceKey: string;
  cmsServiceKey: string;
  approvalRequestId: string | null;
  title: string;
  /**
   * WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1 §7.1:
   *   true = 이미 제공된 자료라 서버가 **새 수신을 만들지 않고** 기존 것을 돌려줬다(HTTP 200).
   *   false = 새로 제공됐다(HTTP 201). 사용자에게 두 경우를 다르게 알린다.
   */
  reused?: boolean;
}
