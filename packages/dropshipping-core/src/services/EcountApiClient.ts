/**
 * EcountApiClient
 *
 * Ecount ERP Open API 클라이언트
 *
 * === API 구조 ===
 * - Base URL: https://sboapi{ZONE}.ecount.com/OAPI/V2
 * - 인증: SESSION_ID (로그인 API로 획득)
 * - Content-Type: application/json
 *
 * === 지원 기능 ===
 * - 매입전표 생성 (Purchases/SavePurchases)
 * - 지급전표 생성 (AccountPayables/SaveAccountPayables)
 *
 * === 환경변수 ===
 * - ECOUNT_ZONE: API Zone (예: 21)
 * - ECOUNT_COM_CODE: 회사 코드
 * - ECOUNT_USER_ID: 사용자 ID
 * - ECOUNT_API_KEY: API 키
 */

import logger from './logger.js';

export interface EcountConfig {
  zone: string;
  comCode: string;
  userId: string;
  apiKey: string;
}

export interface EcountLoginResponse {
  Status: string;
  Message: string;
  Data: {
    SESSION_ID: string;
  };
}

export interface EcountVoucherItem {
  WH_CD?: string;        // 창고 코드
  PROD_CD?: string;      // 품목 코드
  PROD_DES: string;      // 품목/적요
  QTY?: number;          // 수량
  PRICE?: number;        // 단가
  SUPPLY_AMT: number;    // 공급가액
  VAT_AMT?: number;      // 부가세
  TOTAL_AMT: number;     // 합계금액
  REMARKS?: string;      // 비고
}

export interface EcountPurchaseVoucher {
  IO_DATE: string;       // 전표일자 (YYYYMMDD)
  CUST_CD: string;       // 거래처 코드 (Supplier)
  REMARKS?: string;      // 적요
  DEPT_CD?: string;      // 부서 코드
  EMP_CD?: string;       // 담당자 코드
  ITEMS: EcountVoucherItem[];
}

export interface EcountPaymentVoucher {
  IO_DATE: string;       // 전표일자 (YYYYMMDD)
  CUST_CD: string;       // 거래처 코드 (Supplier)
  PAY_TYPE: string;      // 지급유형 (CASH: 현금, BANK: 계좌이체)
  BANK_CD?: string;      // 은행 코드
  ACCOUNT_NO?: string;   // 계좌번호
  PAY_AMT: number;       // 지급금액
  REMARKS?: string;      // 적요
}

export interface EcountApiResponse {
  Status: string;        // 'OK' | 'ERROR'
  Message: string;
  Data?: {
    VOUCHER_NO?: string; // 생성된 전표 번호
    [key: string]: any;
  };
  Error?: {
    Code: string;
    Message: string;
  };
}

export class EcountApiClient {
  private config: EcountConfig;
  private sessionId: string | null = null;
  private sessionExpiry: Date | null = null;

  constructor() {
    this.config = {
      zone: process.env.ECOUNT_ZONE || '21',
      comCode: process.env.ECOUNT_COM_CODE || '',
      userId: process.env.ECOUNT_USER_ID || '',
      apiKey: process.env.ECOUNT_API_KEY || '',
    };
  }

  /**
   * API Base URL
   */
  private get baseUrl(): string {
    return `https://sboapi${this.config.zone}.ecount.com/OAPI/V2`;
  }

  /**
   * 설정 유효성 검사
   */
  isConfigured(): boolean {
    return !!(
      this.config.zone &&
      this.config.comCode &&
      this.config.userId &&
      this.config.apiKey
    );
  }

