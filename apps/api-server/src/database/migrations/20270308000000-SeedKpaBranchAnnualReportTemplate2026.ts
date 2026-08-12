/**
 * SeedKpaBranchAnnualReportTemplate2026
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1
 *
 * 2026년도 약사 회원 신고서 — O4O 운영 기준본 (kpa-branch / year=2026 / version=1 / active).
 *
 * 근거 자료:
 *   - 대한약사회 공문 «2026년도 약사 정기 회원신고 협조 요청» (대약 제2025-1252호, 2025-12-22)
 *       → 신고기간 2026-01-01 ~ 2026-02-28, 온라인 창구 member.kpanet.or.kr,
 *         2018~2025 미신고자는 온라인 불가(서면) → rule R9
 *   - 대한약사회 «2021년도 약사 회원 신고서(공통)» 종이 양식 → 필드·선택지 원문
 *   - IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-TEMPLATE-FINALIZATION-V1
 *   - IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-STEP3-STEP4-CLOSE-V1
 *   - WO 본문이 확정한 STEP 03·04 구조 (조제/비조제 = 의료기관 공통 필드,
 *     미활동 선택 시 일반 근무처 입력 숨김)
 *
 * 이 seed 는 **O4O 운영 기준본**이다. 향후 실제 대한약사회 온라인 화면과 차이가 확인되면
 * 이 row 를 고치지 않고 **version=2 를 새로 넣어** 교체한다 (제출 데이터 보존 — WO 원칙).
 *
 * 라벨 표기 원칙:
 *   WO 본문이 축약한 2건은 **종이 양식 원문을 보존**했다.
 *     WO "정부·공공기관"              → 원문 "(준)정부·공공기관"
 *     WO "의약품·의약외품 제조회사"   → 원문 "의약품·의약외품 제조회사(위탁제조판매업 포함)"
 *   value 는 동일하므로 데이터 호환성에 영향이 없다. 축약형을 쓰려면 label 만 바꾸면 된다.
 *
 * 멱등: (service_key, year, version) 충돌 시 schema/title/기간을 덮어쓴다.
 *   본 WO 범위에 Template 편집 UI 가 없으므로 seed 가 단일 진실이다.
 *   편집 UI 도입 시 이 DO UPDATE 를 DO NOTHING 으로 전환해야 한다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

const SERVICE_KEY = 'kpa-branch';
const YEAR = 2026;
const VERSION = 1;

/** 취업 활동유형 11종 — 2021 종이 양식 «취업현황 › 근무처 구분» 원문 */
const ACTIVITY_TYPE_OPTIONS = [
  { value: 'pharmacy_owner', label: '약국 — 개설약사' },
  { value: 'pharmacy_employee', label: '약국 — 근무약사' },
  { value: 'hospital', label: '의료기관' },
  { value: 'manufacturer', label: '의약품·의약외품 제조회사(위탁제조판매업 포함)' },
  { value: 'importer', label: '의약품 수입회사' },
  { value: 'wholesaler', label: '의약품 도매회사' },
  { value: 'other_industry', label: '의약품산업 외 기업체' },
  { value: 'government', label: '(준)정부·공공기관' },
  { value: 'school', label: '학교' },
  { value: 'other', label: '기타' },
  { value: 'inactive', label: '미활동' },
];

/** 의료기관 종별 7종 — 원문에 치과의료기관·보건소 등 지역보건의료기관 포함 */
const HOSPITAL_TYPE_OPTIONS = [
  { value: 'general', label: '종합병원' },
  { value: 'hospital', label: '병원' },
  { value: 'clinic', label: '의원' },
  { value: 'nursing_hospital', label: '요양병원' },
  { value: 'korean_medicine', label: '한방의료기관' },
  { value: 'dental', label: '치과의료기관' },
  { value: 'public_health', label: '보건소 등 지역보건의료기관' },
];

/**
 * 업종별 세부역할.
 * 중간 항목은 업종마다 **약사법상 별개 선임직**이므로 단일 enum 으로 접지 않는다.
 * (제조관리자·안전관리책임자 ≠ 수입관리자 ≠ 도매업무관리자)
 */
