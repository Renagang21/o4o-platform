// src/partner/services/PartnerService.ts
import { getDatabase, withTransaction } from '../database/connection';

export interface PartnerApplication {
  id?: number;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  application_reason: string;
  marketing_plan?: string;
  status?: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  applied_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface PartnerProfile {
  id?: number;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  partner_code: string;
  status?: 'active' | 'suspended' | 'terminated';
  commission_rate?: number;
  total_clicks?: number;
  total_conversions?: number;
  total_earnings?: number;
  bank_account?: string;
  last_activity_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCommission {
  id?: number;
  product_id: string;
  product_name: string;
  supplier_id: string;
  supplier_name: string;
  commission_type: 'fixed' | 'percentage';
  commission_value: number;
  start_date?: string;
  end_date?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  admin_notes?: string;
}

export interface PartnerClick {
  id?: number;
  partner_id: number;
  partner_code: string;
  product_id?: string;
  visitor_ip: string;
  user_agent: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  session_id: string;
  clicked_at?: string;
  converted?: boolean;
}

export interface PayoutRequest {
  id?: number;
  partner_id: number;
  request_amount: number;
  currency?: string;
  payment_method: 'bank_transfer' | 'paypal' | 'other';
  account_info: string;
  status?: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  admin_notes?: string;
  rejection_reason?: string;
  requested_at?: string;
}

export class PartnerService {
  // Partner 신청 관련
  async createApplication(data: PartnerApplication): Promise<PartnerApplication> {
    return withTransaction(async (db) => {
      // 중복 신청 확인
      const existingApplication = await db.get(
        'SELECT id FROM partner_applications WHERE customer_id = ? AND status = "pending"',
        [data.customer_id]
      );

      if (existingApplication) {
        throw new Error('이미 승인 대기 중인 Partner 신청이 있습니다.');
      }

      // 이미 Partner인지 확인
      const existingPartner = await db.get(
        'SELECT id FROM partner_profiles WHERE customer_id = ?',
        [data.customer_id]
      );

      if (existingPartner) {
        throw new Error('이미 Partner로 등록된 고객입니다.');
      }

      // 신청서 생성
      const result = await db.run(
        `INSERT INTO partner_applications 
         (customer_id, customer_email, customer_name, application_reason, marketing_plan) 
         VALUES (?, ?, ?, ?, ?)`,
        [data.customer_id, data.customer_email, data.customer_name, data.application_reason, data.marketing_plan]
      );

      const application = await db.get(
        'SELECT * FROM partner_applications WHERE id = ?',
        [result.lastID]
      );

      return application;
    });
  }

  async getApplications(status?: string): Promise<PartnerApplication[]> {
    const db = await getDatabase();
    const whereClause = status ? 'WHERE status = ?' : '';
    const params = status ? [status] : [];

    const applications = await db.all(
      `SELECT * FROM partner_applications ${whereClause} ORDER BY applied_at DESC`,
      params
    );

    return applications;
  }

  async approveApplication(applicationId: number, reviewerId: string, notes?: string): Promise<PartnerProfile> {
    return withTransaction(async (db) => {
      // 신청서 조회
      const application = await db.get(
        'SELECT * FROM partner_applications WHERE id = ?',
        [applicationId]
      );

      if (!application) {
        throw new Error('신청서를 찾을 수 없습니다.');
      }

      if (application.status !== 'pending') {
        throw new Error('이미 처리된 신청서입니다.');
      }

      // Partner 코드 생성
      const partnerCode = await this.generateUniquePartnerCode(db);

      // 신청서 승인 처리
      await db.run(
        `UPDATE partner_applications 
         SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ?, admin_notes = ?
         WHERE id = ?`,
        [reviewerId, notes, applicationId]
      );

      // Partner 프로필 생성
      const result = await db.run(
        `INSERT INTO partner_profiles 
         (customer_id, customer_email, customer_name, partner_code) 
         VALUES (?, ?, ?, ?)`,
        [application.customer_id, application.customer_email, application.customer_name, partnerCode]
      );

      const partnerProfile = await db.get(
        'SELECT * FROM partner_profiles WHERE id = ?',
        [result.lastID]
      );

      return partnerProfile;
    });
  }

  async rejectApplication(applicationId: number, reviewerId: string, reason: string): Promise<PartnerApplication> {
    const db = await getDatabase();

    await db.run(
      `UPDATE partner_applications 
       SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = ?, admin_notes = ?
       WHERE id = ?`,
      [reviewerId, reason, applicationId]
    );

    const application = await db.get(
      'SELECT * FROM partner_applications WHERE id = ?',
      [applicationId]
    );

    return application;
  }

  // Partner 프로필 관련
  async getPartnerByCode(partnerCode: string): Promise<PartnerProfile | null> {
    const db = await getDatabase();
    const partner = await db.get(
      'SELECT * FROM partner_profiles WHERE partner_code = ?',
      [partnerCode]
    );
    return partner || null;
  }

  async getPartnerByCustomerId(customerId: string): Promise<PartnerProfile | null> {
    const db = await getDatabase();
    const partner = await db.get(
      'SELECT * FROM partner_profiles WHERE customer_id = ?',
      [customerId]
    );
    return partner || null;
  }

  async getPartners(status?: string): Promise<PartnerProfile[]> {
    const db = await getDatabase();
    const whereClause = status ? 'WHERE status = ?' : '';
    const params = status ? [status] : [];

    const partners = await db.all(
      `SELECT * FROM partner_profiles ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return partners;
  }

  // 클릭 추적 관련
  async recordClick(data: PartnerClick): Promise<PartnerClick> {
    const db = await getDatabase();

    const result = await db.run(
      `INSERT INTO partner_clicks 
       (partner_id, partner_code, product_id, visitor_ip, user_agent, referrer, 
        utm_source, utm_medium, utm_campaign, session_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.partner_id, data.partner_code, data.product_id, data.visitor_ip,
        data.user_agent, data.referrer, data.utm_source, data.utm_medium,
        data.utm_campaign, data.session_id
      ]
    );

    // Partner 통계 업데이트
    await db.run(
      'UPDATE partner_profiles SET total_clicks = total_clicks + 1, last_activity_at = datetime("now") WHERE id = ?',
      [data.partner_id]
    );

    const click = await db.get(
      'SELECT * FROM partner_clicks WHERE id = ?',
      [result.lastID]
    );

    return click;
  }

  // 지급 요청 관련
  async createPayoutRequest(data: PayoutRequest): Promise<PayoutRequest> {
    const db = await getDatabase();

    // 최소 지급 금액 확인
    const settings = await db.get(
      'SELECT setting_value FROM partner_system_settings WHERE setting_key = "minimum_payout_amount"'
    );
    
    const minAmount = parseFloat(settings?.setting_value || '50000');
    if (data.request_amount < minAmount) {
      throw new Error(`최소 지급 금액은 ${minAmount.toLocaleString()}원입니다.`);
    }

    const result = await db.run(
      `INSERT INTO payout_requests 
       (partner_id, request_amount, payment_method, account_info) 
       VALUES (?, ?, ?, ?)`,
      [data.partner_id, data.request_amount, data.payment_method, data.account_info]
    );

    const payoutRequest = await db.get(
      'SELECT * FROM payout_requests WHERE id = ?',
      [result.lastID]
    );

    return payoutRequest;
  }

  async getPayoutRequests(status?: string): Promise<PayoutRequest[]> {
    const db = await getDatabase();
    const whereClause = status ? 'WHERE status = ?' : '';
    const params = status ? [status] : [];

    const requests = await db.all(
      `SELECT pr.*, pp.customer_name, pp.customer_email, pp.partner_code
       FROM payout_requests pr
       JOIN partner_profiles pp ON pr.partner_id = pp.id
       ${whereClause} ORDER BY pr.requested_at DESC`,
      params
    );

    return requests;
  }

  // 유틸리티 메소드
  private async generateUniquePartnerCode(db: any): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generatePartnerCode();
      const existing = await db.get(
        'SELECT id FROM partner_profiles WHERE partner_code = ?',
        [code]
      );

      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error('고유한 Partner 코드 생성에 실패했습니다.');
  }

  private generatePartnerCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'P'; // Partner 코드는 P로 시작

    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  // 링크 생성
  generatePartnerLink(partnerCode: string, productId?: string, baseUrl: string = ''): string {
    const params = new URLSearchParams({ ref: partnerCode });
    
    if (productId) {
      return `${baseUrl}/products/${productId}?${params.toString()}`;
    } else {
      return `${baseUrl}?${params.toString()}`;
    }
  }

  // 통계 조회
  async getPartnerStats(partnerId: number): Promise<{
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    conversionRate: number;
    pendingEarnings: number;
  }> {
    const db = await getDatabase();

    const [partner, clickCount, conversionCount, pendingEarnings] = await Promise.all([
      db.get('SELECT * FROM partner_profiles WHERE id = ?', [partnerId]),
      db.get('SELECT COUNT(*) as count FROM partner_clicks WHERE partner_id = ?', [partnerId]),
      db.get('SELECT COUNT(*) as count FROM partner_conversions WHERE partner_id = ? AND status = "confirmed"', [partnerId]),
      db.get('SELECT SUM(commission_amount) as total FROM partner_conversions WHERE partner_id = ? AND status = "confirmed"', [partnerId])
    ]);

    const totalClicks = partner?.total_clicks || 0;
    const totalConversions = partner?.total_conversions || 0;
    const totalEarnings = partner?.total_earnings || 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalClicks,
      totalConversions,
      totalEarnings,
      conversionRate: Math.round(conversionRate * 100) / 100,
      pendingEarnings: parseFloat(pendingEarnings?.total) || 0
    };
  }
}

export const partnerService = new PartnerService();
