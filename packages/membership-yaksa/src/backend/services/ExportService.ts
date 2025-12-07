import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Member } from '../entities/Member.js';
import { Verification } from '../entities/Verification.js';
import { MemberCategory } from '../entities/MemberCategory.js';
import { MemberService, MemberFilterDto } from './MemberService.js';

/**
 * ExportService
 *
 * Excel 파일 생성 및 export 서비스
 */
export class ExportService {
  private memberService: MemberService;

  constructor(private dataSource: DataSource) {
    this.memberService = new MemberService(dataSource);
  }

  /**
   * Members를 Excel로 export
   */
  async exportMembers(filter?: MemberFilterDto): Promise<Buffer> {
    // 모든 회원 조회 (페이지네이션 제거)
    const filterWithoutPagination = { ...filter, page: undefined, limit: undefined };
    const result = await this.memberService.list(filterWithoutPagination);
    const members = result.data;

    // Excel 데이터 생성
    const data = members.map((member) => {
      const computed = this.memberService.computeStatus(member);

      return {
        이름: member.name,
        면허번호: member.licenseNumber,
        분류: member.category?.name || '미분류',
        조직ID: member.organizationId,
        약국명: member.pharmacyName || '-',
        전화번호: member.phone || '-',
        이메일: member.email || '-',
        검증상태: computed.verificationStatus === 'approved'
          ? '검증됨'
          : computed.verificationStatus === 'pending'
          ? '대기중'
          : computed.verificationStatus === 'rejected'
          ? '거부됨'
          : '미검증',
        연회비상태: computed.feeStatus === 'paid'
          ? '납부'
          : computed.feeStatus === 'unpaid'
          ? '미납'
          : '불필요',
        활성상태: member.isActive ? '활성' : '비활성',
        가입일: new Date(member.createdAt).toLocaleDateString('ko-KR'),
      };
    });

    // Workbook 생성
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '회원목록');

    // 컬럼 너비 자동 조정
    const columnWidths = [
      { wch: 10 }, // 이름
      { wch: 15 }, // 면허번호
      { wch: 10 }, // 분류
      { wch: 30 }, // 조직ID
      { wch: 20 }, // 약국명
      { wch: 15 }, // 전화번호
      { wch: 25 }, // 이메일
      { wch: 10 }, // 검증상태
      { wch: 12 }, // 연회비상태
      { wch: 10 }, // 활성상태
      { wch: 12 }, // 가입일
    ];
    worksheet['!cols'] = columnWidths;

    // Buffer로 변환
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Verifications를 Excel로 export
   */
  async exportVerifications(filter?: {
    status?: string;
    organizationId?: string;
  }): Promise<Buffer> {
    const verificationRepo = this.dataSource.getRepository(Verification);

    const queryBuilder = verificationRepo
      .createQueryBuilder('verification')
      .leftJoinAndSelect('verification.member', 'member')
      .leftJoinAndSelect('member.category', 'category')
      .orderBy('verification.createdAt', 'DESC');

    if (filter?.status) {
      queryBuilder.andWhere('verification.status = :status', { status: filter.status });
    }

    if (filter?.organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', {
        organizationId: filter.organizationId,
      });
    }

    const verifications = await queryBuilder.getMany();

    // Excel 데이터 생성
    const data = verifications.map((verification) => ({
      회원명: verification.member?.name || '-',
      면허번호: verification.member?.licenseNumber || '-',
      검증방법: verification.method,
      상태: verification.status === 'approved'
        ? '승인'
        : verification.status === 'pending'
        ? '대기'
        : '거부',
      거부사유: verification.rejectionReason || '-',
      검증일: verification.verifiedAt
        ? new Date(verification.verifiedAt).toLocaleDateString('ko-KR')
        : '-',
      요청일: new Date(verification.createdAt).toLocaleDateString('ko-KR'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '검증내역');

    // 컬럼 너비 자동 조정
    worksheet['!cols'] = [
      { wch: 10 }, // 회원명
      { wch: 15 }, // 면허번호
      { wch: 15 }, // 검증방법
      { wch: 10 }, // 상태
      { wch: 30 }, // 거부사유
      { wch: 12 }, // 검증일
      { wch: 12 }, // 요청일
    ];

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Categories를 Excel로 export
   */
  async exportCategories(): Promise<Buffer> {
    const categoryRepo = this.dataSource.getRepository(MemberCategory);
    const categories = await categoryRepo.find({
      order: { sortOrder: 'ASC' },
    });

    // Excel 데이터 생성
    const data = categories.map((category) => ({
      분류명: category.name,
      설명: category.description || '-',
      연회비필요: category.requiresAnnualFee ? '예' : '아니오',
      연회비금액: category.annualFeeAmount
        ? `${category.annualFeeAmount.toLocaleString()}원`
        : '-',
      정렬순서: category.sortOrder,
      활성상태: category.isActive ? '활성' : '비활성',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '회원분류');

    // 컬럼 너비 자동 조정
    worksheet['!cols'] = [
      { wch: 15 }, // 분류명
      { wch: 40 }, // 설명
      { wch: 12 }, // 연회비필요
      { wch: 15 }, // 연회비금액
      { wch: 10 }, // 정렬순서
      { wch: 10 }, // 활성상태
    ];

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}
