/**
 * AnnualReportFormPage - 약사 회원 신고서 (디지털 양식)
 *
 * WO-KPA-ANNUAL-REPORT-FORM-V1
 * 대한약사회 공식 신고서 양식 기반 디지털화
 * - 인적사항
 * - 취업현황
 * - 약국 현황 (개설약사)
 * - 미활동 사유
 * - 연수교육 현황
 * - 개인정보 동의
 * - 우편물 수신처
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

/**
 * 현재 URL 경로에서 서비스 컨텍스트 prefix를 추출
 * - /branch-services/:branchId/* → '/branch-services/:branchId' (Service C)
 * - 기타 → '' (빈 문자열, 커뮤니티)
 */
function getServicePrefix(pathname: string): string {
  // 분회 서비스 컨텍스트 (Service C): /branch-services/:branchId/*
  const branchServicesMatch = pathname.match(/^(\/branch-services\/[^/]+)/);
  if (branchServicesMatch) return branchServicesMatch[1];

  // 메인 커뮤니티 컨텍스트
  return '';
}

// 취업 활동 유형
type ActivityType =
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

// 미활동 사유
type InactiveReason =
  | 'closed_business'     // 휴·폐업
  | 'job_seeking'         // 취업준비
  | 'overseas'            // 해외체류
  | 'leave'               // 휴직
  | 'parenting'           // 출산·육아
  | 'retired'             // 65세 이상 미취업
  | 'military'            // 군 복무
  | 'overseas_resident'   // 해외거주자
  | 'graduate_student';   // 대학원 재학생

// 신고서 데이터 타입
interface AnnualReportData {
  year: number;
  // 인적사항
  personal: {
    name: string;
    gender: 'male' | 'female';
    birthDate: string;
    licenseNumber: string;
    licenseYear: string;
    phone: string;
    mobile: string;
    address: string;
    email: string;
    university: string;
    graduationYear: string;
    branch: string;
    division: string;
    hasKoreanMedicineLicense: boolean;
  };
  // 취업현황
  employment: {
    activityType: ActivityType;
    // 의료기관 상세
    hospitalType?: string;
    hospitalTask?: 'dispensing' | 'non_dispensing';
    // 제조/수입/도매 회사 상세
    companyRole?: 'owner' | 'manager' | 'staff';
    // 근무처 정보
    workplaceName: string;
    workplaceAddress: string;
    workplacePhone: string;
  };
  // 약국 현황 (개설약사)
  pharmacy?: {
    businessNumber: string;
    medicalInstitutionCode: string;
    handlesKoreanMedicine: boolean;
    handlesAnimalMedicine: boolean;
    separationArea: 'separated' | 'exception';
  };
  // 미활동
  inactive?: {
    reasons: InactiveReason[];
  };
  // 개인정보 동의
  privacyConsent: boolean;
  // 우편물 수신처
  mailing: {
    newsletter: 'work' | 'home' | 'refuse';
    newsletterRefuseReason?: string;
    otherMail: 'work' | 'home' | 'refuse';
    otherMailRefuseReason?: string;
  };
}

const currentYear = new Date().getFullYear();

