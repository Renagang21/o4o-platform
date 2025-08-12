/**
 * 배송 추적 서비스
 * 택배사 API 연동, 실시간 배송 상태 추적
 */
import { EventEmitter } from 'events';
interface TrackingInfo {
    trackingNumber: string;
    carrier: string;
    carrierName: string;
    status: 'pending' | 'pickup' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
    statusText: string;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    currentLocation?: string;
    recipient?: string;
    events: TrackingEvent[];
    lastUpdated: Date;
}
interface TrackingEvent {
    timestamp: Date;
    status: string;
    location: string;
    description: string;
    details?: string;
}
interface CarrierAPI {
    code: string;
    name: string;
    apiUrl: string;
    apiKey?: string;
    trackUrl: string;
    phoneNumber: string;
}
export declare class ShippingTrackingService extends EventEmitter {
    private orderRepository;
    private carriers;
    /**
     * 운송장 등록
     */
    registerTracking(orderId: string, trackingNumber: string, carrier: string): Promise<TrackingInfo>;
    /**
     * 배송 추적 정보 조회
     */
    getTrackingInfo(trackingNumber: string, carrier: string): Promise<TrackingInfo>;
    /**
     * 택배사 API 호출
     */
    private fetchTrackingFromCarrier;
    /**
     * 스마트택배 API 응답 파싱
     */
    private parseSmartDeliveryResponse;
    /**
     * CJ대한통운 추적
     */
    private fetchCJTracking;
    /**
     * 한진택배 추적
     */
    private fetchHanjinTracking;
    /**
     * 우체국택배 추적
     */
    private fetchPostTracking;
    /**
     * 모의 추적 정보
     */
    private getMockTrackingInfo;
    /**
     * 배송 상태 업데이트 (크론)
     */
    updateAllTrackingStatus(): Promise<void>;
    /**
     * 추적 정보 업데이트 처리
     */
    private processTrackingUpdate;
    /**
     * 배송 예상 시간 계산
     */
    estimateDeliveryTime(fromAddress: string, toAddress: string, carrier: string): Promise<{
        days: number;
        estimatedDate: Date;
    }>;
    /**
     * 배송 라벨 생성
     */
    generateShippingLabel(orderId: string): Promise<Buffer>;
    /**
     * 택배사 목록 조회
     */
    getCarriers(): CarrierAPI[];
    /**
     * 추적 URL 생성
     */
    private getTrackingUrl;
    /**
     * 배송 통계
     */
    getShippingStatistics(startDate: Date, endDate: Date): Promise<{
        totalShipped: number;
        averageDeliveryTime: number;
        carrierBreakdown: Record<string, number>;
        deliverySuccess: number;
        deliveryFailed: number;
    }>;
}
export declare const shippingTrackingService: ShippingTrackingService;
export {};
//# sourceMappingURL=ShippingTrackingService.d.ts.map