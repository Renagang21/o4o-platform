import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('shipping_carriers')
export class ShippingCarrier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  code!: string; // cj, hanjin, logen, koreanpost

  @Column()
  name!: string; // CJ대한통운, 한진택배, 로젠택배, 우체국택배

  @Column({ nullable: true })
  apiUrl?: string;

  @Column({ nullable: true })
  apiKey?: string;

  @Column({ nullable: true })
  apiSecret?: string;

  @Column({ nullable: true })
  webhookUrl?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  supportsCod!: boolean; // Cash on delivery

  @Column({ default: false })
  supportsInsurance!: boolean;

  @Column({ default: false })
  supportsInternational!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  baseRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weightRate?: number; // Rate per kg

  @Column({ type: 'json', nullable: true })
  regionRates?: Record<string, number>; // Additional rates by region

  @Column({ type: 'json', nullable: true })
  settings?: Record<string, any>;

  @Column({ default: 999 })
  priority!: number; // Lower number = higher priority

  @Column({ nullable: true })
  trackingUrlTemplate?: string; // e.g., https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo={{trackingNumber}}

  @Column({ type: 'json', nullable: true })
  workingHours?: {
    weekdays: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };

  @Column({ type: 'json', nullable: true })
  serviceAreas?: string[]; // List of supported regions

  @Column({ nullable: true })
  customerServicePhone?: string;

  @Column({ nullable: true })
  customerServiceEmail?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}