const MANUFACTURER_ROLE_OPTIONS = [
  { value: 'owner', label: '경영자' },
  { value: 'manager', label: '제조관리자·안전관리책임자' },
  { value: 'staff', label: '그 외' },
];
const IMPORTER_ROLE_OPTIONS = [
  { value: 'owner', label: '경영자' },
  { value: 'manager', label: '수입관리자' },
  { value: 'staff', label: '그 외' },
];
const WHOLESALER_ROLE_OPTIONS = [
  { value: 'owner', label: '경영자' },
  { value: 'manager', label: '도매업무관리자' },
  { value: 'staff', label: '그 외' },
];

/** 미활동 사유 9종 — 원문의 2개 층위를 group 으로 보존 */
const INACTIVE_REASON_OPTIONS = [
  { value: 'closed_business', label: '휴·폐업', group: '6개월 이상 조제업무 미종사' },
  { value: 'job_seeking', label: '취업준비', group: '6개월 이상 조제업무 미종사' },
  { value: 'overseas', label: '해외체류', group: '6개월 이상 조제업무 미종사' },
  { value: 'leave', label: '휴직', group: '6개월 이상 조제업무 미종사' },
  { value: 'parenting', label: '출산·육아', group: '6개월 이상 조제업무 미종사' },
  { value: 'retired', label: '65세 이상 미취업' },
  { value: 'military', label: '군 복무' },
  { value: 'overseas_resident', label: '해외거주자' },
  { value: 'graduate_student', label: '대학원 재학생' },
];

const MAILING_OPTIONS = [
  { value: 'work', label: '근무지' },
  { value: 'home', label: '거주지' },
  { value: 'refuse', label: '수취거부' },
];

const PHARMACY_HANDLE_OPTIONS = [
  { value: true, label: '취급' },
  { value: false, label: '취급안함' },
];

/**
 * export 하는 이유: DB 왕복 없이 양식을 정적 검증(STEP 4개 / 조건부 rule / ownership 구분 /
 * 조사용 임시값 부재)할 수 있어야 한다. 값은 순수 리터럴이라 export 가 동작을 바꾸지 않는다.
 */
