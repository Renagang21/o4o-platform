/**
 * CsvPaymentImporter
 *
 * 은행 이체 내역 CSV 업로드 및 자동 납부 매칭 서비스
 * - CSV 파싱 및 유효성 검증
 * - 회원 자동 매칭 (이름, 금액, 입금자명, 면허번호 기반)
 * - 미매칭 항목 예외 처리
 * - 납부 자동 등록
 *
 * Phase R1.1: MembershipReadPort 사용으로 의존성 전환
 */

import { DataSource, Repository, In } from 'typeorm';
import { FeePayment } from '../entities/FeePayment.js';
import { FeeInvoice } from '../entities/FeeInvoice.js';
import { FeeLogService } from './FeeLogService.js';
import type { MembershipReadPort, MemberBasicInfo } from '@o4o/membership-yaksa';

export interface CsvRow {
  // 은행 CSV 공통 필드
  transactionDate: string; // 거래일시
  depositorName: string; // 입금자명
  amount: number; // 입금액
  memo?: string; // 적요/메모
  bankName?: string; // 은행명
  accountNumber?: string; // 계좌번호
  transactionId?: string; // 거래번호 (선택)
}

export interface ParsedCsvData {
  rows: CsvRow[];
  errors: { row: number; message: string }[];
  totalAmount: number;
  rowCount: number;
}

export interface MatchResult {
  csvRow: CsvRow;
  status: 'matched' | 'multiple_matches' | 'no_match' | 'already_paid';
  confidence: number; // 0-100
  matchedInvoice?: FeeInvoice;
  matchedMember?: {
    id: string;
    name: string;
    licenseNumber?: string;
  };
  candidates?: Array<{
    invoice: FeeInvoice;
    member: { id: string; name: string };
    confidence: number;
    matchReason: string;
  }>;
  reason?: string;
}

export interface ImportOptions {
  year: number;
  csvContent: string;
  csvFormat?: 'standard' | 'woori' | 'kookmin' | 'shinhan' | 'hana' | 'nonghyup';
  autoConfirmThreshold?: number; // 자동 확정 신뢰도 임계값 (기본 90)
  dryRun?: boolean;
}

export interface ImportResult {
  success: boolean;
  parsed: ParsedCsvData;
  matches: MatchResult[];
  summary: {
    total: number;
    matched: number;
    multipleMatches: number;
    noMatch: number;
    alreadyPaid: number;
    autoConfirmed: number;
    pendingReview: number;
    totalAmount: number;
    matchedAmount: number;
  };
  createdPayments?: FeePayment[];
}

// CSV 포맷별 컬럼 매핑
const CSV_FORMATS: Record<
  string,
  {
    transactionDate: number | string;
    depositorName: number | string;
    amount: number | string;
    memo?: number | string;
    delimiter?: string;
    skipRows?: number;
    dateFormat?: string;
  }
> = {
  standard: {
    transactionDate: 0,
    depositorName: 1,
    amount: 2,
    memo: 3,
    delimiter: ',',
    skipRows: 1,
  },
  woori: {
    transactionDate: 0,
    depositorName: 3,
    amount: 4,
    memo: 5,
    delimiter: ',',
    skipRows: 1,
    dateFormat: 'YYYY-MM-DD',
  },
  kookmin: {
    transactionDate: 0,
    depositorName: 2,
    amount: 4,
    memo: 6,
    delimiter: ',',
    skipRows: 1,
  },
  shinhan: {
    transactionDate: 0,
    depositorName: 3,
    amount: 5,
    memo: 7,
    delimiter: ',',
    skipRows: 2,
  },
  hana: {
    transactionDate: 0,
    depositorName: 2,
    amount: 3,
    memo: 4,
    delimiter: ',',
    skipRows: 1,
  },
  nonghyup: {
    transactionDate: 0,
    depositorName: 3,
    amount: 4,
    memo: 5,
    delimiter: ',',
    skipRows: 1,
  },
};

export class CsvPaymentImporter {
  private paymentRepo: Repository<FeePayment>;
  private invoiceRepo: Repository<FeeInvoice>;
  private logService: FeeLogService;
  private membershipPort: MembershipReadPort | null = null;

