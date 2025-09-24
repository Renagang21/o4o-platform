import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

export enum ShippingStatus {
  PENDING = 'pending',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
  CANCELLED = 'cancelled'
}

export enum ShippingCarrier {
  CJ_LOGISTICS = 'cj_logistics',
  KOREA_POST = 'korea_post',
  HANJIN = 'hanjin',
  LOTTE = 'lotte',
  LOGEN = 'logen',
  DHL = 'dhl',
  FEDEX = 'fedex',
  UPS = 'ups',
  OTHER = 'other'
}

@Entity('shipping_trackings')
export class ShippingTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({
    type: 'enum',
    enum: ShippingCarrier,
    default: ShippingCarrier.CJ_LOGISTICS
  })
  carrier: ShippingCarrier;

  @Column()
  trackingNumber: string;

  @Column({
    type: 'enum',
    enum: ShippingStatus,
    default: ShippingStatus.PENDING
  })
  status: ShippingStatus;

  @Column({ nullable: true })
  estimatedDeliveryDate?: Date;

  @Column({ nullable: true })
  actualDeliveryDate?: Date;

  @Column({ nullable: true })
  recipientName?: string;

  @Column({ nullable: true })
  recipientSignature?: string;

  @Column({ type: 'text', nullable: true })
  deliveryNotes?: string;

  @Column({ type: 'json', nullable: true })
  trackingHistory?: Array<{
    timestamp: Date;
    status: string;
    location: string;
    description: string;
  }>;

  @Column({ type: 'json', nullable: true })
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingCost?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'json', nullable: true })
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @Column({ nullable: true })
  returnTrackingNumber?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isDelivered(): boolean {
    return this.status === ShippingStatus.DELIVERED;
  }

  isInTransit(): boolean {
    return [
      ShippingStatus.PICKED_UP,
      ShippingStatus.IN_TRANSIT,
      ShippingStatus.OUT_FOR_DELIVERY
    ].includes(this.status);
  }

  addTrackingEvent(event: {
    status: string;
    location: string;
    description: string;
  }): void {
    if (!this.trackingHistory) {
      this.trackingHistory = [];
    }
    this.trackingHistory.push({
      timestamp: new Date(),
      ...event
    });
  }

  getLatestUpdate(): any {
    if (!this.trackingHistory || this.trackingHistory.length === 0) {
      return null;
    }
    return this.trackingHistory[this.trackingHistory.length - 1];
  }

  getCarrierTrackingUrl(): string {
    const baseUrls: Record<ShippingCarrier, string> = {
      [ShippingCarrier.CJ_LOGISTICS]: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
      [ShippingCarrier.KOREA_POST]: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?displayHeader=N&sid1=',
      [ShippingCarrier.HANJIN]: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=',
      [ShippingCarrier.LOTTE]: 'https://www.lotteglogis.com/open/tracking?invno=',
      [ShippingCarrier.LOGEN]: 'https://www.ilogen.com/web/personal/trace/',
      [ShippingCarrier.DHL]: 'https://www.dhl.com/kr-ko/home/tracking/tracking-express.html?submit=1&tracking-id=',
      [ShippingCarrier.FEDEX]: 'https://www.fedex.com/fedextrack/?trknbr=',
      [ShippingCarrier.UPS]: 'https://www.ups.com/track?loc=ko_KR&tracknum=',
      [ShippingCarrier.OTHER]: '#'
    };

    const baseUrl = baseUrls[this.carrier] || '#';
    return baseUrl === '#' ? '#' : baseUrl + this.trackingNumber;
  }
}