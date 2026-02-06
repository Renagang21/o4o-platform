/**
 * PrivacyPage - 개인정보처리방침 페이지
 *
 * KPA Society 서비스 개인정보처리방침
 * WO-KPA-LEGAL-PAGES-V1
 *
 * 운영자 대시보드(/operator/legal)에서 편집 가능
 * TODO: API 연동 후 DB에서 콘텐츠 로드
 */

import { useState, useEffect } from 'react';
import { colors, spacing, typography } from '../../styles/theme';

const STORAGE_KEY = 'kpa_legal_privacy';

export function PrivacyPage() {
  const [customContent, setCustomContent] = useState<string | null>(null);

  useEffect(() => {
    // 운영자가 저장한 커스텀 콘텐츠 확인
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCustomContent(saved);
    }
  }, []);

  // 커스텀 콘텐츠가 있으면 마크다운으로 표시
  if (customContent) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <h1 style={styles.title}>개인정보처리방침</h1>
          <p style={styles.updated}>최종 수정일: 2026년 2월 1일</p>
          <div style={styles.markdownContent}>
            {customContent.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <h1 key={index} style={styles.mdH1}>{line.slice(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={index} style={styles.mdH2}>{line.slice(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={index} style={styles.mdH3}>{line.slice(4)}</h3>;
              }
              if (line.startsWith('- ')) {
                return <li key={index} style={styles.mdLi}>{line.slice(2)}</li>;
              }
              if (line.match(/^\d+\. /)) {
                return <li key={index} style={styles.mdLi}>{line.replace(/^\d+\. /, '')}</li>;
              }
              if (line.trim() === '') {
                return <br key={index} />;
              }
              return <p key={index} style={styles.mdP}>{line}</p>;
            })}
          </div>
        </div>
      </div>
    );
  }

  // 기본 콘텐츠
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>개인정보처리방침</h1>
        <p style={styles.updated}>최종 수정일: 2026년 2월 1일</p>

        <section style={styles.section}>
          <p style={styles.paragraph}>
            O4O Platform(이하 "회사")은 「개인정보 보호법」에 따라 이용자의 개인정보 보호 및 권익을 보호하고
            개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제1조 (수집하는 개인정보 항목)</h2>
          <p style={styles.paragraph}>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>필수 항목</h4>
            <ul style={styles.unorderedList}>
              <li>이메일 주소</li>
              <li>비밀번호</li>
              <li>성명</li>
              <li>연락처 (휴대폰 번호)</li>
            </ul>
          </div>
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>서비스별 추가 항목</h4>
            <ul style={styles.unorderedList}>
              <li>KPA Society: 약사면허번호, 소속 분회, 약국명</li>
              <li>글라이코팜/글루코스뷰: 약사면허번호</li>
              <li>네처/K-Cosmetics: 사업자등록번호 (사업자 회원의 경우)</li>
            </ul>
          </div>
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>자동 수집 항목</h4>
            <ul style={styles.unorderedList}>
              <li>IP 주소, 서비스 이용 기록, 접속 로그</li>
              <li>쿠키, 접속 기기 정보</li>
            </ul>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제2조 (개인정보의 수집 및 이용 목적)</h2>
          <ol style={styles.orderedList}>
            <li><strong>회원 관리:</strong> 회원제 서비스 이용에 따른 본인확인, 개인식별, 가입의사 확인, 연령확인, 불량회원의 부정 이용 방지</li>
            <li><strong>서비스 제공:</strong> 교육 콘텐츠 제공, 커뮤니티 서비스 제공, 이벤트 참여, 맞춤 서비스 제공</li>
            <li><strong>마케팅 및 광고:</strong> 신규 서비스 안내, 이벤트 정보 제공 (동의 시)</li>
            <li><strong>서비스 개선:</strong> 서비스 이용 통계 분석, 서비스 품질 향상</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제3조 (개인정보의 보유 및 이용 기간)</h2>
          <p style={styles.paragraph}>
            회사는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
            단, 다음의 정보에 대해서는 관계법령에 의해 보존할 필요가 있는 경우 일정 기간 보관합니다.
          </p>
          <div style={styles.infoBox}>
            <ul style={styles.unorderedList}>
              <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래법)</li>
              <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래법)</li>
              <li><strong>소비자 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래법)</li>
              <li><strong>웹사이트 방문 기록:</strong> 3개월 (통신비밀보호법)</li>
            </ul>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제4조 (개인정보의 제3자 제공)</h2>
          <p style={styles.paragraph}>
            회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
            다만, 다음의 경우에는 예외로 합니다.
          </p>
          <ol style={styles.orderedList}>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제5조 (개인정보 처리의 위탁)</h2>
          <p style={styles.paragraph}>
            회사는 서비스 향상을 위해 아래와 같이 개인정보 처리 업무를 외부에 위탁하고 있습니다.
          </p>
          <div style={styles.infoBox}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>수탁업체</th>
                  <th style={styles.tableHeader}>위탁업무 내용</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.tableCell}>Google Cloud Platform</td>
                  <td style={styles.tableCell}>데이터 저장 및 호스팅</td>
                </tr>
                <tr>
                  <td style={styles.tableCell}>이메일 발송 서비스 제공업체</td>
                  <td style={styles.tableCell}>이메일 발송</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제6조 (이용자의 권리와 행사 방법)</h2>
          <ol style={styles.orderedList}>
            <li>이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있습니다.</li>
            <li>이용자는 언제든지 개인정보 처리 동의를 철회할 수 있으며, 이 경우 회원 탈퇴를 통해 처리됩니다.</li>
            <li>이용자는 개인정보의 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.</li>
            <li>위 요청은 서비스 내 설정 메뉴 또는 개인정보 보호책임자에게 연락하여 처리할 수 있습니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제7조 (개인정보의 파기)</h2>
          <ol style={styles.orderedList}>
            <li>회사는 개인정보 보유기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</li>
            <li>전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
            <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제8조 (개인정보의 안전성 확보 조치)</h2>
          <p style={styles.paragraph}>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ol style={styles.orderedList}>
            <li><strong>관리적 조치:</strong> 내부관리계획 수립 및 시행, 정기적인 직원 교육</li>
            <li><strong>기술적 조치:</strong> 개인정보처리시스템 접근 권한 관리, 암호화 기술 적용, 보안 프로그램 설치</li>
            <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근 통제</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제9조 (쿠키의 사용)</h2>
          <ol style={styles.orderedList}>
            <li>회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 쿠키(cookie)를 사용합니다.</li>
            <li>이용자는 웹브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 일부 서비스 이용에 어려움이 있을 수 있습니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제10조 (개인정보 보호책임자)</h2>
          <p style={styles.paragraph}>
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의
            불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <div style={styles.infoBox}>
            <p style={styles.paragraph}>
              <strong>개인정보 보호책임자</strong><br />
              담당부서: 정보보호팀<br />
              이메일: privacy@o4o.kr
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제11조 (권익침해 구제방법)</h2>
          <p style={styles.paragraph}>
            개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.
          </p>
          <div style={styles.infoBox}>
            <ul style={styles.unorderedList}>
              <li>개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
              <li>대검찰청 사이버수사과 (www.spo.go.kr / 국번없이 1301)</li>
              <li>경찰청 사이버안전국 (cyberbureau.police.go.kr / 국번없이 182)</li>
            </ul>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>부칙</h2>
          <p style={styles.paragraph}>
            이 개인정보처리방침은 2026년 2월 1일부터 시행됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
    padding: `${spacing.xl} ${spacing.lg}`,
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: spacing.xl,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    ...typography.headingL,
    color: colors.neutral900,
    marginBottom: spacing.xs,
  },
  updated: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: '0.938rem',
    lineHeight: 1.7,
    color: colors.neutral700,
  },
  orderedList: {
    paddingLeft: spacing.lg,
    fontSize: '0.938rem',
    lineHeight: 1.8,
    color: colors.neutral700,
  },
  unorderedList: {
    paddingLeft: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    listStyleType: 'disc',
    fontSize: '0.938rem',
    lineHeight: 1.8,
    color: colors.neutral700,
  },
  infoBox: {
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral800,
    marginBottom: spacing.xs,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: colors.neutral100,
    padding: spacing.sm,
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral800,
    border: `1px solid ${colors.neutral200}`,
  },
  tableCell: {
    padding: spacing.sm,
    fontSize: '0.875rem',
    color: colors.neutral700,
    border: `1px solid ${colors.neutral200}`,
  },
  // 마크다운 스타일
  markdownContent: {
    fontSize: '0.938rem',
    lineHeight: 1.8,
    color: colors.neutral700,
  },
  mdH1: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  mdH2: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  mdH3: {
    ...typography.headingS,
    color: colors.neutral800,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  mdP: {
    marginBottom: spacing.sm,
  },
  mdLi: {
    marginLeft: spacing.lg,
    marginBottom: spacing.xs,
    listStyleType: 'disc',
  },
};
