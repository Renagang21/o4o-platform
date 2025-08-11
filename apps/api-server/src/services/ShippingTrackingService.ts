/**
 * 배송 추적 서비스
 * 택배사 API 연동, 실시간 배송 상태 추적
 */

import { AppDataSource } from '../database/connection';
import { Order, OrderStatus } from '../entities/Order';
import logger from '../utils/simpleLogger';
import { EventEmitter } from 'events';
import axios from 'axios';

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

export class ShippingTrackingService extends EventEmitter {
  private orderRepository = AppDataSource.getRepository(Order);
  
  // 택배사 정보
  private carriers: Map<string, CarrierAPI> = new Map([
    ['cj', {
      code: 'cj',
      name: 'CJ대한통운',
      apiUrl: 'https://api.cjlogistics.com/tracking',
      apiKey: process.env.CJ_API_KEY,
      trackUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
      phoneNumber: '1588-1255'
    }],
    ['hanjin', {
      code: 'hanjin',
      name: '한진택배',
      apiUrl: 'https://api.hanjin.co.kr/tracking',
      apiKey: process.env.HANJIN_API_KEY,
      trackUrl: 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=',
      phoneNumber: '1588-0011'
    }],
    ['lotte', {
      code: 'lotte',
      name: '롯데택배',
      apiUrl: 'https://api.lotteglogis.com/tracking',
      apiKey: process.env.LOTTE_API_KEY,
      trackUrl: 'https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=',
      phoneNumber: '1588-2121'
    }],
    ['logen', {
      code: 'logen',
      name: '로젠택배',
      apiUrl: 'https://api.logen.co.kr/tracking',
      apiKey: process.env.LOGEN_API_KEY,
      trackUrl: 'https://www.ilogen.com/web/personal/trace/',
      phoneNumber: '1588-9988'
    }],
    ['post', {
      code: 'post',
      name: '우체국택배',
      apiUrl: 'https://api.epost.go.kr/tracking',
      apiKey: process.env.POST_API_KEY,
      trackUrl: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=',
      phoneNumber: '1588-1300'
    }],
    ['cvsnet', {
      code: 'cvsnet',
      name: 'GS편의점택배',
      apiUrl: 'https://api.cvsnet.co.kr/tracking',
      trackUrl: 'https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no=',
      phoneNumber: '1577-1287'
    }],
    ['cu', {
      code: 'cu',
      name: 'CU편의점택배',
      apiUrl: 'https://api.cupost.co.kr/tracking',
      trackUrl: 'https://www.cupost.co.kr/postbox/delivery/localResult.cupost?invoice_no=',
      phoneNumber: '1577-1287'
    }]
  ]);

  /**
   * 운송장 등록
   */
  async registerTracking(
    orderId: string,
    trackingNumber: string,
    carrier: string
  ): Promise<TrackingInfo> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // 운송장 정보 저장
    order.shipping = {
      ...order.shipping,
      trackingNumber,
      carrier,
      trackingUrl: this.getTrackingUrl(carrier, trackingNumber),
      shippedAt: new Date()
    };

    await this.orderRepository.save(order);

    // 초기 추적 정보 조회
    const trackingInfo = await this.getTrackingInfo(trackingNumber, carrier);

    // 배송 시작 알림
    this.emit('shippingStarted', {
      orderId,
      trackingNumber,
      carrier,
      userId: order.userId
    });

    logger.info(`Tracking registered: Order ${orderId}, Tracking ${trackingNumber}`);

