/**
 * AutoReorderService
 *
 * 자동발주 엔진 - 재고 기반 발주 후보 생성 및 최적화
 *
 * 핵심 알고리즘:
 * requiredQuantity = (ASU * leadTimeDays) + safetyStock - currentStock
 *
 * @package @o4o/pharmacyops
 */

import { Repository, In } from 'typeorm';
import { PharmacyInventory, InventoryStatus } from '../entities/PharmacyInventory.entity.js';

// ========================================
// Types
// ========================================

/**
 * 공급자 Offer 정보
 */
export interface SupplierOffer {
  supplierId: string;
  supplierName: string;
  supplierType: 'wholesaler' | 'manufacturer';
  productId: string;
  price: number;
  stockQuantity: number;
  leadTime: number; // 배송 소요일
  hasColdChain: boolean;
  hasNarcoticsLicense: boolean;
  isPreferred: boolean;
  minimumOrderQuantity: number;
  metadata?: Record<string, any>;
}

/**
 * 자동발주 후보 항목
 */
export interface ReorderCandidate {
  inventory: PharmacyInventory;
  suggestedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  daysUntilStockout: number | null;
  estimatedCost: number;
  bestOffer: SupplierOffer | null;
  alternativeOffers: SupplierOffer[];
}

/**
 * 발주 요청 항목
 */
export interface ReorderRequestItem {
  inventoryId: string;
  productId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requiresColdChain: boolean;
  isNarcotic: boolean;
}

/**
 * 발주 확정 결과
 */
export interface ReorderConfirmation {
  orderId: string;
  pharmacyId: string;
  items: ReorderRequestItem[];
  totalAmount: number;
  estimatedDeliveryDate: Date;
  supplierBreakdown: Array<{
    supplierId: string;
    supplierName: string;
    itemCount: number;
    subtotal: number;
  }>;
}

/**
 * 자동발주 설정
 */
export interface AutoReorderConfig {
  defaultLeadTimeDays: number;
  priceWeight: number;
  stockWeight: number;
  speedWeight: number;
  complianceWeight: number;
  preferredSupplierBonus: number;
}

// ========================================
// Default Configuration
// ========================================

const DEFAULT_CONFIG: AutoReorderConfig = {
  defaultLeadTimeDays: 3,
  priceWeight: 0.4,
  stockWeight: 0.25,
  speedWeight: 0.2,
  complianceWeight: 0.15,
  preferredSupplierBonus: 0.1,
};

// ========================================
// Service
// ========================================

export class AutoReorderService {
  private config: AutoReorderConfig;

