/**
 * CornerDisplay Service
 *
 * Phase 2: 코너 디스플레이 서비스
 *
 * WO-7 추가:
 * - getDisplayWithProducts: CornerDisplay + Listings 연결
 * - buildListingsApiUrl: Phase 1 API URL 생성
 *
 * 원칙:
 * - 비즈니스 로직 없음 (단순 오케스트레이션)
 * - Phase 1 API 재사용
 */

import { Repository, DataSource } from 'typeorm';
import { CornerDisplay } from '../entities/CornerDisplay.entity.js';
import { CornerDisplayDevice } from '../entities/CornerDisplayDevice.entity.js';
import type { CornerListingQuery, DeviceType, ListingVisibility } from '@o4o/types';
import { CORNER_LISTING_QUERY_DEFAULTS } from '@o4o/types';

/**
 * Listing 제품 타입 (Phase 1 API 응답)
 */
export interface ListingProduct {
  id: string;
  name: string;
  description?: string;
  sellingPrice: number;
  imageUrl?: string;
  channelSpecificData?: {
    display?: {
      corner?: string;
      visibility?: string;
      sortOrder?: number;
    };
  };
}

/**
 * CornerDisplay + Products 통합 결과
 */
export interface CornerDisplayWithProducts {
  corner: CornerDisplay;
  device: CornerDisplayDevice;
  products: ListingProduct[];
  query: CornerListingQuery;
}

export class CornerDisplayService {
  private cornerDisplayRepo: Repository<CornerDisplay>;
  private cornerDisplayDeviceRepo: Repository<CornerDisplayDevice>;

  constructor(dataSource: DataSource) {
    this.cornerDisplayRepo = dataSource.getRepository(CornerDisplay);
    this.cornerDisplayDeviceRepo = dataSource.getRepository(CornerDisplayDevice);
  }

  /**
   * 코너 디스플레이 목록 조회
   */
  async findAll(sellerId?: string): Promise<CornerDisplay[]> {
    const query = this.cornerDisplayRepo.createQueryBuilder('cd');

    if (sellerId) {
      query.where('cd.sellerId = :sellerId', { sellerId });
    }

    return query.orderBy('cd.createdAt', 'DESC').getMany();
  }

  /**
   * 코너 디스플레이 단건 조회
   */
  async findById(id: string): Promise<CornerDisplay | null> {
    return this.cornerDisplayRepo.findOne({ where: { id } });
  }

  /**
   * cornerKey로 코너 디스플레이 조회
   */
  async findByCornerKey(
    sellerId: string,
    cornerKey: string
  ): Promise<CornerDisplay | null> {
    return this.cornerDisplayRepo.findOne({
      where: { sellerId, cornerKey },
    });
  }

  /**
   * 디바이스 ID로 귀속된 코너 조회
   *
   * 핵심: "이 디바이스가 어떤 코너에 귀속되어 있는가"
   * - 하나의 디바이스는 하나의 코너에만 귀속
   * - 전환/선택 없음
   */
  async findCornerByDeviceId(deviceId: string): Promise<CornerDisplay | null> {
    const device = await this.cornerDisplayDeviceRepo.findOne({
      where: { deviceId },
    });

    if (!device) {
      return null;
    }

    return this.findById(device.cornerDisplayId);
  }

