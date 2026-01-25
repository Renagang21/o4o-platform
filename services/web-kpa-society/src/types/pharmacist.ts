/**
 * Pharmacist Types - 약사 회원 정보 타입 정의
 *
 * WO-KPA-PHARMACIST-TYPE-V1
 * WO-KPA-FEE-CATEGORY-2025-V1: 2025년 약사회비 체계 반영
 * 대한약사회 약사 회원 신고서 양식 기반 데이터 구조
 */

// ============================================
// 기본 코드 타입
// ============================================

/**
 * 약사 직능 분류 (간단 - 레거시 호환용)
 * @deprecated Use PharmacistFeeCategory for detailed classification
 */
export type PharmacistFunction =
  | 'pharmacy'   // 약국 약사
  | 'hospital'   // 병원 약사
  | 'industry'   // 산업체 약사
  | 'other';     // 기타

/**
 * 2025년 약사 회비 분류 체계
 * 대한약사회 연회비 내역 리스트 기준
 */
export type PharmacistFeeCategory =
  // 면허사용자(갑) - Type A
  | 'A1_pharmacy_owner'           // 약국 개설자 (788,000원)
  | 'A2_pharma_manager'           // 제약·도매·수출입업·종합약국·학술용약국·관리약사 (643,000원)
  // 면허사용자(을) - Type B
  | 'B1_pharmacy_employee'        // 약국 근무약사 (413,000원)
  | 'B2_pharma_company_employee'  // 제약근무·도매근무·생산업체·수출입근무약사 (398,000원)
  // 면허사용자(병) - Type C
  | 'C1_hospital'                 // 의료기관 근무약사 (143,000원)
  | 'C2_admin_edu_research'       // 행정·교육·연구 (143,000원)
  // 면허사용자(정) - Type D
  | 'D_fee_exempted';             // 회비면제자·미취업자 (70,000원)

/**
 * 회비 분류 그룹 (갑/을/병/정)
 */
export type FeeCategoryGroup = 'A' | 'B' | 'C' | 'D';

/**
 * 2025년 회비 분류별 라벨
 */
export const FEE_CATEGORY_LABELS: Record<PharmacistFeeCategory, string> = {
  'A1_pharmacy_owner': '약국 개설자',
  'A2_pharma_manager': '제약·도매·수출입업·종합약국·학술용약국·관리약사',
  'B1_pharmacy_employee': '약국 근무약사',
  'B2_pharma_company_employee': '제약근무·도매근무·생산업체·수출입근무약사',
  'C1_hospital': '의료기관 근무약사',
  'C2_admin_edu_research': '행정·교육·연구',
  'D_fee_exempted': '회비면제자·미취업자',
};

/**
 * 회비 분류별 그룹
 */
export const FEE_CATEGORY_GROUPS: Record<PharmacistFeeCategory, { group: FeeCategoryGroup; label: string }> = {
  'A1_pharmacy_owner': { group: 'A', label: '면허사용자(갑)' },
  'A2_pharma_manager': { group: 'A', label: '면허사용자(갑)' },
  'B1_pharmacy_employee': { group: 'B', label: '면허사용자(을)' },
  'B2_pharma_company_employee': { group: 'B', label: '면허사용자(을)' },
  'C1_hospital': { group: 'C', label: '면허사용자(병)' },
  'C2_admin_edu_research': { group: 'C', label: '면허사용자(병)' },
  'D_fee_exempted': { group: 'D', label: '면허사용자(정)' },
};

/**
 * 연회비 상세 내역 (단위: 원)
 * 실제 데이터는 DB에서 관리 (입력/수정/삭제 가능)
 */
export interface AnnualFeeBreakdown {
  kpaFee: number;                    // 대약회비
  cityProvinceFee: number;           // 시약회비
  branchFee: number;                 // 분회회비
  liabilityInsurance: number;        // 약화사고 배상책임 보험료
  patientSafetyFee: number;          // 환자안전약물관리본부 특별회비
  policyResearchFee: number;         // 의약품정책연구소 지원 특별회비
  scholarshipFund: number;           // 대한약사회 장학기금
  properMedicineUseFee: number;      // 약바로쓰기 운동본부 특별회비
  neighborHelpDonation: number;      // 이웃돕기 마퇴성금
  continuingEducationFee: number;    // 연수교육비
  buildingFundFee: number;           // 회관기금 특별회비
  total: number;                     // 합계
}