export function AnnualReportFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const servicePrefix = getServicePrefix(location.pathname);
  const { user } = useAuth();

  const [formData, setFormData] = useState<AnnualReportData>({
    year: currentYear,
    personal: {
      name: user?.name || '',
      gender: 'male',
      birthDate: '',
      licenseNumber: '',
      licenseYear: '',
      phone: '',
      mobile: '',
      address: '',
      email: user?.email || '',
      university: '',
      graduationYear: '',
      branch: '청명지부',
      division: '강남분회',
      hasKoreanMedicineLicense: false,
    },
    employment: {
      activityType: 'pharmacy_owner',
      workplaceName: '',
      workplaceAddress: '',
      workplacePhone: '',
    },
    privacyConsent: false,
    mailing: {
      newsletter: 'work',
      otherMail: 'work',
    },
  });

  const updatePersonal = (field: keyof AnnualReportData['personal'], value: unknown) => {
    setFormData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const updateEmployment = (field: keyof AnnualReportData['employment'], value: unknown) => {
    setFormData(prev => ({
      ...prev,
      employment: { ...prev.employment, [field]: value },
    }));
  };

  const updatePharmacy = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      pharmacy: { ...prev.pharmacy, [field]: value } as AnnualReportData['pharmacy'],
    }));
  };

  const updateMailing = (field: keyof AnnualReportData['mailing'], value: unknown) => {
    setFormData(prev => ({
      ...prev,
      mailing: { ...prev.mailing, [field]: value },
    }));
  };

  const handleSubmit = () => {
    if (!formData.privacyConsent) {
      alert('개인정보 수집·이용에 동의해 주세요.');
      return;
    }
    alert(`${formData.year}년도 약사 회원 신고서가 제출되었습니다.`);
    navigate(`${servicePrefix}/mypage`);
  };

  const isPharmacyOwner = formData.employment.activityType === 'pharmacy_owner';
  const isInactive = formData.employment.activityType === 'inactive';

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        {/* 헤더 */}
        <div style={styles.header}>
          <div style={styles.headerNote}>
            *필수입력란이 공란인 경우 전산입력이 되지 않습니다.
          </div>
          <h1 style={styles.title}>{formData.year} 년도 약사 회원 신고서</h1>
        </div>

        {/* 1. 인적사항 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>인적사항</h2>
          <div style={styles.formTable}>
            <div style={styles.formRow}>
              <div style={styles.formCell}>
                <label style={styles.label}>성명 *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.personal.name}
                  onChange={(e) => updatePersonal('name', e.target.value)}
                />
              </div>
              <div style={styles.formCell}>
                <label style={styles.label}>성별 *</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      checked={formData.personal.gender === 'male'}
                      onChange={() => updatePersonal('gender', 'male')}
                    /> 남
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      checked={formData.personal.gender === 'female'}
                      onChange={() => updatePersonal('gender', 'female')}
                    /> 여
                  </label>
                </div>
              </div>
              <div style={styles.formCell}>
                <label style={styles.label}>생년월일 *</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.personal.birthDate}
                  onChange={(e) => updatePersonal('birthDate', e.target.value)}
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formCell}>
                <label style={styles.label}>면허번호 *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.personal.licenseNumber}
                  onChange={(e) => updatePersonal('licenseNumber', e.target.value)}
                  placeholder="예: 12345"
                />
              </div>
              <div style={styles.formCell}>
                <label style={styles.label}>취득년도 *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.personal.licenseYear}
                  onChange={(e) => updatePersonal('licenseYear', e.target.value)}
                  placeholder="예: 2010"
                />
              </div>
              <div style={styles.formCell}>
                <label style={styles.label}>연락처</label>
                <div style={styles.phoneInputs}>
                  <input
                    type="tel"
                    style={{ ...styles.input, flex: 1 }}
                    value={formData.personal.phone}
                    onChange={(e) => updatePersonal('phone', e.target.value)}
                    placeholder="일반전화"
                  />
                  <input
                    type="tel"
                    style={{ ...styles.input, flex: 1 }}
                    value={formData.personal.mobile}
                    onChange={(e) => updatePersonal('mobile', e.target.value)}
                    placeholder="휴대전화 *"
                  />
                </div>
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={{ ...styles.formCell, flex: 2 }}>
                <label style={styles.label}>거주지 주소 (도로명) *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.personal.address}
                  onChange={(e) => updatePersonal('address', e.target.value)}
                  placeholder="도로명 주소를 입력하세요"
                />
              </div>
              <div style={styles.formCell}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  style={styles.input}
                  value={formData.personal.email}
                  onChange={(e) => updatePersonal('email', e.target.value)}
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formCell}>
                <label style={styles.label}>학력</label>
                <div style={styles.educationInputs}>
                  <span>학부</span>
                  <input
                    type="text"
                    style={{ ...styles.input, flex: 1 }}
                    value={formData.personal.university}
                    onChange={(e) => updatePersonal('university', e.target.value)}
                    placeholder="대학교"
                  />
                  <span>(졸업년도</span>
                  <input
                    type="text"
                    style={{ ...styles.input, width: '80px' }}
                    value={formData.personal.graduationYear}
                    onChange={(e) => updatePersonal('graduationYear', e.target.value)}
                    placeholder="년"
                  />
                  <span>)</span>
                </div>
              </div>
              <div style={styles.formCell}>
                <label style={styles.label}>소속지부·분회</label>
                <div style={styles.branchInputs}>
                  <span>지부</span>
                  <input
                    type="text"
                    style={{ ...styles.input, flex: 1 }}
                    value={formData.personal.branch}
                    readOnly
                  />
                  <span>분회</span>
                  <input
                    type="text"
                    style={{ ...styles.input, flex: 1 }}
                    value={formData.personal.division}
                    readOnly
                  />
                </div>
              </div>
              <div style={styles.formCell}>
                <label style={styles.label}>한약조제자격</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="koreanMedicine"
                      checked={formData.personal.hasKoreanMedicineLicense}
                      onChange={() => updatePersonal('hasKoreanMedicineLicense', true)}
                    /> 유
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="koreanMedicine"
                      checked={!formData.personal.hasKoreanMedicineLicense}
                      onChange={() => updatePersonal('hasKoreanMedicineLicense', false)}
                    /> 무
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 취업현황 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>취업현황</h2>

          <div style={styles.subsection}>
            <div style={styles.subsectionTitle}>○ 활동</div>
            <div style={styles.activityGrid}>
              {/* 약국 */}
              <div style={styles.activityGroup}>
                <div style={styles.activityGroupTitle}>약국</div>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'pharmacy_owner'}
                    onChange={() => updateEmployment('activityType', 'pharmacy_owner')}
                  /> 개설약사
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'pharmacy_employee'}
                    onChange={() => updateEmployment('activityType', 'pharmacy_employee')}
                  /> 근무약사
                </label>
              </div>

              {/* 의료기관 */}
              <div style={styles.activityGroup}>
                <div style={styles.activityGroupTitle}>의료기관</div>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'hospital'}
                    onChange={() => updateEmployment('activityType', 'hospital')}
                  /> 종합병원, 병원, 의원, 요양병원, 한방의료기관 등
                </label>
              </div>

              {/* 제조/수입/도매 */}
              <div style={styles.activityGroup}>
                <div style={styles.activityGroupTitle}>근무처 구분</div>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'manufacturer'}
                    onChange={() => updateEmployment('activityType', 'manufacturer')}
                  /> 의약품·의약외품 제조회사
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'importer'}
                    onChange={() => updateEmployment('activityType', 'importer')}
                  /> 의약품 수입회사
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'wholesaler'}
                    onChange={() => updateEmployment('activityType', 'wholesaler')}
                  /> 의약품 도매회사
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'other_industry'}
                    onChange={() => updateEmployment('activityType', 'other_industry')}
                  /> 의약품산업 외 기업체
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'government'}
                    onChange={() => updateEmployment('activityType', 'government')}
                  /> (준)정부·공공기관
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'school'}
                    onChange={() => updateEmployment('activityType', 'school')}
                  /> 학교
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'other'}
                    onChange={() => updateEmployment('activityType', 'other')}
                  /> 기타
                </label>
              </div>

              {/* 미활동 */}
              <div style={styles.activityGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="activity"
                    checked={formData.employment.activityType === 'inactive'}
                    onChange={() => updateEmployment('activityType', 'inactive')}
                  /> <strong>미활동</strong>
                </label>
              </div>
            </div>
          </div>

          {/* 근무처 정보 */}
          {!isInactive && (
            <div style={styles.formTable}>
              <div style={styles.formRow}>
                <div style={styles.formCell}>
                  <label style={styles.label}>근무처 명칭 *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.employment.workplaceName}
                    onChange={(e) => updateEmployment('workplaceName', e.target.value)}
                  />
                </div>
                <div style={{ ...styles.formCell, flex: 2 }}>
                  <label style={styles.label}>근무처 주소 (도로명) *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.employment.workplaceAddress}
                    onChange={(e) => updateEmployment('workplaceAddress', e.target.value)}
                  />
                </div>
                <div style={styles.formCell}>
                  <label style={styles.label}>전화번호</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={formData.employment.workplacePhone}
                    onChange={(e) => updateEmployment('workplacePhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. 약국 현황 (개설약사에 한함) */}
        {isPharmacyOwner && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>※ 약국 현황 (개설약사에 한함)</h2>
            <div style={styles.formTable}>
              <div style={styles.formRow}>
                <div style={styles.formCell}>
                  <label style={styles.label}>사업자번호</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.pharmacy?.businessNumber || ''}
                    onChange={(e) => updatePharmacy('businessNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="0000000000"
                  />
                </div>
                <div style={styles.formCell}>
                  <label style={styles.label}>요양기관기호</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.pharmacy?.medicalInstitutionCode || ''}
                    onChange={(e) => updatePharmacy('medicalInstitutionCode', e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formCell}>
                  <label style={styles.label}>한약(첩약) 취급</label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="koreanMed"
                        checked={formData.pharmacy?.handlesKoreanMedicine === true}
                        onChange={() => updatePharmacy('handlesKoreanMedicine', true)}
                      /> 취급
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="koreanMed"
                        checked={formData.pharmacy?.handlesKoreanMedicine === false}
                        onChange={() => updatePharmacy('handlesKoreanMedicine', false)}
                      /> 취급안함
                    </label>
                  </div>
                </div>
                <div style={styles.formCell}>
                  <label style={styles.label}>동물약품 취급</label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="animalMed"
                        checked={formData.pharmacy?.handlesAnimalMedicine === true}
                        onChange={() => updatePharmacy('handlesAnimalMedicine', true)}
                      /> 취급
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="animalMed"
                        checked={formData.pharmacy?.handlesAnimalMedicine === false}
                        onChange={() => updatePharmacy('handlesAnimalMedicine', false)}
                      /> 취급안함
                    </label>
                  </div>
                </div>
                <div style={styles.formCell}>
                  <label style={styles.label}>의약분업 지역구분</label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="separation"
                        checked={formData.pharmacy?.separationArea === 'separated'}
                        onChange={() => updatePharmacy('separationArea', 'separated')}
                      /> 분업지역
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="separation"
                        checked={formData.pharmacy?.separationArea === 'exception'}
                        onChange={() => updatePharmacy('separationArea', 'exception')}
                      /> 분업예외지역
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. 미활동 */}
        {isInactive && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>○ 미활동</h2>
            <div style={styles.inactiveOptions}>
              <div style={styles.inactiveGroup}>
                <span>□ 6개월 이상 조제업무 미종사:</span>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 휴·폐업</label>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 취업준비</label>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 해외체류</label>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 휴직</label>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 출산·육아</label>
              </div>
              <div style={styles.inactiveGroup}>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 65세 이상 미취업</label>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 군 복무</label>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 해외거주자</label>
                <label style={styles.checkboxLabel}><input type="checkbox" /> 대학원 재학생</label>
              </div>
            </div>
          </div>
        )}

        {/* 5. 연수교육 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>연수교육 <span style={styles.sectionSubtitle}>(약사회에서 작성)</span></h2>
          <div style={styles.readonlyInfo}>
            <div style={styles.trainingInfo}>
              <span>이수상황: 총 (</span>
              <span style={styles.trainingValue}>8</span>
              <span>)평점 이수의무 중 (</span>
              <span style={styles.trainingValue}>6</span>
              <span>) 평점/{currentYear - 1} 년도 이수</span>
            </div>
            <p style={styles.note}>* 연수교육 면제유예 확인서가 있는 경우 제출하여 주시기 바랍니다.</p>
          </div>
        </div>

        {/* 6. 개인정보 동의 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            개인정보의 수집·이용 동의: *
          </h2>
          <div style={styles.consentBox}>
            <label style={styles.consentLabel}>
              <input
                type="radio"
                name="consent"
                checked={formData.privacyConsent}
                onChange={() => setFormData(prev => ({ ...prev, privacyConsent: true }))}
              /> 예
            </label>
            <label style={styles.consentLabel}>
              <input
                type="radio"
                name="consent"
                checked={!formData.privacyConsent}
                onChange={() => setFormData(prev => ({ ...prev, privacyConsent: false }))}
              /> 아니오
            </label>
          </div>
          <p style={styles.note}>* 개인정보의 수집·이용 등의 내용은 후면을 참고하여주시기 바랍니다.</p>
        </div>

        {/* 7. 회비구분 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>회비구분 <span style={styles.sectionSubtitle}>(약사회에서 작성)</span></h2>
          <div style={styles.readonlyInfo}>
            <span>1. 갑 &nbsp;&nbsp; 2. 을 &nbsp;&nbsp; 3. 병 &nbsp;&nbsp; 4. 정(□ 미취업자 □ 회비면제자)</span>
          </div>
        </div>

        {/* 8. 우편물 수신처 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>우편물 수신처</h2>
          <div style={styles.mailingTable}>
            <div style={styles.mailingRow}>
              <div style={styles.mailingLabel}>약사공론</div>
              <div style={styles.mailingOptions}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="newsletter"
                    checked={formData.mailing.newsletter === 'work'}
                    onChange={() => updateMailing('newsletter', 'work')}
                  /> 근무지
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="newsletter"
                    checked={formData.mailing.newsletter === 'home'}
                    onChange={() => updateMailing('newsletter', 'home')}
                  /> 거주지
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="newsletter"
                    checked={formData.mailing.newsletter === 'refuse'}
                    onChange={() => updateMailing('newsletter', 'refuse')}
                  /> 수취거부
                  {formData.mailing.newsletter === 'refuse' && (
                    <input
                      type="text"
                      style={styles.refuseInput}
                      placeholder="사유"
                      value={formData.mailing.newsletterRefuseReason || ''}
                      onChange={(e) => updateMailing('newsletterRefuseReason', e.target.value)}
                    />
                  )}
                </label>
              </div>
            </div>
            <div style={styles.mailingRow}>
              <div style={styles.mailingLabel}>기타 우편물*</div>
              <div style={styles.mailingOptions}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="otherMail"
                    checked={formData.mailing.otherMail === 'work'}
                    onChange={() => updateMailing('otherMail', 'work')}
                  /> 근무지
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="otherMail"
                    checked={formData.mailing.otherMail === 'home'}
                    onChange={() => updateMailing('otherMail', 'home')}
                  /> 거주지
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="otherMail"
                    checked={formData.mailing.otherMail === 'refuse'}
                    onChange={() => updateMailing('otherMail', 'refuse')}
                  /> 수취거부
                  {formData.mailing.otherMail === 'refuse' && (
                    <input
                      type="text"
                      style={styles.refuseInput}
                      placeholder="사유"
                      value={formData.mailing.otherMailRefuseReason || ''}
                      onChange={(e) => updateMailing('otherMailRefuseReason', e.target.value)}
                    />
                  )}
                </label>
              </div>
            </div>
          </div>
          <p style={styles.note}>* 면허신고서 안내문, 선거 등 중요 우편물을 배송하므로 반드시 기재하시기 바랍니다.</p>
        </div>

        {/* 서명 및 제출 */}
        <div style={styles.footer}>
          <div style={styles.legalText}>
            「약사법」 제7조 및 제11조, 본회 「정관」 제7조의 규정에 의하여 약사 신고서를 제출 합니다.
          </div>
          <div style={styles.dateSignature}>
            <span>{currentYear}년 &nbsp;&nbsp;&nbsp;&nbsp; 월 &nbsp;&nbsp;&nbsp;&nbsp; 일</span>
          </div>
          <div style={styles.signature}>
            <span>약사 </span>
            <span style={styles.signatureName}>{formData.personal.name || '___________'}</span>
            <span> (인/서명)</span>
          </div>
          <div style={styles.recipient}>대한약사회장 귀하</div>

          <div style={styles.buttonGroup}>
            <button style={styles.cancelButton} onClick={() => navigate(-1)}>
              취소
            </button>
            <button style={styles.submitButton} onClick={handleSubmit}>
              신고서 제출
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '24px',
  },
  formContainer: {
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '40px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    borderBottom: `2px solid ${colors.neutral900}`,
    paddingBottom: '20px',
  },
  headerNote: {
    fontSize: '12px',
    color: '#DC2626',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  section: {
    marginBottom: '28px',
    paddingBottom: '20px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '16px',
    backgroundColor: colors.neutral100,
    padding: '8px 12px',
    borderLeft: `4px solid ${colors.primary}`,
  },
  sectionSubtitle: {
    fontSize: '12px',
    fontWeight: 400,
    color: colors.neutral500,
  },
  formTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  formCell: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '6px',
  },
  input: {
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '4px',
    fontSize: '14px',
  },
  phoneInputs: {
    display: 'flex',
    gap: '8px',
  },
  educationInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  branchInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    padding: '10px 0',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  subsection: {
    marginBottom: '16px',
  },
  subsectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
    marginBottom: '12px',
  },
  activityGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
  },
  activityGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  activityGroupTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    minWidth: '80px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  inactiveOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
  },
  inactiveGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'center',
    fontSize: '13px',
  },
  readonlyInfo: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
    fontSize: '14px',
  },
  trainingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  trainingValue: {
    fontWeight: 700,
    color: colors.primary,
    padding: '0 4px',
  },
  note: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '8px',
    fontStyle: 'italic',
  },
  consentBox: {
    display: 'flex',
    gap: '24px',
    padding: '12px',
  },
  consentLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 500,
  },
  mailingTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mailingRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
  },
  mailingLabel: {
    width: '100px',
    fontSize: '14px',
    fontWeight: 500,
  },
  mailingOptions: {
    display: 'flex',
    gap: '20px',
    flex: 1,
  },
  refuseInput: {
    marginLeft: '8px',
    padding: '4px 8px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '4px',
    fontSize: '13px',
    width: '150px',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  legalText: {
    fontSize: '13px',
    color: colors.neutral700,
    marginBottom: '24px',
  },
  dateSignature: {
    fontSize: '14px',
    marginBottom: '16px',
  },
  signature: {
    fontSize: '16px',
    marginBottom: '8px',
  },
  signatureName: {
    fontWeight: 700,
    textDecoration: 'underline',
    padding: '0 20px',
  },
  recipient: {
    fontSize: '14px',
    color: colors.neutral600,
    marginBottom: '32px',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '14px 32px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '14px 32px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default AnnualReportFormPage;