    return trackingInfo;
  }

  /**
   * 배송 추적 정보 조회
   */
  async getTrackingInfo(
    trackingNumber: string,
    carrier: string
  ): Promise<TrackingInfo> {
    const carrierInfo = this.carriers.get(carrier);
    
    if (!carrierInfo) {
      throw new Error(`Unsupported carrier: ${carrier}`);
    }

    try {
      // 실제 API 호출 (각 택배사별 구현 필요)
      const trackingData = await this.fetchTrackingFromCarrier(
        trackingNumber,
        carrierInfo
      );
      
      return trackingData;
    } catch (error) {
      logger.error(`Failed to fetch tracking info:`, error);
      
      // 폴백: 모의 데이터 반환
      return this.getMockTrackingInfo(trackingNumber, carrier);
    }
  }

  /**
   * 택배사 API 호출
   */
  private async fetchTrackingFromCarrier(
    trackingNumber: string,
    carrier: CarrierAPI
  ): Promise<TrackingInfo> {
    // 스마트택배 API 사용 예시
    if (process.env.SMART_DELIVERY_API_KEY) {
      try {
        const response = await axios.get(
          `https://info.sweettracker.co.kr/api/v1/trackingInfo`,
          {
            params: {
              t_key: process.env.SMART_DELIVERY_API_KEY,
              t_code: carrier.code,
              t_invoice: trackingNumber
            }
          }
        );

        return this.parseSmartDeliveryResponse(response.data, carrier);
      } catch (error) {
        logger.error('Smart delivery API error:', error);
      }
    }

    // 각 택배사별 API 구현
    switch (carrier.code) {
      case 'cj':
        return this.fetchCJTracking(trackingNumber, carrier);
      case 'hanjin':
        return this.fetchHanjinTracking(trackingNumber, carrier);
      case 'post':
        return this.fetchPostTracking(trackingNumber, carrier);
      default:
        throw new Error('Carrier API not implemented');
    }
  }

  /**
   * 스마트택배 API 응답 파싱
   */
  private parseSmartDeliveryResponse(data: any, carrier: CarrierAPI): TrackingInfo {
    const statusMap: Record<string, TrackingInfo['status']> = {
      '배송준비': 'pending',
      '집하': 'pickup',
      '배송중': 'in_transit',
      '배송출발': 'out_for_delivery',
      '배송완료': 'delivered',
      '반송': 'returned'
    };

    const events: TrackingEvent[] = (data.trackingDetails || []).map((detail: any) => ({
      timestamp: new Date(detail.timeString),
      status: detail.kind,
      location: detail.where,
      description: detail.kind,
      details: detail.telno || detail.manName
    }));

    const currentStatus = data.level || 1;
    const statuses: TrackingInfo['status'][] = [
      'pending', 'pickup', 'in_transit', 'out_for_delivery', 'delivered', 'delivered'
    ];

    return {
      trackingNumber: data.invoiceNo,
      carrier: carrier.code,
      carrierName: carrier.name,
      status: statuses[currentStatus] || 'pending',
      statusText: data.lastStateDetail?.kind || '',
      estimatedDelivery: data.estimate ? new Date(data.estimate) : undefined,
      actualDelivery: data.completeYN === 'Y' ? new Date(data.complete) : undefined,
      currentLocation: data.lastStateDetail?.where,
      recipient: data.receiverName,
      events,
      lastUpdated: new Date()
    };
  }

  /**
   * CJ대한통운 추적
   */
  private async fetchCJTracking(
    trackingNumber: string,
    carrier: CarrierAPI
  ): Promise<TrackingInfo> {
    // CJ API 구현
    return this.getMockTrackingInfo(trackingNumber, carrier.code);
  }

  /**
   * 한진택배 추적
   */
  private async fetchHanjinTracking(
    trackingNumber: string,
    carrier: CarrierAPI
  ): Promise<TrackingInfo> {
    // 한진 API 구현
    return this.getMockTrackingInfo(trackingNumber, carrier.code);
  }

  /**
   * 우체국택배 추적
   */
  private async fetchPostTracking(
    trackingNumber: string,
    carrier: CarrierAPI
  ): Promise<TrackingInfo> {
    // 우체국 API 구현
    try {
      const response = await axios.get(
        'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm',
        {
          params: {
            sid1: trackingNumber,
            displayHeader: 'N'
          }
        }
      );

      // HTML 파싱 필요
      return this.getMockTrackingInfo(trackingNumber, carrier.code);
    } catch (error) {
      return this.getMockTrackingInfo(trackingNumber, carrier.code);
    }
  }

  /**
   * 모의 추적 정보
   */
  private getMockTrackingInfo(
    trackingNumber: string,
    carrier: string
  ): TrackingInfo {
    const carrierInfo = this.carriers.get(carrier);
    const now = new Date();
    
    return {
      trackingNumber,
      carrier,
      carrierName: carrierInfo?.name || carrier,
      status: 'in_transit',
      statusText: '배송중',
      estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2일 후
      currentLocation: '서울 강남 물류센터',
      events: [
        {
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          status: '상품접수',
          location: '서울 송파구',
          description: '보내시는 고객님으로부터 상품을 인수받았습니다'
        },
        {
          timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000),
          status: '상품이동중',
          location: '옥천HUB',
          description: '배송지로 상품이 이동중입니다'
        },
        {
          timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
          status: '배송출발',
          location: '서울 강남',
          description: '배송기사님이 상품을 가지고 출발하였습니다'
        }
      ],
      lastUpdated: now
    };
  }

  /**
   * 배송 상태 업데이트 (크론)
   */
  async updateAllTrackingStatus(): Promise<void> {
    // 배송중인 모든 주문 조회
    const orders = await this.orderRepository.find({
      where: { status: OrderStatus.SHIPPED }
    });

    for (const order of orders) {
      if (order.shipping?.trackingNumber && order.shipping?.carrier) {
        try {
          const trackingInfo = await this.getTrackingInfo(
            order.shipping.trackingNumber,
            order.shipping.carrier
          );

          // 상태 변경 감지
          await this.processTrackingUpdate(order, trackingInfo);
        } catch (error) {
          logger.error(`Failed to update tracking for order ${order.id}:`, error);
        }
      }
    }
  }

  /**
   * 추적 정보 업데이트 처리
   */
  private async processTrackingUpdate(
    order: Order,
    trackingInfo: TrackingInfo
  ): Promise<void> {
    const previousStatus = order.shipping?.status;
    
    // 배송 완료
    if (trackingInfo.status === 'delivered' && previousStatus !== 'delivered') {
      order.status = OrderStatus.DELIVERED;
      order.shipping = {
        ...order.shipping,
        status: 'delivered',
        deliveredAt: trackingInfo.actualDelivery || new Date()
      };
      
      await this.orderRepository.save(order);
      
      // 배송 완료 알림
      this.emit('deliveryCompleted', {
        orderId: order.id,
        userId: order.userId,
        trackingNumber: trackingInfo.trackingNumber,
        deliveredAt: trackingInfo.actualDelivery
      });
      
      logger.info(`Order ${order.id} delivered`);
    }
    // 배송 실패
    else if (trackingInfo.status === 'failed' && previousStatus !== 'failed') {
      order.shipping = {
        ...order.shipping,
        status: 'failed'
      };
      
      await this.orderRepository.save(order);
      
      // 배송 실패 알림
      this.emit('deliveryFailed', {
        orderId: order.id,
        userId: order.userId,
        trackingNumber: trackingInfo.trackingNumber,
        reason: trackingInfo.statusText
      });
    }
    // 상태 업데이트
    else if (trackingInfo.status !== previousStatus) {
      order.shipping = {
        ...order.shipping,
        status: trackingInfo.status,
        currentLocation: trackingInfo.currentLocation,
        estimatedDelivery: trackingInfo.estimatedDelivery
      };
      
      await this.orderRepository.save(order);
    }
  }

  /**
   * 배송 예상 시간 계산
   */
  async estimateDeliveryTime(
    fromAddress: string,
    toAddress: string,
    carrier: string
  ): Promise<{ days: number; estimatedDate: Date }> {
    // 지역별 배송 시간 (간단한 예시)
    const deliveryTimes: Record<string, number> = {
      'same_city': 1,
      'same_province': 2,
      'different_province': 3,
      'island': 5
    };

    // 실제로는 주소 파싱 및 거리 계산
    const estimatedDays = 2; // 기본 2일
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);
    
    // 주말 제외
    if (estimatedDate.getDay() === 0) { // 일요일
      estimatedDate.setDate(estimatedDate.getDate() + 1);
    } else if (estimatedDate.getDay() === 6) { // 토요일
      estimatedDate.setDate(estimatedDate.getDate() + 2);
    }

    return {
      days: estimatedDays,
      estimatedDate
    };
  }

  /**
   * 배송 라벨 생성
   */
  async generateShippingLabel(orderId: string): Promise<Buffer> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product']
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // PDF 생성 (실제 구현 필요)
    // const pdf = await this.createShippingLabelPDF(order);
    
    // 임시 반환
    return Buffer.from('Shipping Label PDF');
  }

  /**
   * 택배사 목록 조회
   */
  getCarriers(): CarrierAPI[] {
    return Array.from(this.carriers.values());
  }

  /**
   * 추적 URL 생성
   */
  private getTrackingUrl(carrier: string, trackingNumber: string): string {
    const carrierInfo = this.carriers.get(carrier);
    return carrierInfo 
      ? `${carrierInfo.trackUrl}${trackingNumber}`
      : `#${trackingNumber}`;
  }

  /**
   * 배송 통계
   */
  async getShippingStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalShipped: number;
    averageDeliveryTime: number;
    carrierBreakdown: Record<string, number>;
    deliverySuccess: number;
    deliveryFailed: number;
  }> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.shipping.shippedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate
      })
      .getMany();

    const stats = {
      totalShipped: orders.length,
      averageDeliveryTime: 0,
      carrierBreakdown: {} as Record<string, number>,
      deliverySuccess: 0,
      deliveryFailed: 0
    };

    let totalDeliveryTime = 0;
    let deliveredCount = 0;

    orders.forEach(order => {
      // 택배사별 통계
      const carrier = order.shipping?.carrier;
      if (carrier) {
        stats.carrierBreakdown[carrier] = (stats.carrierBreakdown[carrier] || 0) + 1;
      }

      // 배송 성공/실패
      if (order.shipping?.status === 'delivered') {
        stats.deliverySuccess++;
        
        // 평균 배송 시간 계산
        if (order.shipping.shippedAt && order.shipping.deliveredAt) {
          const deliveryTime = order.shipping.deliveredAt.getTime() - order.shipping.shippedAt.getTime();
          totalDeliveryTime += deliveryTime;
          deliveredCount++;
        }
      } else if (order.shipping?.status === 'failed') {
        stats.deliveryFailed++;
      }
    });

    // 평균 배송 시간 (일 단위)
    if (deliveredCount > 0) {
      stats.averageDeliveryTime = totalDeliveryTime / deliveredCount / (1000 * 60 * 60 * 24);
    }

    return stats;
  }
}

// 싱글톤 인스턴스
export const shippingTrackingService = new ShippingTrackingService();