/**
 * 간소화된 회비 설정 (분회 관리자용)
 */
export interface SimplifiedFeeSettings {
  kpaFee: number;          // 대약회비
  cityProvinceFee: number; // 시약회비
  branchFee: number;       // 분회회비
  otherFees: number;       // 기타 회비 (보험료, 특별회비 등 합산)
}

/**
 * 회비 항목 라벨
 */
export const FEE_ITEM_LABELS = {
  kpaFee: '대약회비',
  cityProvinceFee: '시약회비',
  branchFee: '분회회비',
  liabilityInsurance: '약화사고 배상책임 보험료',
  patientSafetyFee: '환자안전약물관리본부 특별회비',
  policyResearchFee: '의약품정책연구소 지원 특별회비',
  scholarshipFund: '대한약사회 장학기금',
  properMedicineUseFee: '약바로쓰기 운동본부 특별회비',
  neighborHelpDonation: '이웃돕기 마퇴성금',
  continuingEducationFee: '연수교육비',
  buildingFundFee: '회관기금 특별회비',
  otherFees: '기타회비',
} as const;

/**
 * 취업 활동 유형 (상세)
 */
export type ActivityType =
  | 'pharmacy_owner'      // 약국 - 개설약사
  | 'pharmacy_employee'   // 약국 - 근무약사
  | 'hospital'            // 의료기관
  | 'manufacturer'        // 의약품 제조회사
  | 'importer'            // 의약품 수입회사
  | 'wholesaler'          // 의약품 도매회사
  | 'other_industry'      // 의약품산업 외 기업체
  | 'government'          // (준)정부·공공기관
  | 'school'              // 학교
  | 'other'               // 기타
  | 'inactive';           // 미활동

/**
 * 미활동 사유
 */
export type InactiveReason =
  | 'closed_business'     // 휴·폐업
  | 'job_seeking'         // 취업준비
  | 'overseas'            // 해외체류
  | 'leave'               // 휴직
  | 'parenting'           // 출산·육아
  | 'retired'             // 65세 이상 미취업
  | 'military'            // 군 복무
  | 'overseas_resident'   // 해외거주자
  | 'graduate_student';   // 대학원 재학생

/**
 * 의료기관 구분
 */
export type HospitalType =
  | 'general'           // 종합병원
  | 'hospital'          // 병원
  | 'clinic'            // 의원
  | 'nursing_hospital'  // 요양병원
  | 'korean_medicine';  // 한방의료기관

/**
 * 업무 구분 (의료기관)
 */
export type HospitalTask =
  | 'dispensing'      // 조제업무
  | 'non_dispensing'; // 비조제업무

/**
 * 회사 직책
 */
export type CompanyRole =
  | 'owner'    // 대표
  | 'manager'  // 관리자
  | 'staff';   // 직원

/**
 * 의약분업 지역구분
 */
export type SeparationArea =
  | 'separated'   // 분업지역
  | 'exception';  // 분업예외지역

/**
 * 우편물 수신 선택
 */
export type MailingOption =
  | 'work'    // 근무지
  | 'home'    // 거주지
  | 'refuse'; // 수취거부

/**
 * 회비 구분
 */
export type FeeCategory =
  | 'A'  // 갑 - 정상회비
  | 'B'  // 을 - 감면회비
  | 'C'  // 병 - 특별감면
  | 'D'; // 정 - 미취업자/면제자

// ============================================
// 데이터 구조체
// ============================================

/**
 * 인적사항
 */
export interface PharmacistPersonalInfo {
  name: string;                       // 성명
  gender: 'male' | 'female';          // 성별
  birthDate: string;                  // 생년월일 (YYYY-MM-DD)
  licenseNumber: string;              // 면허번호
  licenseYear: string;                // 면허 취득년도
  phone: string;                      // 일반전화
  mobile: string;                     // 휴대전화
  address: string;                    // 거주지 주소 (도로명)
  detailAddress?: string;             // 상세주소
  email: string;                      // 이메일
  university: string;                 // 출신 대학교
  graduationYear: string;             // 졸업년도
  branch: string;                     // 소속 지부
  division: string;                   // 소속 분회
  hasKoreanMedicineLicense: boolean;  // 한약조제자격 유무
}