export const TEMPLATE_SCHEMA = {
  templateVersion: '2026.1',

  steps: [
    { key: 'consent', order: 1, title: '약관동의' },
    { key: 'personal', order: 2, title: '인적사항' },
    { key: 'employment', order: 3, title: '취업현황' },
    { key: 'etc', order: 4, title: '기타사항' },
  ],

  fields: [
    // ══════════════ STEP 01 약관동의 (2) ══════════════
    {
      key: 'consent.privacy',
      label: '개인정보의 수집·이용 동의',
      type: 'consent',
      step: 'consent',
      order: 1,
      ownership: 'member',
      required: true,
      readonly: false,
      hint: '회원신고 처리를 위한 필수 동의입니다.',
    },
    {
      key: 'consent.thirdParty',
      label: '개인정보 제3자 제공 동의',
      type: 'consent',
      step: 'consent',
      order: 2,
      ownership: 'member',
      required: true,
      readonly: false,
      hint: '소속 지부·분회 및 약사공론 배송을 위한 제공 동의입니다.',
    },

    // ══════════════ STEP 02 인적사항 (18) ══════════════
    {
      key: 'report.year',
      label: '신고년도',
      type: 'readonly_display',
      step: 'personal',
      order: 1,
      ownership: 'auto',
      required: true,
      readonly: true,
      source: { entity: 'annual_report_templates', column: 'year' },
    },
    {
      key: 'personal.name',
      label: '성명',
      type: 'text',
      step: 'personal',
      order: 2,
      ownership: 'auto',
      required: true,
      readonly: false,
      source: { entity: 'users', column: 'name' },
    },
    {
      key: 'personal.gender',
      label: '성별',
      type: 'radio',
      step: 'personal',
      order: 3,
      ownership: 'member',
      required: true,
      readonly: false,
      options: [
        { value: 'male', label: '남' },
        { value: 'female', label: '여' },
      ],
    },
    {
      key: 'personal.birthDate',
      label: '생년월일',
      type: 'date',
      step: 'personal',
      order: 4,
      ownership: 'member',
      required: true,
      readonly: false,
    },
    {
      key: 'personal.licenseNumber',
      label: '면허번호',
      type: 'license',
      step: 'personal',
      order: 5,
      ownership: 'auto',
      required: true,
      readonly: false,
      source: { entity: 'kpa_members', column: 'license_number' },
      syncToMembership: true,
      syncTarget: 'kpa_members.license_number',
    },
    {
      key: 'personal.licenseYear',
      label: '면허 취득년도',
      type: 'number',
      step: 'personal',
      order: 6,
      ownership: 'member',
      required: true,
      readonly: false,
      validation: { min: 1950, max: 2100, message: '취득년도를 확인해 주세요.' },
    },
    {
      key: 'personal.phone',
      label: '일반전화',
      type: 'tel',
      step: 'personal',
      order: 7,
      ownership: 'member',
      required: false,
      readonly: false,
    },
    {
      key: 'personal.mobile',
      label: '휴대전화',
      type: 'tel',
      step: 'personal',
      order: 8,
      ownership: 'member',
      required: true,
      readonly: false,
      hint: '면허신고서 안내문 등 중요 안내가 발송됩니다.',
    },
    {
      key: 'personal.postalCode',
      label: '거주지 우편번호',
      type: 'text',
      step: 'personal',
      order: 9,
      ownership: 'member',
      required: true,
      readonly: false,
      validation: { pattern: '^[0-9]{5}$', message: '우편번호 5자리를 입력해 주세요.' },
    },
    {
      key: 'personal.roadAddress',
      label: '거주지 도로명 주소',
      type: 'address',
      step: 'personal',
      order: 10,
      ownership: 'member',
      required: true,
      readonly: false,
    },
    {
      key: 'personal.detailAddress',
      label: '거주지 상세주소',
      type: 'text',
      step: 'personal',
      order: 11,
      ownership: 'member',
      required: false,
      readonly: false,
    },
    {
      key: 'personal.email',
      label: 'Email',
      type: 'email',
      step: 'personal',
      order: 12,
      ownership: 'auto',
      required: true,
      readonly: false,
      source: { entity: 'users', column: 'email' },
    },
    {
      key: 'personal.branch',
      label: '소속 지부',
      type: 'readonly_display',
      step: 'personal',
      order: 13,
      ownership: 'association',
      required: true,
      readonly: true,
      source: {
        entity: 'branch_memberships',
        column: 'organization_id',
        resolve: 'kpa_organizations.parent_id',
      },
      hint: '분회 소속 원장에서 자동 결정됩니다. 변경은 전입·전출 절차로만 가능합니다.',
    },
    {
      key: 'personal.division',
      label: '소속 분회',
      type: 'readonly_display',
      step: 'personal',
      order: 14,
      ownership: 'association',
      required: true,
      readonly: true,
      source: { entity: 'branch_memberships', column: 'organization_id' },
      hint: '분회 소속 원장에서 자동 결정됩니다. 변경은 전입·전출 절차로만 가능합니다.',
    },
    {
      key: 'personal.hasKoreanMedicineLicense',
      label: '한약조제자격',
      type: 'radio',
      step: 'personal',
      order: 15,
      ownership: 'member',
      required: true,
      readonly: false,
      options: [
        { value: true, label: '유' },
        { value: false, label: '무' },
      ],
    },
    {
      key: 'personal.university',
      label: '출신 대학교',
      type: 'text',
      step: 'personal',
      order: 16,
      ownership: 'member',
      required: false,
      readonly: false,
      group: '학력',
    },
    {
      key: 'personal.graduationYear',
      label: '졸업년도',
      type: 'number',
      step: 'personal',
      order: 17,
      ownership: 'member',
      required: false,
      readonly: false,
      group: '학력',
      validation: { min: 1950, max: 2100 },
    },
    {
      key: 'personal.highestDegree',
      label: '최종학위',
      type: 'select',
      step: 'personal',
      order: 18,
      ownership: 'member',
      required: false,
      readonly: false,
      group: '학력',
      options: [
        { value: 'bachelor', label: '학사' },
        { value: 'master', label: '석사' },
        { value: 'doctor', label: '박사' },
      ],
    },

    // ══════════════ STEP 03 취업현황 (19) ══════════════
    {
      key: 'employment.activityType',
      label: '활동유형',
      type: 'select',
      step: 'employment',
      order: 1,
      ownership: 'auto',
      required: true,
      readonly: false,
      options: ACTIVITY_TYPE_OPTIONS,
      source: { entity: 'kpa_members', column: 'activity_type' },
      syncToMembership: true,
      syncTarget: 'kpa_members.activity_type',
    },

    // ── 업종별 세부역할 (조건부) ──
    {
      key: 'employment.hospitalType',
      label: '의료기관 종별',
      type: 'radio',
      step: 'employment',
      order: 2,
      group: '의료기관',
      ownership: 'member',
      required: true,
      readonly: false,
      options: HOSPITAL_TYPE_OPTIONS,
      visibleWhen: { rule: 'R3' },
    },
    {
      key: 'employment.hospitalTask',
      label: '업무 구분',
      type: 'radio',
      step: 'employment',
      order: 3,
      group: '의료기관',
      ownership: 'member',
      required: true,
      readonly: false,
      options: [
        { value: 'dispensing', label: '조제업무' },
        { value: 'non_dispensing', label: '비조제업무' },
      ],
      visibleWhen: { rule: 'R3' },
      hint: '의료기관 공통 항목입니다.',
    },
    {
      key: 'employment.manufacturerRole',
      label: '제조회사 역할',
      type: 'radio',
      step: 'employment',
      order: 4,
      group: '업종별 세부역할',
      ownership: 'member',
      required: true,
      readonly: false,
      options: MANUFACTURER_ROLE_OPTIONS,
      visibleWhen: { rule: 'R4A' },
    },
    {
      key: 'employment.importerRole',
      label: '수입회사 역할',
      type: 'radio',
      step: 'employment',
      order: 5,
      group: '업종별 세부역할',
      ownership: 'member',
      required: true,
      readonly: false,
      options: IMPORTER_ROLE_OPTIONS,
      visibleWhen: { rule: 'R4B' },
    },
    {
      key: 'employment.wholesalerRole',
      label: '도매회사 역할',
      type: 'radio',
      step: 'employment',
      order: 6,
      group: '업종별 세부역할',
      ownership: 'member',
      required: true,
      readonly: false,
      options: WHOLESALER_ROLE_OPTIONS,
      visibleWhen: { rule: 'R4C' },
    },
    {
      key: 'employment.otherDescription',
      label: '기타 — 직접입력',
      type: 'text',
      step: 'employment',
      order: 7,
      ownership: 'member',
      required: true,
      readonly: false,
      visibleWhen: { rule: 'R5' },
      validation: { maxLength: 200 },
    },

    // ── 근무처 정보 (활동회원) ──
    {
      key: 'employment.workplaceName',
      label: '근무처 명칭',
      type: 'text',
      step: 'employment',
      order: 8,
      group: '근무처',
      ownership: 'auto',
      required: true,
      readonly: false,
      visibleWhen: { rule: 'R8' },
      source: { entity: 'kpa_members', column: 'pharmacy_name' },
      syncToMembership: true,
      syncTarget: 'kpa_members.pharmacy_name',
    },
    {
      key: 'employment.workplacePostalCode',
      label: '근무처 우편번호',
      type: 'text',
      step: 'employment',
      order: 9,
      group: '근무처',
      ownership: 'member',
      required: false,
      readonly: false,
      visibleWhen: { rule: 'R8' },
      validation: { pattern: '^[0-9]{5}$', message: '우편번호 5자리를 입력해 주세요.' },
    },
    {
      key: 'employment.workplaceRoadAddress',
      label: '근무처 도로명 주소',
      type: 'address',
      step: 'employment',
      order: 10,
      group: '근무처',
      ownership: 'auto',
      required: true,
      readonly: false,
      visibleWhen: { rule: 'R8' },
      source: { entity: 'kpa_members', column: 'pharmacy_address' },
      syncToMembership: true,
      syncTarget: 'kpa_members.pharmacy_address',
    },
    {
      key: 'employment.workplaceDetailAddress',
      label: '근무처 상세주소',
      type: 'text',
      step: 'employment',
      order: 11,
      group: '근무처',
      ownership: 'member',
      required: false,
      readonly: false,
      visibleWhen: { rule: 'R8' },
    },
    {
      key: 'employment.workplacePhone',
      label: '근무처 전화번호',
      type: 'tel',
      step: 'employment',
      order: 12,
      group: '근무처',
      ownership: 'member',
      required: false,
      readonly: false,
      visibleWhen: { rule: 'R8' },
    },

    // ── 약국 현황 (개설약사에 한함) ──
    {
      key: 'pharmacy.businessNumber',
      label: '사업자번호',
      type: 'text',
      step: 'employment',
      order: 13,
      group: '약국 현황',
      ownership: 'member',
      required: true,
      readonly: false,
      visibleWhen: { rule: 'R1' },
      validation: { pattern: '^[0-9]{10}$', message: '사업자번호 10자리를 숫자만 입력해 주세요.' },
    },
    {
      key: 'pharmacy.medicalInstitutionCode',
      label: '요양기관기호',
      type: 'text',
      step: 'employment',
      order: 14,
      group: '약국 현황',
      ownership: 'member',
      required: true,
      readonly: false,
      visibleWhen: { rule: 'R1' },
    },
    {
      key: 'pharmacy.handlesKoreanMedicine',
      label: '한약(첩약) 취급',
      type: 'radio',
      step: 'employment',
      order: 15,
      group: '약국 현황',
      ownership: 'member',
      required: true,
      readonly: false,
      options: PHARMACY_HANDLE_OPTIONS,
      visibleWhen: { rule: 'R1' },
    },
    {
      key: 'pharmacy.handlesAnimalMedicine',
      label: '동물약품 취급',
      type: 'radio',
      step: 'employment',
      order: 16,
      group: '약국 현황',
      ownership: 'member',
      required: true,
      readonly: false,
      options: PHARMACY_HANDLE_OPTIONS,
      visibleWhen: { rule: 'R1' },
    },
    {
      key: 'pharmacy.separationArea',
      label: '의약분업 지역구분',
      type: 'radio',
      step: 'employment',
      order: 17,
      group: '약국 현황',
      ownership: 'member',
      required: true,
      readonly: false,
      options: [
        { value: 'separated', label: '분업지역' },
        { value: 'exception', label: '분업예외지역' },
      ],
      visibleWhen: { rule: 'R1' },
    },

    // ── 미활동 ──
    {
      key: 'inactive.reasons',
      label: '미활동 사유',
      type: 'multiselect',
      step: 'employment',
      order: 18,
      group: '미활동',
      ownership: 'member',
      required: true,
      readonly: false,
      options: INACTIVE_REASON_OPTIONS,
      visibleWhen: { rule: 'R2' },
      hint: '해당하는 사유를 모두 선택해 주세요.',
    },
    {
      key: 'inactive.note',
      label: '미활동 부가 설명',
      type: 'textarea',
      step: 'employment',
      order: 19,
      group: '미활동',
      ownership: 'member',
      required: false,
      readonly: false,
      visibleWhen: { rule: 'R2' },
      validation: { maxLength: 500 },
    },

    // ══════════════ STEP 04 기타사항 (12) ══════════════
    {
      key: 'training.creditYear',
      label: '연수교육 이수 연도',
      type: 'readonly_display',
      step: 'etc',
      order: 1,
      group: '연수교육',
      ownership: 'association',
      required: false,
      readonly: true,
      hint: '약사회에서 관리하는 값입니다.',
    },
    {
      key: 'training.requiredCredits',
      label: '이수의무 평점',
      type: 'readonly_display',
      step: 'etc',
      order: 2,
      group: '연수교육',
      ownership: 'association',
      required: false,
      readonly: true,
      hint: '약사회에서 관리하는 값입니다.',
    },
    {
      key: 'training.completedCredits',
      label: '이수 평점',
      type: 'readonly_display',
      step: 'etc',
      order: 3,
      group: '연수교육',
      ownership: 'association',
      required: false,
      readonly: true,
      hint: '약사회에서 관리하는 값입니다.',
    },
    {
      key: 'training.exemptionCertificate',
      label: '연수교육 면제·유예 확인서',
      type: 'file',
      step: 'etc',
      order: 4,
      group: '연수교육',
      ownership: 'member',
      required: false,
      readonly: false,
      hint: '면제·유예 확인서가 있는 경우 첨부해 주세요.',
    },
    {
      key: 'fee.category',
      label: '회비구분',
      type: 'readonly_display',
      step: 'etc',
      order: 5,
      group: '회비',
      ownership: 'association',
      required: false,
      readonly: true,
      options: [
        { value: 'A', label: '갑' },
        { value: 'B', label: '을' },
        { value: 'C', label: '병' },
        { value: 'D', label: '정' },
      ],
      hint: '약사회에서 관리하는 값입니다.',
    },
    {
      key: 'fee.exemptionType',
      label: '회비 면제 구분',
      type: 'readonly_display',
      step: 'etc',
      order: 6,
      group: '회비',
      ownership: 'association',
      required: false,
      readonly: true,
      options: [
        { value: 'unemployed', label: '미취업자' },
        { value: 'exempted', label: '회비면제자' },
      ],
      hint: '약사회에서 관리하는 값입니다. 회비구분 «정» 에 한합니다.',
    },
    {
      key: 'mailing.newsletter',
      label: '약사공론 수신처',
      type: 'radio',
      step: 'etc',
      order: 7,
      group: '우편물 수신처',
      ownership: 'member',
      required: true,
      readonly: false,
      options: MAILING_OPTIONS,
    },
    {
      key: 'mailing.newsletterRefuseReason',
      label: '약사공론 수취거부 사유',
      type: 'text',
      step: 'etc',
      order: 8,
      group: '우편물 수신처',
      ownership: 'member',
      required: false,
      readonly: false,
      visibleWhen: { rule: 'R6A' },
      validation: { maxLength: 200 },
    },
    {
      key: 'mailing.otherMail',
      label: '기타 우편물 수신처',
      type: 'radio',
      step: 'etc',
      order: 9,
      group: '우편물 수신처',
      ownership: 'member',
      required: true,
      readonly: false,
      options: MAILING_OPTIONS,
      hint: '면허신고서 안내문·선거 등 중요 우편물이 배송됩니다.',
    },
    {
      key: 'mailing.otherMailRefuseReason',
      label: '기타 우편물 수취거부 사유',
      type: 'text',
      step: 'etc',
      order: 10,
      group: '우편물 수신처',
      ownership: 'member',
      required: false,
      readonly: false,
      visibleWhen: { rule: 'R6B' },
      validation: { maxLength: 200 },
    },
    {
      key: 'submission.signature',
      label: '약사 서명',
      type: 'signature',
      step: 'etc',
      order: 11,
      group: '신고 확인',
      ownership: 'member',
      required: true,
      readonly: false,
      hint: '「약사법」 제7조 및 제11조, 본회 「정관」 제7조의 규정에 의하여 약사 신고서를 제출합니다.',
    },
    {
      key: 'submission.declaredAt',
      label: '제출일',
      type: 'date',
      step: 'etc',
      order: 12,
      group: '신고 확인',
      ownership: 'auto',
      required: true,
      readonly: true,
      // '$system' = 회원정보 테이블이 아니라 서버가 제출 시점에 생성하는 값.
      // ownership='auto' 는 반드시 출처를 명시한다(정적 검증 불변식).
      source: { entity: '$system', column: 'submittedAt' },
      hint: '제출 시점에 서버가 기록합니다.',
    },
  ],

  rules: [
    {
      id: 'R1',
      kind: 'visible',
      description: '개설약사인 경우에만 약국 현황을 입력한다.',
      when: { field: 'employment.activityType', op: 'eq', value: 'pharmacy_owner' },
      targets: [
        'pharmacy.businessNumber',
        'pharmacy.medicalInstitutionCode',
        'pharmacy.handlesKoreanMedicine',
        'pharmacy.handlesAnimalMedicine',
        'pharmacy.separationArea',
      ],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R2',
      kind: 'visible',
      description: '미활동인 경우에만 미활동 사유를 입력한다.',
      when: { field: 'employment.activityType', op: 'eq', value: 'inactive' },
      targets: ['inactive.reasons', 'inactive.note'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R3',
      kind: 'visible',
      description: '의료기관인 경우 종별과 조제/비조제를 입력한다. 조제/비조제는 의료기관 공통 항목이다.',
      when: { field: 'employment.activityType', op: 'eq', value: 'hospital' },
      targets: ['employment.hospitalType', 'employment.hospitalTask'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R4A',
      kind: 'visible',
      description: '의약품·의약외품 제조회사인 경우 제조회사 역할을 입력한다.',
      when: { field: 'employment.activityType', op: 'eq', value: 'manufacturer' },
      targets: ['employment.manufacturerRole'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R4B',
      kind: 'visible',
      description: '의약품 수입회사인 경우 수입회사 역할을 입력한다.',
      when: { field: 'employment.activityType', op: 'eq', value: 'importer' },
      targets: ['employment.importerRole'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R4C',
      kind: 'visible',
      description: '의약품 도매회사인 경우 도매회사 역할을 입력한다.',
      when: { field: 'employment.activityType', op: 'eq', value: 'wholesaler' },
      targets: ['employment.wholesalerRole'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R5',
      kind: 'visible',
      description: '기타를 선택한 경우 근무처 성격을 직접 입력한다.',
      when: { field: 'employment.activityType', op: 'eq', value: 'other' },
      targets: ['employment.otherDescription'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R6A',
      kind: 'visible',
      description: '약사공론 수취거부 시 사유를 입력한다.',
      when: { field: 'mailing.newsletter', op: 'eq', value: 'refuse' },
      targets: ['mailing.newsletterRefuseReason'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R6B',
      kind: 'visible',
      description: '기타 우편물 수취거부 시 사유를 입력한다.',
      when: { field: 'mailing.otherMail', op: 'eq', value: 'refuse' },
      targets: ['mailing.otherMailRefuseReason'],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R8',
      kind: 'visible',
      description: '미활동이 아닌 경우에만 근무처 정보를 입력한다. 미활동 선택 시 일반 근무처 입력은 숨긴다.',
      when: { field: 'employment.activityType', op: 'neq', value: 'inactive' },
      targets: [
        'employment.workplaceName',
        'employment.workplacePostalCode',
        'employment.workplaceRoadAddress',
        'employment.workplaceDetailAddress',
        'employment.workplacePhone',
      ],
      releaseRequiredWhenHidden: true,
    },
    {
      id: 'R9',
      kind: 'notice',
      description:
        '2018~2025년도 회원신고 이력이 전무하면 대한약사회 온라인 신고가 불가하여 소속 지부 또는 분회를 통한 서면신고가 필요하다 (대약 제2025-1252호).',
      // '$system.' 접두어는 양식 필드가 아니라 서버가 계산해 주입하는 입력임을 뜻한다.
      when: { field: '$system.hasPriorReport2018to2025', op: 'eq', value: false },
      targets: [],
    },
  ],
};

export class SeedKpaBranchAnnualReportTemplate202620270308000000 implements MigrationInterface {
  name = 'SeedKpaBranchAnnualReportTemplate202620270308000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO "annual_report_templates"
        ("service_key", "year", "version", "title", "status", "period_start", "period_end", "schema")
      VALUES ($1, $2, $3, $4, 'active', $5, $6, $7::jsonb)
      ON CONFLICT ("service_key", "year", "version") DO UPDATE SET
        "title"        = EXCLUDED."title",
        "status"       = EXCLUDED."status",
        "period_start" = EXCLUDED."period_start",
        "period_end"   = EXCLUDED."period_end",
        "schema"       = EXCLUDED."schema",
        "updated_at"   = now()
    `,
      [
        SERVICE_KEY,
        YEAR,
        VERSION,
        `${YEAR}년도 약사 회원 신고서`,
        `${YEAR}-01-01`,
        `${YEAR}-02-28`,
        JSON.stringify(TEMPLATE_SCHEMA),
      ],
    );

    const [row] = await queryRunner.query(
      `SELECT jsonb_array_length("schema"->'fields') AS field_count
         FROM "annual_report_templates"
        WHERE "service_key" = $1 AND "year" = $2 AND "version" = $3`,
      [SERVICE_KEY, YEAR, VERSION],
    );
    console.log(
      `[SeedKpaBranchAnnualReportTemplate2026] ${SERVICE_KEY}/${YEAR} v${VERSION} active — fields=${row?.field_count}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "annual_report_templates"
        WHERE "service_key" = $1 AND "year" = $2 AND "version" = $3`,
      [SERVICE_KEY, YEAR, VERSION],
    );
  }
}