  /**
   * 코너에 귀속된 디바이스 목록 조회
   */
  async findDevicesByCorner(cornerDisplayId: string): Promise<CornerDisplayDevice[]> {
    return this.cornerDisplayDeviceRepo.find({
      where: { cornerDisplayId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * 디바이스 정보 조회
   */
  async findDeviceById(deviceId: string): Promise<CornerDisplayDevice | null> {
    return this.cornerDisplayDeviceRepo.findOne({
      where: { deviceId },
    });
  }

  /**
   * 코너 + 디바이스 통합 조회
   * - 디바이스 ID로 코너 정보와 함께 조회
   */
  async getCornerContextByDevice(deviceId: string): Promise<{
    corner: CornerDisplay;
    device: CornerDisplayDevice;
    siblingDevices: CornerDisplayDevice[];
  } | null> {
    const device = await this.findDeviceById(deviceId);
    if (!device) return null;

    const corner = await this.findById(device.cornerDisplayId);
    if (!corner) return null;

    const siblingDevices = await this.findDevicesByCorner(corner.id);

    return {
      corner,
      device,
      siblingDevices: siblingDevices.filter((d) => d.deviceId !== deviceId),
    };
  }

  /**
   * WO-7: CornerDisplay의 Listings 쿼리 구성
   *
   * 1. CornerDisplay.listingQuery 사용 (설정된 경우)
   * 2. 없으면 cornerKey 기반 기본 쿼리 생성
   * 3. 디바이스 타입 자동 적용
   */
  buildListingQuery(
    corner: CornerDisplay,
    device?: CornerDisplayDevice
  ): CornerListingQuery {
    // 설정된 쿼리가 있으면 사용
    if (corner.listingQuery) {
      return {
        ...CORNER_LISTING_QUERY_DEFAULTS,
        ...corner.listingQuery,
        // 디바이스 타입 오버라이드 (디바이스가 있으면)
        deviceType: device?.deviceType as DeviceType || corner.listingQuery.deviceType,
      };
    }

    // 기본 쿼리: cornerKey 기반
    return {
      ...CORNER_LISTING_QUERY_DEFAULTS,
      corner: corner.cornerKey,
      deviceType: device?.deviceType as DeviceType,
    };
  }

  /**
   * WO-7: Phase 1 Listings API URL 생성
   *
   * GET /api/v1/dropshipping/core/listings?corner=xxx&visibility=visible&...
   */
  buildListingsApiUrl(query: CornerListingQuery, baseUrl: string = ''): string {
    const params = new URLSearchParams();

    params.set('corner', query.corner);

    if (query.deviceType) {
      params.set('deviceType', query.deviceType);
    }
    if (query.visibility) {
      params.set('visibility', query.visibility);
    }
    if (query.sortBy) {
      params.set('sortBy', query.sortBy);
    }
    if (query.sortDirection) {
      params.set('sortDirection', query.sortDirection);
    }
    // limit은 API에서 페이지네이션으로 처리

    return `${baseUrl}/api/v1/dropshipping/core/listings?${params.toString()}`;
  }

  /**
   * WO-7: 디바이스 ID로 코너 + 제품 목록 조회
   *
   * 핵심 메서드:
   * 1. deviceId → CornerDisplay 조회
   * 2. CornerListingQuery 구성
   * 3. fetchProducts 콜백으로 제품 조회
   * 4. 통합 결과 반환
   *
   * @param deviceId 디바이스 식별자
   * @param fetchProducts 제품 조회 함수 (외부 주입)
   */
  async getDisplayWithProducts(
    deviceId: string,
    fetchProducts: (url: string) => Promise<ListingProduct[]>
  ): Promise<CornerDisplayWithProducts | null> {
    // 1. 디바이스 → 코너 조회
    const device = await this.findDeviceById(deviceId);
    if (!device) return null;

    const corner = await this.findById(device.cornerDisplayId);
    if (!corner) return null;

    // 2. 쿼리 구성
    const query = this.buildListingQuery(corner, device);

    // 3. API URL 생성 및 제품 조회
    const apiUrl = this.buildListingsApiUrl(query);
    let products: ListingProduct[] = [];

    try {
      products = await fetchProducts(apiUrl);

      // limit 적용
      if (query.limit && products.length > query.limit) {
        products = products.slice(0, query.limit);
      }
    } catch (error) {
      // 제품 조회 실패 시 빈 배열 (Fallback)
      console.error('Failed to fetch products:', error);
      products = [];
    }

    // 4. 통합 결과 반환
    return {
      corner,
      device,
      products,
      query,
    };
  }
}