/**
 * 취업 현황
 */
export interface PharmacistEmployment {
  activityType: ActivityType;         // 취업 활동 유형
  hospitalType?: HospitalType;        // 의료기관 유형 (의료기관일 경우)
  hospitalTask?: HospitalTask;        // 업무 구분 (의료기관일 경우)
  companyRole?: CompanyRole;          // 회사 직책 (제조/수입/도매일 경우)
  workplaceName: string;              // 근무처 명칭
  workplaceAddress: string;           // 근무처 주소 (도로명)
  workplaceDetailAddress?: string;    // 근무처 상세주소
  workplacePhone: string;             // 근무처 전화번호
}

/**
 * 약국 현황 (개설약사에 한함)
 */
export interface PharmacyInfo {
  businessNumber: string;             // 사업자번호
  medicalInstitutionCode: string;     // 요양기관기호
  handlesKoreanMedicine: boolean;     // 한약(첩약) 취급 여부
  handlesAnimalMedicine: boolean;     // 동물약품 취급 여부
  separationArea: SeparationArea;     // 의약분업 지역구분
}

/**
 * 미활동 정보
 */
export interface InactiveInfo {
  reasons: InactiveReason[];          // 미활동 사유 (복수 선택 가능)
  startDate?: string;                 // 미활동 시작일
  expectedEndDate?: string;           // 예상 종료일
}

/**
 * 연수교육 현황
 */
export interface TrainingStatus {
  requiredCredits: number;            // 이수의무 평점
  completedCredits: number;           // 이수 평점
  year: number;                       // 연도
  isExempted: boolean;                // 면제 여부
  exemptionReason?: string;           // 면제 사유
}

/**
 * 우편물 수신 설정
 */
export interface MailingPreference {
  newsletter: MailingOption;          // 약사공론 수신처
  newsletterRefuseReason?: string;    // 약사공론 수취거부 사유
  otherMail: MailingOption;           // 기타 우편물 수신처
  otherMailRefuseReason?: string;     // 기타 우편물 수취거부 사유
}

/**
 * 회비 정보
 */
export interface MembershipFeeInfo {
  category: FeeCategory;              // 회비 구분
  kpaFee: number;                     // 대한약사회 회비
  districtFee: number;                // 지부 회비
  branchFee: number;                  // 분회 회비
  totalFee: number;                   // 총 회비
  isExempted: boolean;                // 면제 여부
  exemptionReason?: string;           // 면제 사유
}

// ============================================
// 연간 신고서 (통합)
// ============================================

/**
 * 연간 약사 회원 신고서 데이터
 */
export interface AnnualReportData {
  id?: string;                        // 신고서 ID
  year: number;                       // 신고 연도
  memberId: string;                   // 회원 ID
  personal: PharmacistPersonalInfo;   // 인적사항
  employment: PharmacistEmployment;   // 취업현황
  pharmacy?: PharmacyInfo;            // 약국 현황 (개설약사에 한함)
  inactive?: InactiveInfo;            // 미활동 정보 (미활동일 경우)
  training?: TrainingStatus;          // 연수교육 현황
  privacyConsent: boolean;            // 개인정보 수집·이용 동의
  feeCategory?: FeeCategory;          // 회비 구분
  mailing: MailingPreference;         // 우편물 수신처
  status: AnnualReportStatus;         // 신고서 상태
  submittedAt?: string;               // 제출일시
  approvedAt?: string;                // 승인일시
  approvedBy?: string;                // 승인자
  createdAt: string;                  // 생성일시
  updatedAt: string;                  // 수정일시
}

/**
 * 연간 신고서 상태
 */
export type AnnualReportStatus =
  | 'draft'              // 작성 중
  | 'submitted'          // 제출됨
  | 'revision_requested' // 수정 요청
  | 'approved'           // 승인됨
  | 'rejected';          // 반려됨

// ============================================
// 약사 회원 정보 (통합)
// ============================================

/**
 * 약사 회원 전체 정보
 */
