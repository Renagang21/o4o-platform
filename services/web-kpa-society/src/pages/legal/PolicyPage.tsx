/**
 * PolicyPage - 이용약관 페이지
 *
 * KPA Society 서비스 이용약관
 * WO-KPA-LEGAL-PAGES-V1
 *
 * 운영자 대시보드(/operator/legal)에서 편집 가능
 * TODO: API 연동 후 DB에서 콘텐츠 로드
 */

import { useState, useEffect } from 'react';
import { colors, spacing, typography } from '../../styles/theme';

const STORAGE_KEY = 'kpa_legal_policy';

export function PolicyPage() {
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
          <h1 style={styles.title}>이용약관</h1>
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
        <h1 style={styles.title}>이용약관</h1>
        <p style={styles.updated}>최종 수정일: 2026년 2월 1일</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제1조 (목적)</h2>
          <p style={styles.paragraph}>
            이 약관은 O4O Platform(이하 "회사")이 운영하는 서비스(이하 "서비스")의 이용조건 및 절차,
            회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제2조 (용어의 정의)</h2>
          <ol style={styles.orderedList}>
            <li>"서비스"란 회사가 제공하는 KPA Society, 네처, 글라이코팜, 글루코스뷰, K-Cosmetics 등 모든 온라인 서비스를 말합니다.</li>
            <li>"회원"이란 서비스에 접속하여 이 약관에 동의하고 회원가입을 완료한 자를 말합니다.</li>
            <li>"아이디(ID)"란 회원의 식별과 서비스 이용을 위해 회원이 설정하고 회사가 승인하는 이메일 주소를 말합니다.</li>
            <li>"비밀번호"란 회원이 부여받은 아이디와 일치되는 회원임을 확인하고 회원의 비밀보호를 위해 회원 자신이 설정한 문자 또는 숫자의 조합을 말합니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제3조 (약관의 효력 및 변경)</h2>
          <ol style={styles.orderedList}>
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을 발생합니다.</li>
            <li>회사는 필요하다고 인정되는 경우 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
            <li>변경된 약관은 적용일자 7일 이전부터 공지사항을 통해 공지됩니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제4조 (회원가입)</h2>
          <ol style={styles.orderedList}>
            <li>회원가입은 이용자가 약관의 내용에 동의하고, 회원가입 양식에 따라 회원정보를 기입하여 신청합니다.</li>
            <li>회사는 다음 각 호에 해당하는 신청에 대해서는 승인을 거부할 수 있습니다.
              <ul style={styles.unorderedList}>
                <li>타인의 명의를 사용하여 신청한 경우</li>
                <li>허위 정보를 기재하여 신청한 경우</li>
                <li>기타 서비스 운영에 지장을 초래할 우려가 있는 경우</li>
              </ul>
            </li>
            <li>KPA Society 서비스의 경우, 약사면허 확인 후 운영자 승인이 완료되어야 서비스 이용이 가능합니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제5조 (회원의 의무)</h2>
          <ol style={styles.orderedList}>
            <li>회원은 서비스 이용 시 다음 각 호의 행위를 하여서는 안 됩니다.
              <ul style={styles.unorderedList}>
                <li>타인의 정보를 도용하는 행위</li>
                <li>회사의 저작권 등 지적재산권을 침해하는 행위</li>
                <li>회사 및 타인의 명예를 훼손하거나 업무를 방해하는 행위</li>
                <li>외설적인 정보나 불법 정보를 게시하는 행위</li>
                <li>기타 법령에 위반되는 행위</li>
              </ul>
            </li>
            <li>회원은 자신의 아이디와 비밀번호를 안전하게 관리할 책임이 있습니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제6조 (서비스의 제공 및 변경)</h2>
          <ol style={styles.orderedList}>
            <li>회사는 회원에게 다음과 같은 서비스를 제공합니다.
              <ul style={styles.unorderedList}>
                <li>커뮤니티 및 게시판 서비스</li>
                <li>교육 및 학습 관리 서비스</li>
                <li>이벤트 및 설문 참여 서비스</li>
                <li>자료실 및 콘텐츠 제공 서비스</li>
                <li>기타 회사가 정하는 서비스</li>
              </ul>
            </li>
            <li>회사는 서비스의 내용을 변경할 수 있으며, 변경 시 사전에 공지합니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제7조 (서비스 이용의 제한 및 중지)</h2>
          <ol style={styles.orderedList}>
            <li>회사는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중지할 수 있습니다.
              <ul style={styles.unorderedList}>
                <li>서비스용 설비의 보수 등 공사로 인한 부득이한 경우</li>
                <li>천재지변 또는 이에 준하는 국가비상사태가 발생한 경우</li>
                <li>기타 불가항력적인 사유가 있는 경우</li>
              </ul>
            </li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제8조 (회원 탈퇴 및 자격 상실)</h2>
          <ol style={styles.orderedList}>
            <li>회원은 언제든지 서비스 내 탈퇴 기능을 통해 탈퇴를 요청할 수 있습니다.</li>
            <li>회사는 회원이 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 회원 자격을 제한하거나 상실시킬 수 있습니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제9조 (손해배상)</h2>
          <p style={styles.paragraph}>
            회원이 이 약관의 규정을 위반하여 회사에 손해가 발생한 경우, 회원은 회사의 손해를 배상하여야 합니다.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>제10조 (분쟁 해결)</h2>
          <ol style={styles.orderedList}>
            <li>회사와 회원 간에 발생한 분쟁에 대해서는 상호 협의를 통해 해결합니다.</li>
            <li>협의가 이루어지지 않을 경우, 관할 법원은 회사 소재지를 관할하는 법원으로 합니다.</li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>부칙</h2>
          <p style={styles.paragraph}>
            이 약관은 2026년 2월 1일부터 시행됩니다.
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
