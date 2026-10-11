import { Repository, type EntityManager } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { NetureSupplier, SupplierStatus, ContactVisibility } from '../entities/index.js';
import logger from '../../../utils/logger.js';

/**
 * WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §9:
 *   canonical 저장 위치가 없는 프로필 필드는 **조용히 버리지 않고** 이 오류로 거부한다.
 *   (이전에는 user_id 가 NULL 이면 오류 없이 사라졌다.)
 */
export class SupplierProfileFieldUnsupportedError extends Error {
  constructor(public readonly fields: string[]) {
    super(`SUPPLIER_PROFILE_FIELD_UNSUPPORTED: ${fields.join(', ')}`);
    this.name = 'SupplierProfileFieldUnsupportedError';
  }
}


/**
 * Supplier Business profile and Organization data only.
 * Lifecycle authorization remains in NetureSupplierService and existing guards.
 * Organization + supplier profile writes share the existing transaction.
 */
export class NetureSupplierBusinessService {
  // Lazy repositories
  private _supplierRepo?: Repository<NetureSupplier>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  async getSupplierOrderCondition(supplierId: string) {
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId, status: SupplierStatus.ACTIVE },
    });
    if (!supplier) return null;
    const org = await this.getOrgData(supplier.organizationId);
    return {
      supplierId: supplier.id,
      supplierName: org?.name ?? '',
      minOrderAmount: supplier.minOrderAmount ?? null,
      minOrderSurcharge: supplier.minOrderSurcharge ?? null,
      note: supplier.orderConditionNote ?? null,
    };
  }

  // ==================== Supplier Profile ====================

  async getSupplierProfile(supplierId: string) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: org-primary read for canonical fields
      const org = await this.getOrgData(supplier.organizationId);

      // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §D · §G (정책 4·6):
      //   이 read 는 더 이상 `users.businessInfo` 를 보지 않는다.
      //   businessInfo 는 **가입 입력 snapshot** 이지 Supplier Business Identity 의 SSOT 가 아니며,
      //   `supplier.userId` 에 의존하는 read 는 canonical 관계가 organization_members 로 옮겨간 뒤에는
      //   성립하지 않는다(운영 3건이 user_id NULL — IR §5).
      //   가입 시점의 businessInfo 는 승인 경로(operator-registration.service)가 이미
      //   organizations(business_number · address · address_detail) 와 neture_suppliers 로 복사하므로
      //   여기서 다시 읽을 필요가 없다.
      //   전용 컬럼이 없는 사업자등록증 기재사항은 organizations.metadata.businessProfile 에 있다(§D).
      const orgBusinessProfile = (org?.metadata?.businessProfile ?? {}) as {
        businessEntityType?: string | null;
        businessStartDate?: string | null;
      };

      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      const addrDetail = org?.address_detail;

      // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
      // 프로필 완성 상태(정보성) — 승인 여부(status)와 분리. 프론트는 이 값을 그대로 사용.
      const missingProfileFields = this.getMissingProfileFields(supplier);

      return {
        id: supplier.id,
        name: org?.name ?? '',
        slug: supplier.slug,
        status: supplier.status,
        profileComplete: missingProfileFields.length === 0,
        missingProfileFields,
        // deprecated 호환 별칭 (승인 게이트 아님)
        activationReady: missingProfileFields.length === 0,
        missingActivationFields: missingProfileFields,
        // Business profile — Organization 이 Business Identity SSOT (정책 4)
        businessNumber: org?.business_number ?? null,
        // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §D:
        //   representativeName · businessType 의 **최종 SSOT 는 Organization** 이다.
        //   이번 WO 는 migration 0 이므로 현재 위치(neture_suppliers)에서 읽고, 이관은 §L 판정 대상이다.
        representativeName: supplier.representativeName || null,
        businessZipCode: addrDetail?.zipCode ?? null,
        businessAddress: org?.address ?? null,
        businessAddressDetail: addrDetail?.detailAddress ?? null,
        managerName: supplier.managerName || null,
        managerPhone: supplier.managerPhone || null,
        businessType: supplier.businessType || null,
        // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §D:
        //   이전에는 users.businessInfo 에서 읽었으나 **그 키는 한 번도 저장된 적이 없다**(IR §5 —
        //   write 가 `if (supplier.userId)` 뒤에서 조용히 skip 됐다).
        //   canonical 위치는 Organization 이다 — 전용 컬럼 신설 전까지 metadata.businessProfile.
        businessEntityType: orgBusinessProfile.businessEntityType ?? null,
        businessStartDate: orgBusinessProfile.businessStartDate ?? null,
        // §E: taxInvoiceEmail 의 write 소유는 onboarding 이고, read 는 여기서 유지한다.
        taxInvoiceEmail: supplier.taxInvoiceEmail || null,
        // deprecated — businessInfo prefill 은퇴 후 항상 false (응답 키만 호환 유지)
        _prefilled: false,
        // Contact visibility and stored order conditions keep their existing response keys.
        ...this.getContactAndOrderProfile(supplier),
        // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1: 배송 정책 (저장/조회 foundation)
        baseShippingFee: supplier.baseShippingFee ?? null,
        freeShippingThreshold: supplier.freeShippingThreshold ?? null,
        averageDispatchDays: supplier.averageDispatchDays ?? null,
        returnExchangeNotice: supplier.returnExchangeNotice ?? null,
        shippingStandard: supplier.shippingStandard ?? null,
        shippingIsland: supplier.shippingIsland ?? null,
        shippingMountain: supplier.shippingMountain ?? null,
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching supplier profile:', error);
      throw error;
    }
  }

  async updateSupplierProfile(
    supplierId: string,
    data: {
      contactEmail?: string;
      contactPhone?: string;
      contactWebsite?: string;
      contactKakao?: string;
      contactEmailVisibility?: ContactVisibility;
      contactPhoneVisibility?: ContactVisibility;
      contactWebsiteVisibility?: ContactVisibility;
      contactKakaoVisibility?: ContactVisibility;
      // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
      businessNumber?: string;
      representativeName?: string;
      businessAddress?: string;
      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      businessZipCode?: string;
      businessAddressDetail?: string;
      managerName?: string;
      managerPhone?: string;
      businessType?: string;
      businessItem?: string;
      // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §E (정책 7):
      //   공급자 본인 경로(PATCH /supplier/profile)는 더 이상 이 필드를 보내지 않는다 —
      //   세금계산서 이메일의 소유는 onboarding(정산 축) 단일이다.
      //   이 도메인 메서드는 **운영자 기본정보 보완 경로**(PATCH /operator/suppliers/:id ·
      //   승인 전 필수 정보 화이트리스트)가 함께 쓰므로 §11(Operator 경계 불변)에 따라 인자로는 남긴다.
      taxInvoiceEmail?: string;
      // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
      //   사업자등록증 P4 fields — 저장 위치 부재. §D·§9 로 명시 거부한다.
      businessEntityType?: string;
      businessStartDate?: string;
      // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
      minOrderAmount?: number | null;
      minOrderSurcharge?: number | null;
      orderConditionNote?: string | null;
      // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1: 배송 정책 (저장 foundation)
      baseShippingFee?: number | null;
      freeShippingThreshold?: number | null;
      averageDispatchDays?: number | null;
      returnExchangeNotice?: string | null;
      shippingStandard?: string | null;
      shippingIsland?: string | null;
      shippingMountain?: string | null;
    },
  ) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      // Existing contact fields
      if (data.contactEmail !== undefined) supplier.contactEmail = data.contactEmail || '';
      if (data.contactPhone !== undefined) supplier.contactPhone = data.contactPhone ? data.contactPhone.replace(/\D/g, '') : '';
      if (data.contactWebsite !== undefined) supplier.contactWebsite = data.contactWebsite || '';
      if (data.contactKakao !== undefined) supplier.contactKakao = data.contactKakao || '';
      if (data.contactEmailVisibility !== undefined) supplier.contactEmailVisibility = data.contactEmailVisibility;
      if (data.contactPhoneVisibility !== undefined) supplier.contactPhoneVisibility = data.contactPhoneVisibility;
      if (data.contactWebsiteVisibility !== undefined) supplier.contactWebsiteVisibility = data.contactWebsiteVisibility;
      if (data.contactKakaoVisibility !== undefined) supplier.contactKakaoVisibility = data.contactKakaoVisibility;

      // Business profile fields (WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1)
      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: businessNumber/businessAddress → org only
      if (data.representativeName !== undefined) supplier.representativeName = data.representativeName || null;
      if (data.managerName !== undefined) supplier.managerName = data.managerName || null;
      if (data.managerPhone !== undefined) supplier.managerPhone = data.managerPhone ? data.managerPhone.replace(/\D/g, '') : null;
      if (data.businessType !== undefined) supplier.businessType = data.businessType || null;
      if (data.businessItem !== undefined) supplier.businessItem = data.businessItem || null;
      // §E: 공급자 profile route 는 이 값을 더 이상 보내지 않는다(onboarding 단일 소유).
      //     남은 유일한 호출자는 운영자 기본정보 보완 경로다 — §11 경계 유지.
      if (data.taxInvoiceEmail !== undefined) supplier.taxInvoiceEmail = data.taxInvoiceEmail || null;

      // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1: B2B order condition
      if (data.minOrderAmount !== undefined) {
        supplier.minOrderAmount = data.minOrderAmount === null || data.minOrderAmount === 0 ? null : data.minOrderAmount;
      }
      if (data.minOrderSurcharge !== undefined) {
        supplier.minOrderSurcharge = data.minOrderSurcharge === null || data.minOrderSurcharge === 0 ? null : data.minOrderSurcharge;
      }
      if (data.orderConditionNote !== undefined) {
        supplier.orderConditionNote = data.orderConditionNote ? data.orderConditionNote.trim() : null;
      }

      // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1: 배송 정책 (저장만, 계산 미적용)
      if (data.baseShippingFee !== undefined) {
        supplier.baseShippingFee = data.baseShippingFee == null || data.baseShippingFee < 0 ? null : data.baseShippingFee;
      }
      if (data.freeShippingThreshold !== undefined) {
        supplier.freeShippingThreshold = data.freeShippingThreshold == null || data.freeShippingThreshold < 0 ? null : data.freeShippingThreshold;
      }
      if (data.averageDispatchDays !== undefined) {
        supplier.averageDispatchDays = data.averageDispatchDays == null || data.averageDispatchDays < 0 ? null : data.averageDispatchDays;
      }
      if (data.returnExchangeNotice !== undefined) {
        supplier.returnExchangeNotice = data.returnExchangeNotice ? data.returnExchangeNotice.trim() : null;
      }
      if (data.shippingStandard !== undefined) {
        supplier.shippingStandard = data.shippingStandard ? data.shippingStandard.trim() : null;
      }
      if (data.shippingIsland !== undefined) {
        supplier.shippingIsland = data.shippingIsland ? data.shippingIsland.trim() : null;
      }
      if (data.shippingMountain !== undefined) {
        supplier.shippingMountain = data.shippingMountain ? data.shippingMountain.trim() : null;
      }

      // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §D (정책 4·16):
      //   businessEntityType / businessStartDate 의 canonical 소유자는 **Organization** 이다.
      //   이전 저장 위치였던 users.businessInfo 는 §G 로 은퇴했고, 두 키는 `if (supplier.userId)`
      //   가드 때문에 **한 번도 저장된 적이 없다**(IR §5). 전용 컬럼 신설은 §L 판정 대상이므로
      //   이번에는 **migration 0** 으로 `organizations.metadata.businessProfile` 에 둔다
      //   (metadata = 조직 확장 필드 jsonb · DDL 0 · 엔티티 변경 0).
      const businessProfileWriteNeeded =
        data.businessEntityType !== undefined || data.businessStartDate !== undefined;

      // §9 silent success 금지:
      //   조직이 연결돼 있지 않으면 canonical 저장 위치 자체가 없다. 조용히 버리지 않고 거부한다.
      if (businessProfileWriteNeeded && !supplier.organizationId) {
        throw new SupplierProfileFieldUnsupportedError(
          (['businessEntityType', 'businessStartDate'] as const).filter((k) => data[k] !== undefined),
        );
      }

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: org-only write (no supplier reverse-sync)
      const orgWriteNeeded =
        data.businessNumber !== undefined ||
        data.businessAddress !== undefined ||
        data.businessZipCode !== undefined ||
        data.businessAddressDetail !== undefined ||
        data.contactPhone !== undefined ||
        businessProfileWriteNeeded;
      // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §F:
      //   하나의 사용자 action 이 **두 canonical resource**(organizations · neture_suppliers)를
      //   바꿔야 하므로 단일 트랜잭션으로 묶는다. 이전엔 순차 write 였어
      //   "organizations 저장 성공 + neture_suppliers 저장 실패" 같은 부분 반영이 가능했다.
      await AppDataSource.transaction(async (manager) => {
        if (orgWriteNeeded && supplier.organizationId) {
          // WO-O4O-POSTAL-CODE-ADDRESS-V1: build address_detail JSONB
          let addressDetail: Record<string, string | null> | undefined;
          if (data.businessAddress !== undefined || data.businessZipCode !== undefined || data.businessAddressDetail !== undefined) {
            // Read existing address_detail to merge (같은 TX 안에서 읽는다)
            const orgRows = await manager.query(
              `SELECT address_detail FROM organizations WHERE id = $1`,
              [supplier.organizationId],
            );
            const existing = (orgRows[0]?.address_detail as Record<string, string | null>) || {};
            addressDetail = {
              zipCode: data.businessZipCode !== undefined ? (data.businessZipCode || null) : (existing.zipCode || null),
              baseAddress: data.businessAddress !== undefined ? (data.businessAddress || '') : (existing.baseAddress || ''),
              detailAddress: data.businessAddressDetail !== undefined ? (data.businessAddressDetail || null) : (existing.detailAddress || null),
            };
          }

          await this.writeOrgBusinessData(
            supplier.organizationId,
            {
              business_number: data.businessNumber !== undefined ? (data.businessNumber || null) : undefined,
              address: data.businessAddress !== undefined ? (data.businessAddress || null) : undefined,
              phone: data.contactPhone !== undefined ? (data.contactPhone ? data.contactPhone.replace(/\D/g, '') : null) : undefined,
              address_detail: addressDetail,
              // §D: 사업자등록증 기재사항 — Organization 확장 필드에 저장(migration 0)
              business_profile: businessProfileWriteNeeded
                ? {
                    businessEntityType: data.businessEntityType !== undefined ? (data.businessEntityType || null) : undefined,
                    businessStartDate: data.businessStartDate !== undefined ? (data.businessStartDate || null) : undefined,
                  }
                : undefined,
            },
            manager,
          );
        }

        await manager.getRepository(NetureSupplier).save(supplier);
      });

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: read org for canonical fields
      const org = await this.getOrgData(supplier.organizationId);

      // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §D · §G:
      //   `users.businessInfo` 는 **가입 입력 snapshot** 이며 Supplier profile 의 read/write SSOT 가 아니다.
      //   businessEntityType / businessStartDate 는 위 트랜잭션에서 Organization 에 저장했으므로
      //   여기서 businessInfo 를 읽거나 쓰지 않는다.
      const savedBusinessProfile = (org?.metadata?.businessProfile ?? {}) as {
        businessEntityType?: string | null;
        businessStartDate?: string | null;
      };

      return {
        id: supplier.id,
        // Business profile — org SSOT
        businessNumber: org?.business_number ?? null,
        representativeName: supplier.representativeName || null,
        businessZipCode: org?.address_detail?.zipCode ?? null,
        businessAddress: org?.address ?? null,
        businessAddressDetail: org?.address_detail?.detailAddress ?? null,
        managerName: supplier.managerName || null,
        managerPhone: supplier.managerPhone || null,
        businessType: supplier.businessType || null,
        businessItem: supplier.businessItem || null,
        // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §D:
        //   Organization 이 canonical 소유자 — 전용 컬럼 신설 전까지 metadata.businessProfile.
        businessEntityType: savedBusinessProfile.businessEntityType ?? null,
        businessStartDate: savedBusinessProfile.businessStartDate ?? null,
        taxInvoiceEmail: supplier.taxInvoiceEmail || null,
        ...this.getContactAndOrderProfile(supplier),
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error updating supplier profile:', error);
      throw error;
    }
  }

  /** Response projection shared by profile GET and PATCH; no new response fields. */
  private getContactAndOrderProfile(supplier: NetureSupplier) {
    return {
      contactEmail: supplier.contactEmail || null,
      contactPhone: supplier.contactPhone || null,
      contactWebsite: supplier.contactWebsite || null,
      contactKakao: supplier.contactKakao || null,
      contactEmailVisibility: supplier.contactEmailVisibility,
      contactPhoneVisibility: supplier.contactPhoneVisibility,
      contactWebsiteVisibility: supplier.contactWebsiteVisibility,
      contactKakaoVisibility: supplier.contactKakaoVisibility,
      minOrderAmount: supplier.minOrderAmount ?? null,
      minOrderSurcharge: supplier.minOrderSurcharge ?? null,
      orderConditionNote: supplier.orderConditionNote ?? null,
    };
  }

  /**
   * WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B:
   * Write business data to organizations (SSOT). Partial update — only provided fields.
   */
  private async writeOrgBusinessData(
    organizationId: string,
    data: {
      business_number?: string | null;
      address?: string | null;
      phone?: string | null;
      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      address_detail?: Record<string, string | null> | null;
      /**
       * WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §D:
       *   `organizations.metadata.businessProfile` 로 merge 되는 사업자등록증 기재사항.
       *   값이 `undefined` 인 키는 건드리지 않는다(부분 수정).
       */
      business_profile?: Record<string, string | null | undefined>;
    },
    /**
     * WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §F:
     *   호출자가 트랜잭션 안에서 쓸 수 있도록 EntityManager 를 받는다.
     *   주어지지 않으면 기존처럼 AppDataSource 를 쓴다(무회귀).
     */
    manager?: EntityManager,
  ): Promise<void> {
    {
      const setClauses: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (data.business_number !== undefined) {
        setClauses.push(`business_number = $${idx++}`);
        params.push(data.business_number);
      }
      if (data.address !== undefined) {
        setClauses.push(`address = $${idx++}`);
        params.push(data.address);
      }
      if (data.phone !== undefined) {
        setClauses.push(`phone = $${idx++}`);
        params.push(data.phone);
      }
      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      if (data.address_detail !== undefined) {
        setClauses.push(`address_detail = $${idx++}`);
        params.push(data.address_detail ? JSON.stringify(data.address_detail) : null);
      }

      // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §D:
      //   metadata 는 조직 공통 확장 필드라 다른 서비스 key 와 같은 컬럼을 공유한다.
      //   전체 덮어쓰기는 남의 키를 지우므로 **읽어서 merge** 한 뒤 되쓴다(같은 TX 안).
      //   `||` jsonb 연산자를 쓰지 않는 이유: 이 컬럼의 물리 타입(json vs jsonb)을 코드에서
      //   단정하지 않기 위해서다 — users."businessInfo" 가 json 이라 jsonb 연산이 깨진 선례가 있다.
      //   문자열 파라미터 대입은 두 타입 모두에서 동작한다(address_detail 과 동일한 방식).
      const runner = manager ?? AppDataSource;

      if (data.business_profile !== undefined) {
        const rows = await runner.query(
          `SELECT metadata FROM organizations WHERE id = $1 LIMIT 1`,
          [organizationId],
        );
        const currentMeta = (rows[0]?.metadata as Record<string, any>) || {};
        const currentProfile = (currentMeta.businessProfile as Record<string, unknown>) || {};
        const nextProfile = { ...currentProfile };
        for (const [key, value] of Object.entries(data.business_profile)) {
          if (value !== undefined) nextProfile[key] = value;
        }
        setClauses.push(`metadata = $${idx++}`);
        params.push(JSON.stringify({ ...currentMeta, businessProfile: nextProfile }));
      }

      if (setClauses.length === 0) return;

      setClauses.push(`"updatedAt" = NOW()`);
      params.push(organizationId);

      // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §F · §9:
      //   이전엔 catch 가 실패를 삼켜 warn 만 남기고 **성공처럼 응답**했다.
      //   트랜잭션 안에서 그러면 롤백이 일어나지 않아 부분 반영이 남는다 — 오류를 전파한다.
      await runner.query(
        `UPDATE organizations SET ${setClauses.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }
  }

  async getOrgData(organizationId: string | null): Promise<{
    name: string;
    business_number: string | null;
    address: string | null;
    phone: string | null;
    address_detail: Record<string, string | null> | null;
    // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §D:
    //   조직 확장 필드. Supplier Business Identity 중 전용 컬럼이 없는 항목을
    //   `metadata.businessProfile` 에 둔다(migration 0 · 전용 컬럼화는 §L 판정).
    metadata: Record<string, any> | null;
  } | null> {
    if (!organizationId) return null;

    try {
      const rows = await AppDataSource.query(
        `SELECT name, business_number, address, phone, address_detail, metadata FROM organizations WHERE id = $1 LIMIT 1`,
        [organizationId],
      );
      return rows[0] || null;
    } catch (error) {
      logger.warn(`[NetureSupplierService] Org data read failed for ${organizationId}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch org data for a list of organization IDs.
   * Returns Map<orgId, orgData> for efficient list rendering.
   */
  async getOrgDataBatch(organizationIds: string[]): Promise<Map<string, {
    name: string;
    business_number: string | null;
    address: string | null;
    phone: string | null;
  }>> {
    const map = new Map<string, { name: string; business_number: string | null; address: string | null; phone: string | null }>();
    if (organizationIds.length === 0) return map;

    try {
      const rows: Array<{ id: string; name: string; business_number: string | null; address: string | null; phone: string | null }> =
        await AppDataSource.query(
          `SELECT id, name, business_number, address, phone FROM organizations WHERE id = ANY($1)`,
          [organizationIds],
        );
      for (const row of rows) {
        map.set(row.id, { name: row.name, business_number: row.business_number, address: row.address, phone: row.phone });
      }
    } catch (error) {
      logger.warn('[NetureSupplierService] Org batch read failed:', error);
    }
    return map;
  }

  getMissingProfileFields(supplier: NetureSupplier): string[] {
    const missing: string[] = [];
    if (!supplier.representativeName?.trim()) missing.push('representativeName');
    if (!supplier.managerName?.trim()) missing.push('managerName');
    if (!supplier.managerPhone?.trim()) missing.push('managerPhone');
    return missing;
  }

}