  /**
   * 로그인하여 SESSION_ID 획득
   */
  async login(): Promise<string> {
    // 기존 세션이 유효하면 재사용
    if (this.sessionId && this.sessionExpiry && this.sessionExpiry > new Date()) {
      return this.sessionId;
    }

    if (!this.isConfigured()) {
      throw new Error('Ecount API is not configured. Check environment variables.');
    }

    const loginUrl = `https://sboapi${this.config.zone}.ecount.com/OAPI/V2/Login`;

    logger.info('[EcountApiClient] Logging in to Ecount API', {
      zone: this.config.zone,
      comCode: this.config.comCode,
    });

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        COM_CODE: this.config.comCode,
        USER_ID: this.config.userId,
        API_CERT_KEY: this.config.apiKey,
        LAN_TYPE: 'ko-KR',
        ZONE: this.config.zone,
      }),
    });

    const result = (await response.json()) as EcountLoginResponse;

    if (result.Status !== 'OK' || !result.Data?.SESSION_ID) {
      logger.error('[EcountApiClient] Login failed', { result });
      throw new Error(`Ecount login failed: ${result.Message}`);
    }

    this.sessionId = result.Data.SESSION_ID;
    // 세션 유효시간: 30분
    this.sessionExpiry = new Date(Date.now() + 30 * 60 * 1000);

    logger.info('[EcountApiClient] Login successful');
    return this.sessionId;
  }

  /**
   * 매입전표 생성
   *
   * @param voucher - 매입전표 데이터
   * @returns API 응답
   */
  async createPurchaseVoucher(voucher: EcountPurchaseVoucher): Promise<EcountApiResponse> {
    const sessionId = await this.login();

    const url = `${this.baseUrl}/Purchases/SavePurchases?SESSION_ID=${sessionId}`;

    logger.info('[EcountApiClient] Creating purchase voucher', {
      date: voucher.IO_DATE,
      custCode: voucher.CUST_CD,
      itemCount: voucher.ITEMS.length,
      totalAmount: voucher.ITEMS.reduce((sum, item) => sum + item.TOTAL_AMT, 0),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(voucher),
    });

    const result = (await response.json()) as EcountApiResponse;

    logger.info('[EcountApiClient] Purchase voucher response', { result });

    return result;
  }

  /**
   * 지급전표 생성 (미지급금 지급)
   *
   * @param voucher - 지급전표 데이터
   * @returns API 응답
   */
  async createPaymentVoucher(voucher: EcountPaymentVoucher): Promise<EcountApiResponse> {
    const sessionId = await this.login();

    const url = `${this.baseUrl}/AccountPayables/SaveAccountPayables?SESSION_ID=${sessionId}`;

    logger.info('[EcountApiClient] Creating payment voucher', {
      date: voucher.IO_DATE,
      custCode: voucher.CUST_CD,
      payAmount: voucher.PAY_AMT,
      payType: voucher.PAY_TYPE,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(voucher),
    });

    const result = (await response.json()) as EcountApiResponse;

    logger.info('[EcountApiClient] Payment voucher response', { result });

    return result;
  }

  /**
   * 정산 배치를 Ecount 매입/지급 전표로 변환
   *
   * @param batch - 정산 배치
   * @param supplierCode - Ecount 거래처 코드
   * @returns 전표 데이터
   */
  createVoucherFromSettlement(
    batch: {
      id: string;
      batchNumber: string;
      supplierId: string;
      periodStart: Date;
      periodEnd: Date;
      netAmount: number;
      totalAmount: number;
      commissionAmount: number;
    },
    supplierCode: string
  ): { purchase: EcountPurchaseVoucher; payment: EcountPaymentVoucher } {
    const today = new Date();
    const ioDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const periodStr = `${batch.periodStart.toISOString().slice(0, 10)} ~ ${batch.periodEnd.toISOString().slice(0, 10)}`;

    // 매입전표: Supplier에게서 상품을 매입한 것으로 기록
    const purchase: EcountPurchaseVoucher = {
      IO_DATE: ioDate,
      CUST_CD: supplierCode,
      REMARKS: `정산 배치: ${batch.batchNumber} (${periodStr})`,
      ITEMS: [
        {
          PROD_DES: `드롭쉬핑 정산 - ${batch.batchNumber}`,
          SUPPLY_AMT: Math.round(batch.netAmount / 1.1), // 공급가액 (VAT 제외)
          VAT_AMT: Math.round(batch.netAmount - batch.netAmount / 1.1), // VAT
          TOTAL_AMT: batch.netAmount,
          REMARKS: `기간: ${periodStr}, 총매출: ${batch.totalAmount.toLocaleString()}원, 수수료: ${batch.commissionAmount.toLocaleString()}원`,
        },
      ],
    };

    // 지급전표: Supplier에게 대금 지급
    const payment: EcountPaymentVoucher = {
      IO_DATE: ioDate,
      CUST_CD: supplierCode,
      PAY_TYPE: 'BANK', // 계좌이체
      PAY_AMT: batch.netAmount,
      REMARKS: `드롭쉬핑 정산 지급 - ${batch.batchNumber} (${periodStr})`,
    };

    return { purchase, payment };
  }
}

// Singleton instance
let ecountApiClientInstance: EcountApiClient | null = null;

export function getEcountApiClient(): EcountApiClient {
  if (!ecountApiClientInstance) {
    ecountApiClientInstance = new EcountApiClient();
  }
  return ecountApiClientInstance;
}

export default EcountApiClient;