  constructor(
    private inventoryRepository: Repository<PharmacyInventory>,
    config?: Partial<AutoReorderConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 자동발주 후보 목록 생성
   */
  async generateReorderCandidates(
    pharmacyId: string,
    supplierOffers: SupplierOffer[]
  ): Promise<ReorderCandidate[]> {
    // 재주문 필요한 재고 조회
    const inventories = await this.inventoryRepository.find({
      where: {
        pharmacyId,
        status: In([InventoryStatus.LOW, InventoryStatus.OUT_OF_STOCK]),
      },
      order: {
        currentStock: 'ASC',
      },
    });

    const candidates: ReorderCandidate[] = [];

    for (const inventory of inventories) {
      // 해당 제품의 Offer 필터링
      const productOffers = supplierOffers.filter(
        (o) => o.productId === inventory.productId
      );

      // 공급 가능한 Offer가 없으면 스킵
      if (productOffers.length === 0) {
        continue;
      }

      // 규정 필터링 (냉장, 마약류)
      const validOffers = this.filterValidOffers(inventory, productOffers);
      if (validOffers.length === 0) {
        continue;
      }

      // 최적 Offer 선택
      const rankedOffers = this.rankOffers(validOffers, inventory);
      const bestOffer = rankedOffers[0];

      // 발주 수량 계산
      const suggestedQuantity = this.calculateOrderQuantity(
        inventory,
        bestOffer.leadTime
      );

      if (suggestedQuantity <= 0) {
        continue;
      }

      // 긴급도 계산
      const daysUntilStockout = this.calculateDaysUntilStockout(inventory);
      const urgency = this.calculateUrgency(inventory, daysUntilStockout);

      // 예상 비용 계산
      const estimatedCost = suggestedQuantity * bestOffer.price;

      candidates.push({
        inventory,
        suggestedQuantity,
        urgency,
        reason: this.generateReason(inventory, urgency),
        daysUntilStockout,
        estimatedCost,
        bestOffer,
        alternativeOffers: rankedOffers.slice(1, 4), // Top 3 대안
      });
    }

    // 긴급도 순 정렬
    return this.sortByUrgency(candidates);
  }

  /**
   * 단일 제품 발주 수량 계산
   *
   * 공식: requiredQuantity = (ASU * leadTimeDays) + safetyStock - currentStock
   */
  calculateOrderQuantity(
    inventory: PharmacyInventory,
    leadTimeDays?: number
  ): number {
    const leadTime = leadTimeDays ?? this.config.defaultLeadTimeDays;
    const asu = Number(inventory.averageDailyUsage);

    const required =
      asu * leadTime + inventory.safetyStock - inventory.currentStock;

    // 최소 주문 수량 적용
    const quantity = Math.max(required, inventory.minOrderQuantity);

    // 최대 재고를 초과하지 않도록 조정
    if (inventory.maxStock) {
      const maxOrder = inventory.maxStock - inventory.currentStock;
      return Math.max(0, Math.min(Math.ceil(quantity), maxOrder));
    }

    return Math.max(0, Math.ceil(quantity));
  }

  /**
   * Offer 순위 계산 (Multi-Supplier 최적화)
   *
   * rankingScore = (priceWeight / price) +
   *                (stockWeight * stockAvailability) +
   *                (speedWeight / leadTime) +
   *                (complianceWeight * coldChainCapability) +
   *                (preferredBonus)
   */
  rankOffers(
    offers: SupplierOffer[],
    inventory: PharmacyInventory
  ): SupplierOffer[] {
    const scoredOffers = offers.map((offer) => {
      // 가격 점수 (저렴할수록 높음)
      const maxPrice = Math.max(...offers.map((o) => o.price));
      const priceScore = maxPrice > 0
        ? (1 - offer.price / maxPrice) * this.config.priceWeight
        : 0;

      // 재고 점수 (재고 있으면 1, 없으면 0)
      const stockScore =
        (offer.stockQuantity > 0 ? 1 : 0) * this.config.stockWeight;

      // 배송 속도 점수 (빠를수록 높음)
      const maxLeadTime = Math.max(...offers.map((o) => o.leadTime), 1);
      const speedScore =
        (1 - offer.leadTime / maxLeadTime) * this.config.speedWeight;

      // 규정 준수 점수
      let complianceScore = 0;
      if (inventory.requiresColdChain && offer.hasColdChain) {
        complianceScore += this.config.complianceWeight / 2;
      }
      if (inventory.isNarcotic && offer.hasNarcoticsLicense) {
        complianceScore += this.config.complianceWeight / 2;
      }
      if (!inventory.requiresColdChain && !inventory.isNarcotic) {
        complianceScore = this.config.complianceWeight;
      }

      // 선호 공급자 보너스
      const preferredBonus = offer.isPreferred
        ? this.config.preferredSupplierBonus
        : 0;

      const totalScore =
        priceScore + stockScore + speedScore + complianceScore + preferredBonus;

      return { offer, score: totalScore };
    });

    // 점수 높은 순 정렬
    return scoredOffers
      .sort((a, b) => b.score - a.score)
      .map((s) => s.offer);
  }

  /**
   * 발주 후보를 공급자별로 그룹화
   */
  groupCandidatesBySupplier(
    candidates: ReorderCandidate[]
  ): Map<string, ReorderCandidate[]> {
    const groups = new Map<string, ReorderCandidate[]>();

    for (const candidate of candidates) {
      if (!candidate.bestOffer) continue;

      const supplierId = candidate.bestOffer.supplierId;
      if (!groups.has(supplierId)) {
        groups.set(supplierId, []);
      }
      groups.get(supplierId)!.push(candidate);
    }

    return groups;
  }

  /**
   * 발주 요청 생성
   */
  createReorderRequest(
    pharmacyId: string,
    candidates: ReorderCandidate[]
  ): ReorderRequestItem[] {
    return candidates
      .filter((c) => c.bestOffer !== null)
      .map((candidate) => ({
        inventoryId: candidate.inventory.id,
        productId: candidate.inventory.productId,
        supplierId: candidate.bestOffer!.supplierId,
        quantity: candidate.suggestedQuantity,
        unitPrice: candidate.bestOffer!.price,
        totalPrice: candidate.suggestedQuantity * candidate.bestOffer!.price,
        requiresColdChain: candidate.inventory.requiresColdChain,
        isNarcotic: candidate.inventory.isNarcotic,
      }));
  }

  /**
   * 발주 총액 계산
   */
  calculateTotalAmount(candidates: ReorderCandidate[]): number {
    return candidates.reduce((sum, c) => sum + c.estimatedCost, 0);
  }

  /**
   * 발주 요약 통계
   */
  getReorderSummary(candidates: ReorderCandidate[]): {
    totalItems: number;
    criticalItems: number;
    highPriorityItems: number;
    totalAmount: number;
    supplierCount: number;
    coldChainItems: number;
    narcoticItems: number;
  } {
    const groups = this.groupCandidatesBySupplier(candidates);

    return {
      totalItems: candidates.length,
      criticalItems: candidates.filter((c) => c.urgency === 'critical').length,
      highPriorityItems: candidates.filter((c) => c.urgency === 'high').length,
      totalAmount: this.calculateTotalAmount(candidates),
      supplierCount: groups.size,
      coldChainItems: candidates.filter((c) => c.inventory.requiresColdChain)
        .length,
      narcoticItems: candidates.filter((c) => c.inventory.isNarcotic).length,
    };
  }

  // ========================================
  // Private Helpers
  // ========================================

  /**
   * 규정 기반 Offer 필터링
   */
  private filterValidOffers(
    inventory: PharmacyInventory,
    offers: SupplierOffer[]
  ): SupplierOffer[] {
    return offers.filter((offer) => {
      // 재고 있어야 함
      if (offer.stockQuantity <= 0) return false;

      // 냉장 필요 제품은 냉장 배송 가능한 공급자만
      if (inventory.requiresColdChain && !offer.hasColdChain) {
        return false;
      }

      // 마약류는 마약류 취급 허가 공급자만
      if (inventory.isNarcotic && !offer.hasNarcoticsLicense) {
        return false;
      }

      return true;
    });
  }

  /**
   * 재고 소진 예상일 계산
   */
  private calculateDaysUntilStockout(
    inventory: PharmacyInventory
  ): number | null {
    const asu = Number(inventory.averageDailyUsage);
    if (asu <= 0) return null;
    return Math.floor(inventory.currentStock / asu);
  }

  /**
   * 긴급도 계산
   */
  private calculateUrgency(
    inventory: PharmacyInventory,
    daysUntilStockout: number | null
  ): 'critical' | 'high' | 'medium' | 'low' {
    // 재고 소진
    if (inventory.currentStock === 0) {
      return 'critical';
    }

    // 마약류는 우선순위 높음
    if (inventory.isNarcotic && inventory.currentStock < inventory.safetyStock) {
      return 'high';
    }

    // 1일 이내 소진 예상
    if (daysUntilStockout !== null && daysUntilStockout <= 1) {
      return 'critical';
    }

    // 3일 이내 소진 예상
    if (daysUntilStockout !== null && daysUntilStockout <= 3) {
      return 'high';
    }

    // 7일 이내 소진 예상
    if (daysUntilStockout !== null && daysUntilStockout <= 7) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 발주 사유 생성
   */
  private generateReason(
    inventory: PharmacyInventory,
    urgency: 'critical' | 'high' | 'medium' | 'low'
  ): string {
    if (inventory.currentStock === 0) {
      return '재고 소진 - 즉시 발주 필요';
    }

    if (urgency === 'critical') {
      return '1일 내 재고 소진 예상';
    }

    if (urgency === 'high') {
      if (inventory.isNarcotic) {
        return '마약류 제품 안전재고 미달';
      }
      return '3일 내 재고 소진 예상';
    }

    if (urgency === 'medium') {
      return '7일 내 재고 소진 예상 또는 안전재고 미달';
    }

    return '정기 재고 보충 권장';
  }

  /**
   * 긴급도 기준 정렬
   */
  private sortByUrgency(candidates: ReorderCandidate[]): ReorderCandidate[] {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return candidates.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;

      // 같은 긴급도면 재고 적은 순
      return a.inventory.currentStock - b.inventory.currentStock;
    });
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<AutoReorderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 현재 설정 조회
   */
  getConfig(): AutoReorderConfig {
    return { ...this.config };
  }
}