export interface PharmacistMember {
  id: string;                                     // 회원 ID
  userId: string;                                 // 사용자 계정 ID
  personal: PharmacistPersonalInfo;               // 인적사항
  employment: PharmacistEmployment;               // 현재 취업현황
  pharmacy?: PharmacyInfo;                        // 약국 현황 (개설약사)
  pharmacistFunction: PharmacistFunction;         // 직능 분류
  membershipFee: MembershipFeeInfo;               // 회비 정보
  training: TrainingStatus;                       // 연수교육 현황
  mailing: MailingPreference;                     // 우편물 수신 설정
  annualReports: AnnualReportSummary[];           // 연간 신고서 이력
  isActive: boolean;                              // 활동 회원 여부
  joinedAt: string;                               // 가입일
  createdAt: string;                              // 생성일시
  updatedAt: string;                              // 수정일시
}

/**
 * 연간 신고서 요약 (목록용)
 */
export interface AnnualReportSummary {
  id: string;                         // 신고서 ID
  year: number;                       // 신고 연도
  status: AnnualReportStatus;         // 상태
  submittedAt?: string;               // 제출일
  approvedAt?: string;                // 승인일
}

/**
 * 회원 상태 요약 (분회 관리자 대시보드용)
 */
export interface MemberStatusSummary {
  id: string;                         // 회원 ID
  name: string;                       // 성명
  licenseNumber: string;              // 면허번호
  pharmacistFunction: PharmacistFunction; // 직능
  pharmacyName?: string;              // 약국명 (개설약사)
  annualReport: {
    status: AnnualReportStatus | 'pending' | 'overdue';
    year: number;
    submittedAt?: string;
  };
  training: {
    requiredHours: number;
    completedHours: number;
    status: 'complete' | 'in_progress' | 'not_started';
  };
  fee: {
    status: 'paid' | 'unpaid' | 'partial';
    amount: number;
    paidAmount: number;
    dueDate: string;
  };
}

// ============================================
// 회비 설정 (분회 관리자용)
// ============================================

/**
 * 직능별 회비 설정
 */
export interface FeeSettingByFunction {
  pharmacistFunction: PharmacistFunction;
  kpaFee: number;       // 대한약사회 회비
  districtFee: number;  // 지부 회비
  branchFee: number;    // 분회 회비
  totalFee: number;     // 총 회비
}

/**
 * 분회 회비 설정
 */
export interface BranchFeeSettings {
  branchId: string;
  year: number;
  feesByFunction: Record<PharmacistFunction, {
    kpaFee: number;
    districtFee: number;
    branchFee: number;
  }>;
  updatedAt: string;
  updatedBy: string;
}

/**
 * 2025 회비 분류별 분회 회비 설정
 */
export interface BranchFeeSettings2025 {
  branchId: string;
  year: number;
  feesByCategory: Record<PharmacistFeeCategory, AnnualFeeBreakdown>;
  updatedAt: string;
  updatedBy: string;
}

// ============================================
// 헬퍼 함수 및 상수
// ============================================

/**
 * 약국 개설자 여부 확인 (공동구매 참여 가능)
 */
export function isPharmacyOwner(category: PharmacistFeeCategory): boolean {
  return category === 'A1_pharmacy_owner';
}

/**
 * 공동구매 참여 가능 여부 확인
 * 현재는 약국 개설자만 공동구매 참여 가능
 */
export function canParticipateInGroupBuy(category: PharmacistFeeCategory): boolean {
  return isPharmacyOwner(category);
}

/**
 * 취업 활동 유형에서 회비 분류 추론
 */
export function inferFeeCategory(activityType: ActivityType): PharmacistFeeCategory {
  switch (activityType) {
    case 'pharmacy_owner':
      return 'A1_pharmacy_owner';
    case 'pharmacy_employee':
      return 'B1_pharmacy_employee';
    case 'hospital':
      return 'C1_hospital';
    case 'manufacturer':
    case 'importer':
    case 'wholesaler':
      return 'B2_pharma_company_employee';
    case 'government':
    case 'school':
      return 'C2_admin_edu_research';
    case 'inactive':
      return 'D_fee_exempted';
    default:
      return 'C2_admin_edu_research';
  }
}

/**
 * 대시보드 타입 (약국 개설자 vs 일반 약사)
 */
export type DashboardType = 'pharmacy_owner' | 'general';

/**
 * 회비 분류에 따른 대시보드 타입 반환
 */
export function getDashboardType(category: PharmacistFeeCategory): DashboardType {
  return isPharmacyOwner(category) ? 'pharmacy_owner' : 'general';
}