  constructor(private dataSource: DataSource) {
    this.paymentRepo = dataSource.getRepository(FeePayment);
    this.invoiceRepo = dataSource.getRepository(FeeInvoice);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * Phase R1.1: MembershipReadPort 주입
   */
  setMembershipPort(port: MembershipReadPort): void {
    this.membershipPort = port;
  }

  /**
   * CSV 파일 임포트 및 자동 매칭
   */
  async importCsv(
    options: ImportOptions,
    performedBy?: string
  ): Promise<ImportResult> {
    const {
      year,
      csvContent,
      csvFormat = 'standard',
      autoConfirmThreshold = 90,
      dryRun = false,
    } = options;

    // 1. CSV 파싱
    const parsed = this.parseCsv(csvContent, csvFormat);

    if (parsed.rows.length === 0) {
      return {
        success: false,
        parsed,
        matches: [],
        summary: {
          total: 0,
          matched: 0,
          multipleMatches: 0,
          noMatch: 0,
          alreadyPaid: 0,
          autoConfirmed: 0,
          pendingReview: 0,
          totalAmount: 0,
          matchedAmount: 0,
        },
      };
    }

    // 2. 해당 연도 청구서 및 회원 정보 조회
    const invoices = await this.invoiceRepo.find({
      where: { year, status: In(['pending', 'sent', 'overdue']) },
    });

    const memberIds = invoices.map((inv) => inv.memberId);

    // Phase R1.1: MembershipReadPort를 통한 회원 정보 조회
    let members: MemberBasicInfo[];
    if (this.membershipPort && memberIds.length > 0) {
      members = await this.membershipPort.getMembersByIds(memberIds);
    } else if (memberIds.length > 0) {
      // Fallback: 기존 방식 (deprecated)
      console.warn('[CsvPaymentImporter] MembershipReadPort not set. Using legacy repository access.');
      const memberRepo = this.dataSource.getRepository('YaksaMember');
      const rawMembers = await memberRepo.find({ where: { id: In(memberIds) } });
      members = rawMembers.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        licenseNumber: m.licenseNumber,
        registrationNumber: m.registrationNumber,
      }));
    } else {
      members = [];
    }

    const memberMap = new Map(members.map((m) => [m.id, m]));

    // 3. 각 CSV 행에 대해 매칭 수행
    const matches: MatchResult[] = [];

    for (const row of parsed.rows) {
      const matchResult = await this.findMatch(row, invoices, memberMap, year);
      matches.push(matchResult);
    }

    // 4. 결과 집계
    const summary = {
      total: matches.length,
      matched: matches.filter((m) => m.status === 'matched').length,
      multipleMatches: matches.filter((m) => m.status === 'multiple_matches').length,
      noMatch: matches.filter((m) => m.status === 'no_match').length,
      alreadyPaid: matches.filter((m) => m.status === 'already_paid').length,
      autoConfirmed: 0,
      pendingReview: 0,
      totalAmount: parsed.totalAmount,
      matchedAmount: matches
        .filter((m) => m.status === 'matched')
        .reduce((sum, m) => sum + m.csvRow.amount, 0),
    };

    // 5. 자동 확정 및 납부 생성 (dryRun이 아닌 경우)
    const createdPayments: FeePayment[] = [];

    if (!dryRun) {
      for (const match of matches) {
        if (match.status === 'matched' && match.confidence >= autoConfirmThreshold) {
          const payment = await this.createPaymentFromMatch(match, year, performedBy);
          if (payment) {
            createdPayments.push(payment);
            summary.autoConfirmed++;
          }
        } else if (match.status === 'matched' || match.status === 'multiple_matches') {
          summary.pendingReview++;
        }
      }

      // 임포트 로그
      await this.logService.log({
        action: 'batch_invoice_generated',
        entityType: 'payment',
        entityId: `csv-import-${year}-${Date.now()}`,
        year,
        data: {
          csvImport: true,
          csvFormat,
          summary,
          autoConfirmThreshold,
        },
        actorId: performedBy,
        actorType: performedBy ? 'admin' : 'batch',
      });
    }

    return {
      success: true,
      parsed,
      matches,
      summary,
      createdPayments: dryRun ? undefined : createdPayments,
    };
  }

  /**
   * CSV 파싱
   */
  private parseCsv(content: string, format: string): ParsedCsvData {
    const formatConfig = CSV_FORMATS[format] || CSV_FORMATS.standard;
    const delimiter = formatConfig.delimiter || ',';
    const skipRows = formatConfig.skipRows || 1;

    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const rows: CsvRow[] = [];
    const errors: { row: number; message: string }[] = [];
    let totalAmount = 0;

    for (let i = skipRows; i < lines.length; i++) {
      try {
        const columns = this.parseCsvLine(lines[i], delimiter);

        const transactionDate = this.getColumnValue(
          columns,
          formatConfig.transactionDate
        );
        const depositorName = this.getColumnValue(
          columns,
          formatConfig.depositorName
        );
        const amountStr = this.getColumnValue(columns, formatConfig.amount);
        const memo = formatConfig.memo
          ? this.getColumnValue(columns, formatConfig.memo)
          : undefined;

        // 금액 파싱 (콤마 및 통화 기호 제거)
        const amount = this.parseAmount(amountStr);

        if (!transactionDate || !depositorName || isNaN(amount)) {
          errors.push({
            row: i + 1,
            message: '필수 필드 누락 또는 잘못된 형식',
          });
          continue;
        }

        // 입금만 처리 (양수 금액)
        if (amount <= 0) {
          continue;
        }

        rows.push({
          transactionDate,
          depositorName: depositorName.trim(),
          amount,
          memo: memo?.trim(),
        });

        totalAmount += amount;
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : '파싱 오류',
        });
      }
    }

    return {
      rows,
      errors,
      totalAmount,
      rowCount: rows.length,
    };
  }

  /**
   * CSV 라인 파싱 (따옴표 처리)
   */
  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  /**
   * 컬럼 값 추출
   */
  private getColumnValue(
    columns: string[],
    index: number | string
  ): string {
    if (typeof index === 'number') {
      return columns[index] || '';
    }
    return '';
  }

  /**
   * 금액 파싱
   */
  private parseAmount(amountStr: string): number {
    // 콤마, 원화 기호, 공백 제거
    const cleaned = amountStr
      .replace(/[,₩원\s]/g, '')
      .replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * 매칭 수행
   */
  private async findMatch(
    row: CsvRow,
    invoices: FeeInvoice[],
    memberMap: Map<string, MemberBasicInfo>,
    year: number
  ): Promise<MatchResult> {
    const candidates: MatchResult['candidates'] = [];

    for (const invoice of invoices) {
      const member = memberMap.get(invoice.memberId);
      if (!member) continue;

      // 이미 납부된 청구서인지 확인
      const existingPayment = await this.paymentRepo.findOne({
        where: { invoiceId: invoice.id, status: 'completed' },
      });

      if (existingPayment) {
        continue; // 이미 납부 완료
      }

      // 매칭 점수 계산
      const { score, reason } = this.calculateMatchScore(
        row,
        invoice,
        member
      );

      if (score > 0) {
        candidates.push({
          invoice,
          member: {
            id: member.id,
            name: member.name,
          },
          confidence: score,
          matchReason: reason,
        });
      }
    }

    // 후보가 없는 경우
    if (candidates.length === 0) {
      // 금액이 일치하는 이미 납부된 건이 있는지 확인
      const paidInvoice = await this.checkAlreadyPaid(row, year);
      if (paidInvoice) {
        return {
          csvRow: row,
          status: 'already_paid',
          confidence: 0,
          reason: '이미 납부 완료된 건과 일치',
        };
      }

      return {
        csvRow: row,
        status: 'no_match',
        confidence: 0,
        reason: '일치하는 청구서를 찾을 수 없음',
      };
    }

    // 최고 점수 후보 정렬
    candidates.sort((a, b) => b.confidence - a.confidence);

    // 단일 매칭 (최고 점수가 확실히 높은 경우)
    if (
      candidates.length === 1 ||
      (candidates.length > 1 && candidates[0].confidence - candidates[1].confidence >= 20)
    ) {
      const best = candidates[0];
      return {
        csvRow: row,
        status: 'matched',
        confidence: best.confidence,
        matchedInvoice: best.invoice,
        matchedMember: best.member,
        candidates,
      };
    }

    // 복수 매칭 (확신 불가)
    return {
      csvRow: row,
      status: 'multiple_matches',
      confidence: candidates[0].confidence,
      candidates,
      reason: `${candidates.length}개의 유사한 후보 발견`,
    };
  }

  /**
   * 매칭 점수 계산
   */
  private calculateMatchScore(
    row: CsvRow,
    invoice: FeeInvoice,
    member: MemberBasicInfo
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // 1. 금액 일치 (40점)
    if (row.amount === invoice.amount) {
      score += 40;
      reasons.push('금액 일치');
    } else if (Math.abs(row.amount - invoice.amount) <= 100) {
      score += 20;
      reasons.push('금액 유사');
    }

    // 2. 이름 매칭 (35점)
    const nameScore = this.calculateNameSimilarity(
      row.depositorName,
      member.name
    );
    if (nameScore >= 1.0) {
      score += 35;
      reasons.push('이름 완전 일치');
    } else if (nameScore >= 0.8) {
      score += 25;
      reasons.push('이름 유사');
    } else if (nameScore >= 0.5) {
      score += 15;
      reasons.push('이름 부분 일치');
    }

    // 3. 면허번호 매칭 (25점) - 적요/메모에 포함된 경우
    if (row.memo && member.licenseNumber) {
      if (row.memo.includes(member.licenseNumber)) {
        score += 25;
        reasons.push('면허번호 일치');
      }
    }

    // 4. 입금자명에 면허번호 포함 (15점)
    if (member.licenseNumber && row.depositorName.includes(member.licenseNumber)) {
      score += 15;
      reasons.push('입금자명에 면허번호 포함');
    }

    return {
      score: Math.min(score, 100),
      reason: reasons.join(', '),
    };
  }

  /**
   * 이름 유사도 계산 (Levenshtein Distance 기반)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    // 공백 및 특수문자 정규화
    const normalize = (str: string) =>
      str
        .replace(/\s+/g, '')
        .replace(/[^\w가-힣]/g, '')
        .toLowerCase();

    const n1 = normalize(name1);
    const n2 = normalize(name2);

    if (n1 === n2) return 1.0;

    // 포함 관계 체크
    if (n1.includes(n2) || n2.includes(n1)) {
      return 0.9;
    }

    // Levenshtein Distance
    const distance = this.levenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);

    if (maxLen === 0) return 0;

    return Math.max(0, 1 - distance / maxLen);
  }

  /**
   * Levenshtein Distance 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * 이미 납부 완료된 건인지 확인
   */
  private async checkAlreadyPaid(
    row: CsvRow,
    year: number
  ): Promise<FeeInvoice | null> {
    // 동일 금액의 완료된 납부가 있는지 확인
    const payment = await this.paymentRepo.findOne({
      where: {
        amount: row.amount,
        status: 'completed',
      },
    });

    if (payment) {
      const invoice = await this.invoiceRepo.findOne({
        where: { id: payment.invoiceId, year },
      });
      return invoice;
    }

    return null;
  }

  /**
   * 매칭 결과로부터 납부 생성
   */
  private async createPaymentFromMatch(
    match: MatchResult,
    year: number,
    performedBy?: string
  ): Promise<FeePayment | null> {
    if (!match.matchedInvoice || !match.matchedMember) {
      return null;
    }

    // 중복 방지: 이미 이 청구서에 대한 완료된 납부가 있는지 확인
    const existingPayment = await this.paymentRepo.findOne({
      where: {
        invoiceId: match.matchedInvoice.id,
        status: 'completed',
      },
    });

    if (existingPayment) {
      return null;
    }

    // 납부 생성
    const payment = this.paymentRepo.create({
      invoiceId: match.matchedInvoice.id,
      memberId: match.matchedMember.id,
      amount: match.csvRow.amount,
      method: 'bank_transfer',
      status: 'completed',
      paidAt: this.parseTransactionDate(match.csvRow.transactionDate),
      receiptNumber: this.generateReceiptNumber(year),
      note: `CSV 자동 매칭 (신뢰도: ${match.confidence}%, 입금자: ${match.csvRow.depositorName})`,
    });

    await this.paymentRepo.save(payment);

    // 청구서 상태 업데이트
    match.matchedInvoice.status = 'paid';
    match.matchedInvoice.paidAt = new Date();
    match.matchedInvoice.paidAmount = match.csvRow.amount;
    await this.invoiceRepo.save(match.matchedInvoice);

    // 로그 기록
    await this.logService.log({
      action: 'payment_created',
      entityType: 'payment',
      entityId: payment.id,
      memberId: match.matchedMember.id,
      year,
      data: {
        csvAutoMatch: true,
        csvDepositor: match.csvRow.depositorName,
        csvAmount: match.csvRow.amount,
        transactionDate: match.csvRow.transactionDate,
        confidence: match.confidence,
        matchReason: match.candidates?.[0]?.matchReason,
      },
      actorId: performedBy,
      actorType: performedBy ? 'admin' : 'batch',
    });

    return payment;
  }

  /**
   * 거래일자 파싱
   */
  private parseTransactionDate(dateStr: string): Date {
    // 다양한 날짜 형식 지원
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /^(\d{4})\.(\d{2})\.(\d{2})/, // YYYY.MM.DD
      /^(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
      /^(\d{2})-(\d{2})-(\d{2})/, // YY-MM-DD
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year = parseInt(match[1]);
        if (year < 100) year += 2000;
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        return new Date(year, month, day);
      }
    }

    // 기본값: 현재 날짜
    return new Date();
  }

  /**
   * 영수증 번호 생성
   */
  private generateReceiptNumber(year: number): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `${year}-${month}${day}${random}`;
  }

  /**
   * 수동 매칭 확정
   */
  async confirmMatch(
    csvRow: CsvRow,
    invoiceId: string,
    performedBy?: string
  ): Promise<{ success: boolean; payment?: FeePayment; error?: string }> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: '청구서를 찾을 수 없습니다.' };
    }

    // 이미 납부 완료 체크
    const existingPayment = await this.paymentRepo.findOne({
      where: { invoiceId, status: 'completed' },
    });

    if (existingPayment) {
      return { success: false, error: '이미 납부 완료된 청구서입니다.' };
    }

    // 납부 생성
    const payment = this.paymentRepo.create({
      invoiceId,
      memberId: invoice.memberId,
      amount: csvRow.amount,
      method: 'bank_transfer',
      status: 'completed',
      paidAt: this.parseTransactionDate(csvRow.transactionDate),
      receiptNumber: this.generateReceiptNumber(invoice.year),
      note: `CSV 수동 매칭 (입금자: ${csvRow.depositorName})`,
    });

    await this.paymentRepo.save(payment);

    // 청구서 상태 업데이트
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paidAmount = csvRow.amount;
    await this.invoiceRepo.save(invoice);

    // 로그 기록
    await this.logService.log({
      action: 'payment_created',
      entityType: 'payment',
      entityId: payment.id,
      memberId: invoice.memberId,
      year: invoice.year,
      data: {
        csvManualMatch: true,
        csvDepositor: csvRow.depositorName,
        csvAmount: csvRow.amount,
        transactionDate: csvRow.transactionDate,
      },
      actorId: performedBy,
      actorType: performedBy ? 'admin' : 'system',
    });

    return { success: true, payment };
  }

  /**
   * 미매칭 건 수동 처리 (신규 회원 등록 또는 기타 처리)
   */
  async handleUnmatched(
    csvRow: CsvRow,
    action: 'skip' | 'create_pending' | 'refund',
    note?: string,
    performedBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.logService.log({
      action: 'manual_adjustment',
      entityType: 'payment',
      entityId: `unmatched-${Date.now()}`,
      data: {
        csvRow,
        action,
        note,
      },
      actorId: performedBy,
      actorType: performedBy ? 'admin' : 'system',
    });

    return { success: true };
  }
}

export function createCsvPaymentImporter(dataSource: DataSource): CsvPaymentImporter {
  return new CsvPaymentImporter(dataSource);
}
